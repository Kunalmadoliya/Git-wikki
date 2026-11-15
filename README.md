# GitWiki

> **Ask questions. Understand the codebase. Ship with confidence.**

GitWiki turns a GitHub repository into a conversational, searchable knowledge base.
Paste a repository URL, let the background pipeline fetch and index the source, then
ask natural-language questions with answers grounded in the repository's code.

The project is split into a React workspace and an Express worker-backed API:

```text
                         ┌──────────────────────────┐
                         │        GitWiki UI         │
                         │     React + Vite          │
                         └────────────┬─────────────┘
                                      │ REST + SSE
                                      ▼
                         ┌──────────────────────────┐
                         │      Express API          │
                         │ source state + query guard│
                         └───────┬──────────┬─────────┘
                                 │          │
                       repo/index│          │POST /api/query
                                 ▼          ▼
                         ┌────────────┐  ┌──────────────┐
                         │  Inngest   │  │  Pinecone    │
                         │ background │  │ doc search   │
                         │ pipeline   │  └──────┬───────┘
                         └─────┬──────┘         │
                               │                │ context
                         ┌─────▼──────┐         ▼
                         │ GitHub API │   ┌──────────────┐
                         │ Octokit    │   │ OpenAI        │
                         └────────────┘   │ GPT-4o-mini   │
                                          └──────────────┘
```

## What makes GitWiki useful?

- **Repository-aware chat** — queries are tied to a specific indexed source.
- **Real indexing progress** — stages, percentages, file counters, and chunk counters
  come from the backend rather than simulated frontend state.
- **Safe query gating** — the chat remains editable, but sending is enabled only when
  the selected source is actually `READY`.
- **Resumable source lifecycle** — sources are persisted in SQLite and recover cleanly
  after a server restart.
- **Live updates** — Server-Sent Events provide progress updates with polling fallback.
- **Private repository support** — optional GitHub tokens remain process-memory-only.
- **Document-schema Pinecone search** — chunks are stored and searched through
  Pinecone's integrated document inference API.

## Architecture

### Indexing flow

```text
POST /api/sources
      │
      ▼
SQLite source: SUBMITTED
      │
      ▼
Inngest event: repo/index { sourceId }
      │
      ├── VALIDATING
      │     Resolve repository access, default branch, and commit SHA
      │
      ├── FETCHING
      │     Read eligible Git blobs through Octokit
      │
      ├── PARSING_CHUNKING
      │     Split source files into overlapping semantic chunks
      │
      ├── EMBEDDING_UPSERTING
      │     Write document batches to Pinecone
      │
      ├── VERIFYING
      │     Confirm the namespace is queryable
      │
      └── READY
            Generate an optional repository summary
```

Every source receives a deterministic namespace:

```text
${owner.toLowerCase()}__${repo.toLowerCase()}
```

For example:

```text
https://github.com/expressjs/express
→ expressjs__express
```

Existing legacy `owner-repo` namespaces are not silently migrated.

### Query flow

```text
User question
      │
      ▼
Validate sourceId and READY state
      │
      ▼
Pinecone document similarity search
      │
      ▼
Top matching code chunks
      │
      ▼
GPT-4o-mini grounded response
      │
      ▼
Answer + citations
```

## Repository layout

```text
.
├── company-ocr/                    # Express API and background pipeline
│   ├── src/
│   │   ├── index.js                # HTTP server and route registration
│   │   ├── routes/
│   │   │   ├── sources.route.js    # Source lifecycle + SSE
│   │   │   ├── query.route.js      # Source-aware RAG queries
│   │   │   └── index.route.js      # Legacy indexing compatibility route
│   │   ├── store/
│   │   │   ├── sourceStore.js      # SQLite state and progress persistence
│   │   │   └── sourceStore.test.js
│   │   ├── services/
│   │   │   ├── github.js            # GitHub metadata and blob fetching
│   │   │   ├── chunker.js           # File chunking
│   │   │   ├── vectorStore.js       # Pinecone document operations
│   │   │   ├── query.js             # Retrieval and LLM response generation
│   │   │   ├── summaryService.js    # Post-READY repository summaries
│   │   │   └── telemetryHub.js     # SSE subscribers and heartbeats
│   │   └── inngest/
│   │       └── functions/indexRepo.js
│   └── data/                       # Local SQLite database, ignored by Git
├── frontend/                       # React + Vite client
│   └── src/
│       ├── App.jsx
│       ├── components/
│       │   ├── indexing/RepositoryIndexer.jsx
│       │   ├── chat/CodebaseChatbot.jsx
│       │   └── layout/Header.jsx
│       └── services/api.js
└── docs/
    └── HLD_NOTEBOOK_STYLE_CODE_CHATBOT.md
```

## Requirements

- Node.js 22 or newer
- npm
- GitHub account/token for private repositories or higher GitHub API limits
- Pinecone index configured for integrated document inference
- OpenAI API key
- Inngest CLI for local background execution

## Quick start

### 1. Configure the backend

Create `company-ocr/.env`:

```env
PORT=3000

GITHUB_TOKEN=github_pat_your_token_here
OPENAI_API_KEY=sk-your_key_here

PINECONE_API_KEY=your_pinecone_key_here
PINECONE_INDEX=ocr
```

Never commit `.env` files or real credentials.

### 2. Install dependencies

```powershell
cd company-ocr
npm install

cd ..\frontend
npm install
```

### 3. Start the backend

```powershell
cd company-ocr
npm run dev
```

The API starts at [http://localhost:3000](http://localhost:3000).

The development watcher ignores `data/` so SQLite progress writes do not restart
the server.

### 4. Start Inngest locally

In a second terminal:

```powershell
cd company-ocr
npx --ignore-scripts=false inngest-cli@latest dev
```

The Inngest development server is available at
[http://localhost:8288](http://localhost:8288).

### 5. Start the frontend

In a third terminal:

```powershell
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Vite proxies `/api` requests to the backend on port `3000`.

## API reference

### Health

```http
GET /api/status
```

Returns backend availability and configured service flags.

### Create or reuse a source

```http
POST /api/sources
Content-Type: application/json

{
  "repoUrl": "https://github.com/expressjs/express",
  "githubToken": "optional-private-repo-token"
}
```

The token is kept in process memory and is never stored in SQLite, emitted in
Inngest events, logged, or returned in API responses.

Repeated submissions reuse an active source and return `200 EXISTS`. Use
`"force": true` to create a fresh indexing run.

### List sources

```http
GET /api/sources
```

### Read source status

```http
GET /api/sources/:sourceId/status
```

The response includes:

- `stage`
- server-derived `progress.percentage`
- `progress.currentStep`
- file and chunk counters
- summary and error information

### Stream source updates

```http
GET /api/sources/:sourceId/events
```

The endpoint emits `source.updated` events, sends periodic heartbeats, closes
after terminal states, and falls back safely to `/status` polling in the frontend.

### Retry, cancel, and delete

```http
POST   /api/sources/:sourceId/retry
POST   /api/sources/:sourceId/cancel
DELETE /api/sources/:sourceId
```

Deletion cancels an active job, purges its Pinecone namespace, and removes the
SQLite record only after the purge succeeds.

### Query a ready source

```http
POST /api/query
Content-Type: application/json

{
  "sourceId": "src_abc123",
  "query": "Where is request routing handled?"
}
```

Responses:

- `200` — grounded answer and citations
- `404` — unknown source
- `409` — source is not `READY`

Non-ready errors use the shape:

```json
{
  "code": "SOURCE_NOT_READY",
  "stage": "FETCHING",
  "message": "Source is not ready for querying; current stage is FETCHING."
}
```

## Source state machine

| Stage | Meaning |
| --- | --- |
| `SUBMITTED` | Source record created and awaiting the worker |
| `VALIDATING` | GitHub access and repository metadata are being checked |
| `FETCHING` | Eligible files are being downloaded |
| `PARSING_CHUNKING` | Files are being split into chunks |
| `EMBEDDING_UPSERTING` | Chunks are being written to Pinecone |
| `VERIFYING` | Pinecone namespace queryability is being confirmed |
| `READY` | Source is safe to query |
| `FAILED` | Retries are exhausted or a non-retryable error occurred |
| `CANCELLED` | User cancelled the indexing operation |

Only `READY` enables the frontend Send button.

## Development commands

### Backend

```powershell
cd company-ocr
npm run dev
npm test
```

### Frontend

```powershell
cd frontend
npm run dev
npm run build
npm run preview
```

## Troubleshooting

### The backend restarts while indexing

Make sure the backend is started with the current script:

```powershell
npm run dev
```

The script ignores `data/`, where SQLite WAL and database files change during
indexing.

### The Send button is disabled

This is intentional unless all conditions are true:

1. A source is selected.
2. Its backend stage is `READY`.
3. The question contains non-whitespace text.
4. No query is currently running.

The textarea remains editable while a source is indexing.

### Pinecone document-schema errors

The Pinecone index must support integrated document inference and expose the
configured text field used by the pipeline:

```text
chunk_text
```

GitWiki uses Pinecone's document APIs rather than legacy vector query APIs.

### Private repositories fail during validation

Provide `GITHUB_TOKEN` in `company-ocr/.env`, or expand the private repository
token field in the UI. Tokens are intentionally process-memory-only, so a server
restart requires submitting the token again.

## Security notes

- Do not commit `.env` files, GitHub tokens, OpenAI keys, or Pinecone keys.
- GitHub tokens are not persisted in SQLite or sent through Inngest payloads.
- Querying is guarded by `sourceId` and the persisted `READY` stage.
- Repository namespaces are deterministic and isolated per owner/repository pair.
- SQLite is configured with WAL mode for reliable local status persistence.

## License

This project is currently maintained as a private GitWiki application. Add a
license here before distributing it publicly.
