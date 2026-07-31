/**
 * The only place in this repository that talks to Azure OpenAI.
 *
 * Runs at development time, on a developer's machine or in a controlled CI
 * job. It writes JSON to disk. Nothing it produces carries a credential, and
 * nothing in `src/` imports it — the deployed GitHub Pages site is a pile of
 * static files that could not call this service if it wanted to.
 */
import { azureConfig } from './config.mjs';

export class AzureError extends Error {
  constructor(message, { status, retryable, body } = {}) {
    super(message);
    this.name = 'AzureError';
    this.status = status;
    this.retryable = retryable ?? false;
    this.body = body;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * A 429 usually arrives with `retry-after`. Honour it — guessing shorter is
 * how a long run turns into a longer one.
 */
function backoffMs(attempt, retryAfterHeader) {
  const stated = Number(retryAfterHeader);
  if (Number.isFinite(stated) && stated > 0) return Math.min(stated * 1000, 90_000);
  const base = Math.min(2 ** attempt * 1000, 60_000);
  return base + Math.floor(Math.random() * 750); // jitter: a fleet of workers must not resynchronise
}

export function createClient({ maxAttempts = 5, onUsage } = {}) {
  const cfg = azureConfig();
  if (cfg.missing.length) {
    throw new AzureError(
      `Azure OpenAI is not configured. Missing: ${cfg.missing.join(', ')}. ` +
        `Copy .env.example to .env and fill it in, or run with --dry-run / --fixtures.`,
    );
  }

  const url =
    `${cfg.endpoint}/openai/deployments/${encodeURIComponent(cfg.deployment)}` +
    `/chat/completions?api-version=${encodeURIComponent(cfg.apiVersion)}`;

  const usage = { calls: 0, promptTokens: 0, completionTokens: 0 };

  /**
   * @returns {Promise<{ content: string, usage: object, model: string, attempts: number }>}
   */
  async function chat({ system, user, maxTokens = 16000, jsonSchema, temperature }) {
    const body = {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_completion_tokens: maxTokens,
    };
    // Reasoning deployments reject an explicit temperature; only send one when
    // the caller has a reason to.
    if (temperature !== undefined) body.temperature = temperature;
    if (jsonSchema) {
      body.response_format = {
        type: 'json_schema',
        json_schema: { name: 'term_explanation', strict: true, schema: jsonSchema },
      };
    }

    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let res;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'api-key': cfg.apiKey, 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch (cause) {
        lastError = new AzureError(`network error: ${cause.message}`, { retryable: true });
        await sleep(backoffMs(attempt));
        continue;
      }

      if (res.status === 429 || res.status >= 500) {
        const text = await res.text().catch(() => '');
        lastError = new AzureError(`HTTP ${res.status}`, {
          status: res.status,
          retryable: true,
          body: text.slice(0, 400),
        });
        await sleep(backoffMs(attempt, res.headers.get('retry-after')));
        continue;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        // 4xx other than 429 will not fix itself; fail loudly and immediately.
        throw new AzureError(`HTTP ${res.status}`, {
          status: res.status,
          retryable: false,
          body: text.slice(0, 600),
        });
      }

      const json = await res.json();
      const choice = json.choices?.[0];
      const content = choice?.message?.content ?? '';
      if (!content.trim()) {
        // A reasoning deployment given too small a token budget returns 200
        // with an empty message. Treat as retryable with a bigger budget.
        lastError = new AzureError('empty completion (raise --max-tokens)', {
          status: 200,
          retryable: true,
          body: JSON.stringify(choice?.finish_reason ?? null),
        });
        body.max_completion_tokens = Math.min(Math.round(body.max_completion_tokens * 1.5), 64000);
        await sleep(backoffMs(attempt));
        continue;
      }

      usage.calls++;
      usage.promptTokens += json.usage?.prompt_tokens ?? 0;
      usage.completionTokens += json.usage?.completion_tokens ?? 0;
      onUsage?.(usage);

      return {
        content,
        usage: json.usage ?? {},
        model: json.model ?? cfg.deployment,
        attempts: attempt,
      };
    }
    throw lastError ?? new AzureError('exhausted retries');
  }

  return { chat, config: { ...cfg, apiKey: '[redacted]' }, usage };
}

/** Bounded-concurrency map that never rejects — a failed item resolves to its error. */
export async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      try {
        results[i] = { ok: true, value: await worker(items[i], i) };
      } catch (error) {
        results[i] = { ok: false, error };
      }
    }
  });
  await Promise.all(runners);
  return results;
}
