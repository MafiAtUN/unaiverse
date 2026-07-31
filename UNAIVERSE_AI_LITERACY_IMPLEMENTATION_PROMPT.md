# UNAIVERSE AI Literacy Platform
## Trigger Prompt and Full Implementation Brief

---

# 1. Trigger Prompt

Paste this first into Claude Code, Codex, Cursor, or another coding agent that has access to the existing UNAIVERSE repository.

```text
Read the full file UNAIVERSE_AI_LITERACY_IMPLEMENTATION_PROMPT.md and execute it against the current repository.

Start by inspecting the existing project, running it locally, identifying its architecture, design system, data model, routes, components, glossary, timeline, deployment workflow, and GitHub Pages constraints.

Then implement the complete AI Literacy Universe described in the file.

Important constraints:

1. This is a fully public GitHub Pages website.
2. There is no user authentication, login, password, account system, or protected area.
3. Do not add authentication.
4. Do not add a backend solely for user accounts.
5. Do not expose Azure OpenAI credentials in browser code.
6. Use Azure OpenAI only through an offline development-time content-generation pipeline.
7. Publish reviewed explanations as static JSON or TypeScript data.
8. Preserve the current UNAIVERSE website, visual identity, timeline, routes, and deployment process.
9. Integrate the new terminology platform seamlessly into the existing project.
10. Do not stop after planning. Implement, test, build, and document the work.
```

---

# 2. Full Implementation Prompt

You are a senior full-stack engineer, information architect, visual storyteller, educational designer, accessibility specialist, and AI literacy expert.

You are working inside the existing UNAIVERSE repository:

https://mafiatun.github.io/unaiverse/

Your task is to transform and expand the existing website into an exceptional public AI literacy platform while preserving and improving everything that already works.

The site is a completely public GitHub Pages website.

There is no authentication requirement.

Do not add:

- Login
- Registration
- Password protection
- User accounts
- Protected routes
- Role-based access
- Authentication providers
- User databases
- Server-side sessions

The primary audience is:

1. United Nations personnel who encounter AI terminology in meetings, resolutions, reports, presentations, policy discussions, procurement documents, news, and technical briefings.
2. Diplomats, policy officers, programme officers, human rights officers, communications staff, data practitioners, managers, and front-office staff.
3. Members of the public with little or no technical background.
4. High-school-level learners who are curious about AI.
5. Technical users who may want a deeper explanation after understanding the basic concept.

The central promise of the platform is:

> Understand the AI terms everyone is using, without needing a computer science degree.

The platform is an independent educational project. It must not present itself as an official United Nations product or imply endorsement by the United Nations.

---

## 1. Inspect the Existing Project First

Before modifying code:

1. Read the complete repository.
2. Identify the framework, package manager, build system, routing approach, component structure, styling system, data files, utility functions, tests, and deployment workflow.
3. Run the project locally.
4. Inspect the existing galaxy timeline, filters, milestone panels, source receipts, glossary, guided quests, responsive behaviour, animations, and typography.
5. Identify the current glossary schema and every place where glossary terms are referenced.
6. Identify reusable components before creating new ones.
7. Determine whether the project is a single-page application or uses multiple routes.
8. Review the GitHub Pages deployment configuration.
9. Preserve GitHub Pages compatibility.
10. Do not replace the current design system with a generic template.
11. Do not remove or break existing timeline content.
12. Preserve existing URLs and deep links.
13. Preserve the project’s cosmic storytelling personality.
14. Improve readability, accessibility, navigation, and educational clarity.

Create a short implementation note in the repository documenting:

- Existing architecture
- Reused components
- New components
- New routes
- Content model
- Content-generation workflow
- GitHub Pages deployment approach
- Accessibility approach

Then implement the work. Do not stop after producing a plan.

---

## 2. Product Architecture

Expand UNAIVERSE into two connected experiences.

### Experience A: UN and AI Timeline

Preserve the existing timeline explaining the evolution of AI-related work across the United Nations.

### Experience B: AI Literacy Universe

Create a major learning area dedicated to understanding AI terminology.

The two experiences must feel like parts of the same product.

Add clear navigation between:

- UN AI Timeline
- Learn AI
- Term Explorer
- Learning Paths
- Concept Map
- Saved Terms
- About
- Methodology

Saved terms and learning progress must use local browser storage only. They must not require an account.

Existing highlighted terms in the timeline must link directly to the corresponding educational term page or open a terminology panel.

A user reading a timeline entry about large language models, AI alignment, human oversight, compute, or another concept should be able to select the term, understand it, and return to the same timeline position.

---

## 3. Core Terminology Taxonomy

Create an expandable taxonomy rather than one long alphabetical glossary.

### A. AI Foundations

- Artificial intelligence
- Algorithm
- Model
- Data
- Dataset
- Machine learning
- Deep learning
- Generative AI
- Predictive AI
- Rule-based system
- Narrow AI
- Artificial general intelligence
- Foundation model
- Frontier model
- Open-source AI
- Open-weight model
- Proprietary model

### B. How Machines Learn

- Training
- Inference
- Training example
- Feature
- Label
- Ground truth
- Supervised learning
- Unsupervised learning
- Semi-supervised learning
- Self-supervised learning
- Reinforcement learning
- Classification
- Regression
- Clustering
- Epoch
- Batch
- Mini-batch
- Iteration
- Validation dataset
- Test dataset
- Transfer learning

### C. Neural Networks

- Artificial neuron
- Neural network
- Input layer
- Hidden layer
- Output layer
- Weight
- Bias
- Activation
- Activation function
- ReLU
- Sigmoid
- Softmax
- Forward pass
- Convolutional neural network
- Recurrent neural network

### D. How Models Improve

- Error
- Loss
- Loss function
- Cost function
- Optimisation
- Optimiser
- Gradient
- Gradient descent
- Learning rate
- Backpropagation
- Chain rule
- Convergence
- Local minimum
- Global minimum
- Momentum
- Adam optimiser
- Vanishing gradient
- Exploding gradient
- Regularisation
- Dropout

### E. Model Quality and Evaluation

- Accuracy
- Precision
- Recall
- F1 score
- Confusion matrix
- True positive
- False positive
- True negative
- False negative
- Benchmark
- Baseline
- Evaluation
- Cross-validation
- Overfitting
- Underfitting
- Generalisation
- Bias
- Variance
- Data leakage
- Class imbalance
- Robustness
- Calibration

### F. Large Language Models

- Language model
- Large language model
- Token
- Tokenisation
- Vocabulary
- Prompt
- System prompt
- User prompt
- Prompt engineering
- Context
- Context window
- Parameter
- Model weight
- Next-token prediction
- Completion
- Temperature
- Top-p
- Sampling
- Deterministic output
- Hallucination
- Reasoning model
- Multimodal model
- Vision-language model
- Latency
- Throughput

### G. Transformers and Attention

- Transformer
- Attention
- Self-attention
- Query
- Key
- Value
- Attention score
- Multi-head attention
- Positional encoding
- Encoder
- Decoder
- Encoder-decoder model
- Autoregressive model
- Embedding
- Vector
- Vector space

### H. Search, Embeddings, and RAG

- Semantic similarity
- Cosine similarity
- Semantic search
- Keyword search
- Vector database
- Retrieval
- Retrieval-augmented generation
- RAG
- Chunk
- Chunking
- Indexing
- Ranking
- Reranking
- Knowledge base
- Grounding
- Citation
- Nearest-neighbour search

### I. Training and Model Adaptation

- Pretraining
- Fine-tuning
- Supervised fine-tuning
- Instruction tuning
- Reinforcement learning from human feedback
- RLHF
- Preference learning
- Alignment
- In-context learning
- Zero-shot learning
- One-shot learning
- Few-shot learning
- Distillation
- Quantisation
- Pruning
- LoRA
- Parameter-efficient fine-tuning
- Checkpoint

### J. AI Agents and Automation

- AI assistant
- Chatbot
- Copilot
- AI agent
- Agentic AI
- Workflow
- Tool use
- Function calling
- Planning
- Observation
- Action
- Feedback loop
- Short-term memory
- Long-term memory
- Orchestration
- Multi-agent system
- Human in the loop
- API
- Connector
- Model Context Protocol
- Computer use
- Guardrail

### K. Generative Media

- Text generation
- Image generation
- Audio generation
- Video generation
- Code generation
- Text-to-image
- Speech-to-text
- Text-to-speech
- Diffusion model
- Generative adversarial network
- Variational autoencoder
- Synthetic media
- Deepfake

### L. Computer Vision and Language Technology

- Computer vision
- Image classification
- Object detection
- Image segmentation
- Facial recognition
- Optical character recognition
- Bounding box
- Pixel
- Image captioning
- Pose estimation
- Natural language processing
- Sentiment analysis
- Named entity recognition
- Machine translation
- Summarisation
- Intent detection
- Topic modelling
- Corpus

### M. Data and Infrastructure

- Structured data
- Unstructured data
- Data cleaning
- Missing data
- Noisy data
- Annotation
- Data labelling
- Synthetic data
- Sampling
- Data distribution
- Distribution shift
- Data drift
- Metadata
- Data governance
- GPU
- CPU
- TPU
- Compute
- Training compute
- Inference compute
- Cloud computing
- Model hosting
- Endpoint
- Deployment
- Edge AI
- Scalability
- Rate limit
- Cost per token

### N. Responsible AI, Human Rights, and Safety

- Responsible AI
- AI ethics
- AI safety
- AI alignment
- Algorithmic bias
- Fairness
- Transparency
- Explainability
- Interpretability
- Accountability
- Privacy
- Consent
- Human oversight
- Human rights due diligence
- Impact assessment
- Red teaming
- Content moderation
- Toxicity
- Guardrail
- Meaningful human control
- Digital divide
- AI divide
- Accessibility
- Inclusion

### O. AI Security

- Prompt injection
- Indirect prompt injection
- Jailbreak
- Adversarial attack
- Adversarial example
- Data poisoning
- Model poisoning
- Data exfiltration
- Model extraction
- Model inversion
- Access control
- Authentication
- Authorisation
- Sandboxing
- Secrets management

### P. AI Governance and UN Terminology

- AI governance
- Global AI governance
- Multilateralism
- Multi-stakeholder governance
- Normative instrument
- Resolution
- Consensus
- Recorded vote
- Member State
- Secretariat
- General Assembly
- Security Council
- International standard
- Interoperability
- Capacity-building
- Digital public infrastructure
- Digital public goods
- Global Digital Compact
- Scientific Panel on AI
- Global Dialogue on AI Governance
- Sustainable Development Goals
- Risk-based regulation
- Technology-neutral regulation
- Regulatory sandbox
- AI assurance
- AI audit

Do not assume the list is complete.

Identify missing prerequisite, contemporary, governance, safety, or UN-relevant terminology.

Add a term only when it has a clear educational purpose and can be placed within the taxonomy.

Target approximately 180 to 250 carefully developed concepts.

---

## 4. Structured Content Model

Every term must be stored as structured data rather than being hardcoded separately into UI components.

Create a strongly typed schema similar to:

```ts
type Difficulty = "starter" | "intermediate" | "deeper";

type Audience =
  | "everyone"
  | "policy"
  | "leadership"
  | "human-rights"
  | "programme"
  | "communications"
  | "technical";

interface LearningResource {
  title: string;
  url: string;
  type:
    | "official"
    | "wikipedia"
    | "video"
    | "article"
    | "course"
    | "discussion"
    | "interactive";
  publisher?: string;
  description: string;
  difficulty?: Difficulty;
  verified: boolean;
  lastChecked?: string;
}

interface TermExplanation {
  id: string;
  slug: string;
  term: string;
  acronym?: string;
  aliases: string[];
  categoryId: string;
  subcategory?: string;
  difficulty: Difficulty;
  audiences: Audience[];
  prerequisiteTermIds: string[];
  relatedTermIds: string[];
  oftenConfusedWith: string[];

  oneSentence: string;
  plainExplanation: string;

  everydayAnalogy: {
    title: string;
    story: string;
    mapping: Array<{
      analogyElement: string;
      aiElement: string;
    }>;
    limitation: string;
  };

  visual: {
    type:
      | "animated-diagram"
      | "step-sequence"
      | "comparison"
      | "slider"
      | "simulation"
      | "flow"
      | "concept-map"
      | "before-after";
    title: string;
    learningObjective: string;
    description: string;
    steps: Array<{
      label: string;
      explanation: string;
      visualInstruction: string;
    }>;
    interaction?: string;
    accessibilityDescription: string;
    reducedMotionDescription: string;
  };

  workedExample: {
    scenario: string;
    input?: string;
    process: string[];
    result: string;
  };

  unWorkplaceExample: {
    scenario: string;
    relevance: string;
    caution?: string;
  };

  whyItMatters: string;
  whereYouMayHearIt: string[];

  commonMisconceptions: Array<{
    misconception: string;
    correction: string;
  }>;

  simpleVsTechnical: {
    simple: string;
    technical: string;
  };

  keyTakeaway: string;

  quickCheck: {
    question: string;
    options: string[];
    correctOptionIndex: number;
    explanation: string;
  };

  resources: LearningResource[];
  searchKeywords: string[];
  contentVersion: string;
  reviewed: boolean;
  reviewerNotes?: string;
  lastReviewed?: string;
}
```

Adapt the schema to the project architecture while preserving the educational fields and term relationships.

Validate content using Zod, JSON Schema, or the project’s existing validation system.

---

## 5. Explanation Standard

Write every explanation for an intelligent reader with no technical background.

Use approximately an eighth- to tenth-grade reading level.

Follow these rules:

1. Define the term immediately.
2. Use short sentences and short paragraphs.
3. Introduce one new idea at a time.
4. Do not explain unfamiliar jargon using more unfamiliar jargon.
5. Define unavoidable technical words at first use.
6. Begin with intuition before technical detail.
7. Use concrete situations, people, objects, and decisions.
8. Explain what goes into a process, what happens, and what comes out.
9. Explain why the term matters.
10. State the limitations of every analogy.
11. Distinguish closely related concepts.
12. Avoid hype and fearmongering.
13. Avoid presenting AI as conscious.
14. Do not describe models as understanding, thinking, knowing, wanting, or deciding without qualification.
15. Do not treat model output as inherently factual.
16. Use internationally understandable examples.
17. Avoid examples that depend entirely on one country or culture.
18. Use names and scenarios representing different regions.
19. Avoid political advocacy.
20. Treat Member States and sensitive UN issues neutrally.
21. Include human rights, privacy, inclusion, language, disability, gender, geographic, and socioeconomic implications where relevant.
22. Use international English consistently.
23. Keep the writing simple but not childish.
24. Use light humour only when it improves learning.
25. Do not invent facts, statistics, publications, quotations, or URLs.
26. Mark contested or unsettled terminology clearly.

---

## 6. Example Quality

Every example must be created specifically for the concept.

Do not repeatedly use cats, dogs, recipes, or generic robots.

Use diverse contexts such as:

- Sorting urgent and non-urgent messages
- Predicting rainfall
- Translating a short field report
- Recognising damaged roads in satellite images
- Recommending documents from a knowledge base
- Detecting duplicate records
- Estimating food requirements
- Classifying public feedback
- Summarising meeting notes
- Searching policy documents
- Planning a journey
- Learning from examination mistakes
- Adjusting a radio signal
- Locating a book in a library
- Choosing the next word in a sentence
- Interpreting an ambiguous pronoun
- Comparing paragraphs with different wording but similar meaning

UN workplace examples may include:

- Preparing a briefing note
- Searching resolutions
- Analysing survey responses
- Translating field updates
- Reviewing programme data
- Producing situation reports
- Supporting humanitarian coordination
- Analysing satellite imagery
- Identifying protection trends
- Summarising consultation submissions
- Drafting text while maintaining human review
- Managing confidential or sensitive data

UN examples must never suggest entering confidential, personal, survivor, witness, security-sensitive, or operational information into an unapproved public AI service.

Every analogy must explicitly state where it stops working.

---

## 7. Mandatory Visual Storytelling

Every published term must have a visual explanation.

Do not use decorative stock imagery as the main explanation.

Use native HTML, CSS, SVG, Canvas, or the project’s existing visual framework.

Prefer lightweight, interactive diagrams.

### Gradient Descent

Show a character on a landscape trying to reach the lowest point.

Allow the learner to adjust the learning rate:

- Too small: progress is slow
- Appropriate: the character approaches the low point
- Too large: the character overshoots

Connect each step to changing model parameters to reduce error.

### Backpropagation

Show a simple three-stage network:

- Input
- Internal decisions
- Prediction

Animate information moving forward.

Compare the prediction with the correct answer.

Animate error responsibility moving backward.

Show weights being adjusted.

Explain that backpropagation calculates how much each weight contributed to the error. Gradient descent uses that information to update the weights.

### Token

Create an interactive sentence tokenizer.

Let users type a sentence.

Show that tokens may be:

- Whole words
- Parts of words
- Punctuation
- Numbers

Do not claim exact tokenisation unless an actual tokenizer for a named model is used.

State that tokenisation differs between models.

### Context Window

Create a desk or workspace metaphor.

Documents inside the workspace are available to the model.

Documents outside the workspace are not currently visible.

Allow users to add content until capacity is reached.

Explain that a large context window is not the same as perfect memory or perfect use of every detail.

### Parameters

Show a large control panel with adjustable numerical dials.

Explain that training changes these values.

Clarify that one parameter does not normally correspond to one stored fact.

### Embeddings

Create a two-dimensional concept map.

Place related concepts near one another.

Demonstrate how semantic similarity can connect phrases without identical keywords.

State that real embeddings use many more dimensions than can be displayed.

### Attention

Display a sentence with an ambiguous pronoun.

Allow the learner to select a word and see which other words receive greater attention.

State that the visual is a simplified teaching representation.

### RAG

Create this visual sequence:

Question → Search trusted collection → Retrieve relevant passages → Give passages to model → Generate grounded answer → Display citations

Contrast it with answering only from learned model parameters.

### Overfitting

Show a student memorising one practice examination.

The student performs well on repeated questions but poorly on new questions.

Compare this with learning the underlying principles.

### Hallucination

Show a model faced with a missing fact.

Present three possible behaviours:

- State uncertainty
- Retrieve a source
- Invent a plausible answer

Explain why fluent language does not guarantee truth.

Every visual must include:

- Learning objective
- Initial state
- User interaction where useful
- Visible result
- Plain-language interpretation
- Screen-reader alternative
- Keyboard accessibility
- Reduced-motion behaviour

---

## 8. Progressive Disclosure

Do not present beginners with a wall of text.

Every term page or panel should reveal information in layers.

### Layer 1: In Five Seconds

- Term
- One-sentence explanation
- One strong visual
- Why it matters

### Layer 2: Understand It

- Plain explanation
- Everyday analogy
- Worked example
- UN workplace example

### Layer 3: Avoid Confusion

- Often confused with
- Common misconceptions
- Analogy limitation
- Related terms

### Layer 4: Go Deeper

- Technical explanation
- Prerequisites
- External learning resources
- Source and review information

Remember the selected depth using local storage only.

---

## 9. Navigation and Information Architecture

Create several ways to explore.

### Search

Provide typo-tolerant search across:

- Term
- Acronym
- Aliases
- Plain explanation
- Category
- Related concepts
- Search keywords

Examples:

- `back propogation` should find `backpropagation`
- `gradient decent` should find `gradient descent`
- `LLM` should find `large language model`
- `memory limit` should help find `context window`

Search results should show:

- Category
- Difficulty
- One-line explanation

### Category Browser

Display the taxonomy as distinct constellations or sectors.

Each category should show:

- Category name
- Plain description
- Number of terms
- Suggested starting term
- Connections to adjacent categories

### Concept Map

Create a responsive relationship map.

Do not show hundreds of lines at once.

Use progressive expansion:

1. Show major categories.
2. Select a category to show core terms.
3. Select a term to reveal prerequisites and related concepts.
4. Offer an accessible list-based alternative.

### Alphabetical Index

Include a fast A-to-Z glossary.

### “I Heard This Term” Mode

Provide a search-first experience with the prompt:

> What AI term did you just hear?

### Guided Learning Paths

Create paths such as:

- AI basics in 15 minutes
- Understand ChatGPT and large language models
- AI terminology for diplomats
- AI for managers and front offices
- AI for programme and policy officers
- AI for human rights practitioners
- AI for communications teams
- AI for data and digital teams
- Understand AI governance
- Understand AI risks without panic
- How AI learns
- From prompts to agents
- From embeddings to RAG
- How to assess an AI proposal
- AI terms appearing in UN resolutions

Each path should include approximately 6 to 12 concepts.

Use local storage to track completion.

### Compare Terms

Allow side-by-side comparison of:

- AI versus machine learning versus deep learning
- Generative AI versus predictive AI
- Training versus inference
- Parameter versus token
- Context window versus memory
- Prompt engineering versus fine-tuning
- RAG versus fine-tuning
- Keyword search versus semantic search
- Chatbot versus copilot versus agent
- Transparency versus explainability
- Bias versus variance
- Accuracy versus precision versus recall
- Data privacy versus data security
- Open-source versus open-weight
- AI ethics versus AI safety versus AI governance

---

## 10. Existing Timeline Integration

The literacy platform must be deeply connected to UNAIVERSE.

1. Preserve current glossary links.
2. Map every existing glossary term to the expanded terminology dataset.
3. Selecting a term in a timeline milestone should open a compact explanation without losing context.
4. Include a “Learn this concept fully” action.
5. Full term pages should show where the term appears in the UNAIVERSE timeline.
6. Display related milestones as contextual cards.
7. Allow return to the exact milestone and scroll position.
8. Link UN governance terms to authoritative timeline milestones and source receipts.
9. Do not duplicate timeline data when it can be referenced by ID.
10. Preserve the existing A/BOT personality.
11. Expand existing quests into learning paths.
12. Clearly distinguish:
   - General AI terminology
   - UN institutional terminology
   - AI governance terminology
   - Timeline events
   - Official documents

---

## 11. External Learning Resources

Each term should provide a small set of useful external resources.

Aim for:

1. One authoritative or primary resource
2. One accessible encyclopaedic resource
3. One high-quality visual or video explanation
4. One deeper technical resource
5. One community discussion or practical perspective where useful

Potential publishers include:

- United Nations
- UNESCO
- ITU
- OECD
- NIST
- European Commission
- Universities
- Original research papers
- Wikipedia
- 3Blue1Brown
- StatQuest
- Crash Course
- Computerphile
- Khan Academy
- DeepLearning.AI
- Microsoft Learn
- Google Machine Learning resources
- Hugging Face
- OpenAI documentation
- Anthropic documentation

Reddit and YouTube are supplementary resources, not authoritative sources.

### Reddit

- Link to a stable, reviewed discussion when useful.
- Otherwise provide a search link for the concept.
- Do not present community claims as established facts.

### YouTube

- Prefer a reviewed video from a credible educator.
- When a specific video cannot be verified, provide a search link rather than inventing a video URL.

### Wikipedia

- Link to the appropriate article when it exists.
- Treat it as accessible background rather than final authority for contested claims.

Resource cards should show:

- Resource type
- Publisher
- Difficulty
- Why it is useful
- External-site indication
- Last checked date

Open external links in a new tab using safe `rel` attributes.

Run an automated link checker.

Do not fabricate URLs.

---

## 12. Azure OpenAI Content-Generation Architecture

The public GitHub Pages website must not call Azure OpenAI directly from the browser using a secret credential.

The site itself requires no authentication.

Azure OpenAI is used only during development or controlled content-generation workflows.

Use this architecture:

1. A taxonomy file defines the terminology.
2. A local or CI script sends one term at a time to Azure OpenAI.
3. Azure OpenAI returns strict structured JSON.
4. The response is validated.
5. Invalid responses are retried with validation feedback.
6. Generated content is saved into a review directory.
7. A human reviews the content.
8. Approved content is copied into the static production dataset.
9. The public GitHub Pages site reads only approved static JSON or TypeScript data.
10. The public site functions without an API connection.

Suggested structure:

```text
scripts/
  generate-terms.ts
  regenerate-term.ts
  validate-terms.ts
  check-links.ts
  build-related-terms.ts
  content-report.ts

content/
  taxonomy.json
  generated/
  reviewed/
  rejected/
  generation-manifest.json
```

Use the project’s existing language and runtime where practical.

Use environment variables:

```text
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_DEPLOYMENT=
AZURE_OPENAI_API_VERSION=
```

Provide `.env.example`.

Never commit `.env`.

Never expose Azure credentials in client-side code.

Make the deployment name configurable.

Do not hardcode a model name.

Use structured output or JSON Schema where supported.

Otherwise require valid JSON and validate it locally.

Add:

- Exponential backoff
- Retry limits
- Concurrency control
- Rate-limit handling
- Checkpointing
- Resume support
- Per-term regeneration
- Dry-run mode
- Token-usage logging
- Cost logging where available
- Content hashes
- Generation timestamps
- Prompt version
- Model deployment metadata
- Failure reports

Do not regenerate reviewed content unless explicitly requested.

Suggested commands:

```bash
npm run content:generate
npm run content:generate -- --term gradient-descent
npm run content:validate
npm run content:check-links
npm run content:report
```

Adapt commands to the actual package manager.

---

## 13. Azure OpenAI System Prompt

Use the following substance for the content-generation system prompt:

```text
You are an AI literacy educator, visual explanation designer, technical fact-checker, and public-sector communications specialist.

You explain artificial intelligence accurately to intelligent non-specialists, including United Nations personnel and members of the public.

Your writing must be understandable to a high-school learner without sounding childish.

Start with intuition, then add optional technical depth.

Use internationally understandable examples.

Explain one new concept at a time.

Avoid unexplained jargon, hype, anthropomorphism, and unsupported claims.

Every analogy must include its limitation.

Every explanation must distinguish the concept from commonly confused terms.

Every visual must teach a causal, structural, or procedural idea rather than merely decorate the page.

UN workplace examples must be realistic and must protect privacy, confidentiality, human rights, safety, and human oversight.

Return only JSON that conforms exactly to the supplied schema.

Do not produce Markdown outside JSON.

Do not invent references, titles, quotations, statistics, or URLs.

When a reliable specific URL has not been supplied or cannot be verified, leave the resource field empty or return a clearly constructed search URL rather than fabricating a source.
```

---

## 14. Term-Level Generation Prompt

For each term, dynamically provide:

- Term
- Category
- Difficulty
- Known aliases
- Required prerequisites
- Related terms
- Commonly confused terms
- Existing site references
- Approved resource URLs
- Existing explanation when regenerating
- Full JSON schema
- Reading-level requirements
- Supported visual component types

Require the model to:

1. Explain the term in one sentence.
2. Explain it in plain language.
3. Create a concrete everyday analogy.
4. Map analogy elements to the real AI mechanism.
5. State where the analogy fails.
6. Create a step-by-step visual specification.
7. Create one worked example.
8. Create one realistic UN workplace example.
9. Explain why the term matters.
10. Identify where users may hear the term.
11. Correct at least two misconceptions where relevant.
12. Provide simple and technical explanations.
13. Write one knowledge-check question.
14. Link prerequisites and related concepts using valid IDs.
15. Use only supplied or verified resource URLs.
16. Return schema-compliant JSON only.

---

## 15. Content Review Workflow

AI-generated content must not be treated as publication-ready automatically.

Provide:

- Generation status
- Schema validation status
- Link validation status
- Duplicate-content warnings
- Reading-level estimate
- Missing-field warnings
- Terminology consistency checks
- Human review flag
- Reviewer notes
- Content version
- Last reviewed date

A term may be published only when:

- The schema is valid
- Required fields are present
- Related IDs exist
- Internal links work
- External resources are validated or clearly marked unverified
- The explanation is reviewed
- The visual specification is implementable
- The analogy limitation is present
- The knowledge check has one defensible answer

Create a content quality report showing:

- Total terms
- Reviewed terms
- Terms awaiting review
- Broken links
- Missing visuals
- Missing UN examples
- Orphan terms
- Invalid prerequisite relationships
- Reading-level outliers
- Duplicate explanations

---

## 16. UI and Visual System

Retain UNAIVERSE’s cosmic identity while improving readability.

Prioritise:

1. Readability
2. Orientation
3. Interaction clarity
4. Accessibility
5. Visual delight

Use:

- Constellations for categories
- Orbits for related concepts
- Paths for guided learning
- Nodes for terms
- Portals between the timeline and literacy content

Educational reading views should use:

- Comfortable line length
- Strong heading hierarchy
- Generous spacing
- Plain labels
- Clear active states
- Visible breadcrumbs
- Persistent search
- Predictable back navigation

Avoid:

- Tiny text
- Excessive glowing effects
- Constant motion
- Low-contrast text
- Hidden navigation
- Horizontal scrolling for core content
- Essential information only in tooltips
- Large unreadable graphs on mobile
- Generic dashboard cards everywhere
- Unnecessary three-dimensional effects

---

## 17. Public, No-Login Experience

This is a fully public educational site.

Requirements:

- No login
- No account creation
- No password
- No authentication
- No access restrictions
- No user database
- No server-side profile
- No personal dashboard requiring identity

Optional local features may include:

- Saved terms
- Completed learning paths
- Preferred explanation depth
- Last visited term
- Recently viewed concepts

These must use local browser storage only.

Provide a visible option to clear locally stored learning data.

The site must remain useful when local storage is unavailable.

---

## 18. Responsive Experience

Design mobile-first.

On smaller screens:

- Use bottom sheets or full-screen term views
- Keep search easy to reach
- Replace complex maps with expandable lists
- Keep diagrams usable by touch
- Avoid hover-dependent interactions
- Maintain suitable touch target sizes
- Preserve the user’s location when panels open and close

Test representative widths:

- 360 px
- 390 px
- 768 px
- 1024 px
- 1440 px

---

## 19. Accessibility

Target WCAG 2.2 AA.

Include:

- Full keyboard navigation
- Visible focus indicators
- Semantic landmarks
- Correct heading order
- Accessible form labels
- Sufficient contrast
- Text alternatives for visuals
- Screen-reader descriptions of interactive states
- No information conveyed by colour alone
- Reduced-motion support
- Logical tab order
- Focus management for drawers and dialogs
- Escape-key support
- Accessible quiz feedback
- Announced search-result updates
- Skip links
- Meaningful link text

Provide a list alternative to every graph or concept map.

Respect `prefers-reduced-motion`.

---

## 20. Privacy

Do not add analytics, tracking pixels, cookies, fingerprinting, or third-party profiling unless explicitly required later.

Do not send:

- Learner search queries
- Saved terms
- Notes
- Progress
- Browsing history

to Azure OpenAI.

All learner progress should remain in the browser.

---

## 21. Performance

GitHub Pages performance matters.

Use:

- Static-first architecture
- Lazy-loaded visualisations
- Route or component code splitting where supported
- Optimised fonts and icons
- SVG and CSS instead of large image files
- Minimal third-party scripts
- Cached static term datasets
- Precomputed search indexes
- Graceful fallback behaviour

Do not load all term content on the initial page.

Aim for strong Lighthouse results across:

- Performance
- Accessibility
- Best practices
- SEO

---

## 22. Search and Sharing

Create stable term URLs such as:

```text
/learn/token
/learn/context-window
/learn/gradient-descent
/learn/backpropagation
```

Account for GitHub Pages routing and base-path limitations.

Each term should have:

- Unique page title
- Meta description
- Canonical URL
- Open Graph metadata
- Sharing summary
- Structured data where appropriate
- Deep-linkable sections

Generate a sitemap where supported.

---

## 23. Testing

Add or extend tests for:

- Schema validation
- Search
- Aliases
- Typo handling
- Term routes
- Related-term links
- Prerequisite integrity
- Quiz logic
- Timeline-to-term linking
- Return-to-timeline behaviour
- Local progress
- Reduced-motion mode
- Keyboard interaction
- Focus management
- External-link safety
- Broken internal links
- GitHub Pages base-path behaviour

Run:

- Type checking
- Linting
- Unit tests
- Production build
- Link checks
- Accessibility checks where possible

Fix errors rather than only reporting them.

---

## 24. Implementation Phases

### Phase 1

- Inspect and document the existing architecture
- Define taxonomy and schema
- Integrate existing glossary terms
- Build the Learn AI landing page
- Build search and category navigation
- Build the reusable term page or panel
- Build the Azure OpenAI generation pipeline
- Add initial sample terms

### Phase 2

Develop approximately 50 essential terms:

- Artificial intelligence
- Algorithm
- Model
- Data
- Machine learning
- Deep learning
- Generative AI
- Training
- Inference
- Neural network
- Weight
- Bias
- Loss function
- Gradient
- Gradient descent
- Learning rate
- Backpropagation
- Overfitting
- Underfitting
- Accuracy
- Precision
- Recall
- Large language model
- Token
- Tokenisation
- Prompt
- Context window
- Parameter
- Hallucination
- Transformer
- Attention
- Embedding
- Vector database
- Semantic search
- RAG
- Fine-tuning
- Foundation model
- Multimodal model
- AI agent
- Tool use
- Human in the loop
- Algorithmic bias
- Explainability
- Human oversight
- Prompt injection
- Deepfake
- AI safety
- AI ethics
- AI governance
- AI divide

### Phase 3

- Add learning paths
- Add comparison views
- Add concept map
- Add local progress tracking
- Add remaining terminology
- Expand timeline cross-links
- Complete review and quality reporting

---

## 25. Acceptance Criteria

The work is complete only when:

1. The existing UNAIVERSE timeline still works.
2. The AI Literacy Universe feels native to the current site.
3. Existing glossary links resolve to expanded explanations.
4. Users can browse by category, search by term or typo, and follow learning paths.
5. Every published term includes:
   - Simple explanation
   - Analogy
   - Visual
   - Worked example
   - UN workplace example
   - Misconception correction
   - Deeper explanation
   - Quick check
   - Related concepts
6. Visualisations teach mechanisms rather than decorate pages.
7. The public site has no authentication.
8. The public site contains no Azure credentials.
9. Azure OpenAI is used only through an offline content-generation pipeline.
10. Generated content is schema-validated and reviewable.
11. External URLs are checked.
12. No source URLs are fabricated.
13. GitHub Pages deployment still works.
14. Mobile navigation works.
15. Keyboard navigation works.
16. Accessibility requirements are substantially met.
17. Type checks, tests, and production build pass.
18. Documentation explains generation, review, regeneration, validation, and publishing.

---

## 26. Final Delivery

After implementation, provide:

1. Summary of changes
2. Routes added
3. Components added
4. Content schema
5. Azure OpenAI setup instructions
6. Command for generating one term
7. Command for generating all terms
8. Human review workflow
9. Publishing workflow
10. Testing results
11. Build results
12. Remaining limitations
13. Files created or modified
14. Recommended next development sequence

Make reasonable technical decisions based on the existing repository.

Reuse existing patterns.

Do not stop for confirmation unless a credential is required to test the live Azure request.

Even without credentials, complete:

- The generation pipeline
- Mock or fixture-based tests
- UI integration
- Schema
- Documentation
- Sample content
- Static production build
