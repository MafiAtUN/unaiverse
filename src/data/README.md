# Dropping the takes in

When the 156 generated takes are ready, save them here as **`takes.json`** and rebuild.
That is the whole procedure. No config, no code, no rebuild of `takes_manifest.json`.

```
src/data/takes.json     ← drop the file here
npm run build
```

The build prints what it did:

```
[unaiverse] 76 milestones · 156 take slots · 156/156 takes loaded
```

## Shape

The loader (`src/lib/takes.ts`) is deliberately permissive, because the generation
pipeline's exact output format isn't fixed yet. Either top-level shape works:

```json
{ "takes": [ … ] }
```
```json
[ … ]
```

And each entry can use any of these spellings — mix them freely if you have to:

| Field | Accepted keys |
|---|---|
| milestone | `milestone_id` · `milestoneId` · `id` |
| persona | `persona` · `persona_id` · `personaId` |
| beat 1 | `so_what` · `soWhat` · `"So what"` |
| beat 2 | `watch_for` · `watchFor` · `"Watch for"` |
| beat 3 | `use_it` · `useIt` · `"Use it"` |

Beats may also be nested under a `beats` object, or supplied as one labelled
string under `text` / `take` / `body`:

```json
{
  "milestone_id": "2025-general-assembly-establishes-the-scientific-panel-and-g",
  "persona": "opga",
  "text": "So what: … Watch for: … Use it: …"
}
```

The canonical shape, if you get to choose:

```json
{
  "milestone_id": "2025-general-assembly-establishes-the-scientific-panel-and-g",
  "persona": "opga",
  "so_what": "…",
  "watch_for": "…",
  "use_it": "…"
}
```

## Valid values

`milestone_id` must match a filename stem in `content/milestones/` — identical to
`milestone_id` in `takes_manifest.json`. `persona` must be one of:

`peace-security` · `development` · `human-rights` · `data-digital` ·
`front-office` · `opga` · `builders` · `missions`

## What happens when something is wrong

Nothing fails silently. The build reports each case:

- **Unparseable entry** → skipped, with the reason and the offending object printed.
- **Typo in `milestone_id` or `persona`** → the take loads but binds to no slot, so
  the build warns `take binds to no slot: "…" / "…"`. Without this it would look
  loaded while the slot still said "take incoming".
- **A slot with no take** → renders the "take incoming" state. Partial batches are
  fine; you can ship takes persona by persona and watch the count climb.

## Partial delivery

Expected, and supported. `CONTENT_SPEC.md` §7 recommends generating in batches per
persona to keep voice consistent — drop each batch as it clears Mafi's review pass and
rebuild. The hero counter shows `N/156` so progress is visible on the live site.
