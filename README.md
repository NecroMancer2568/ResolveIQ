# ResolveIQ — Final Build

ResolveIQ is a resolution-centric customer-support copilot. It combines hybrid retrieval, customer-context matching, organizational Resolution Memory, evidence arbitration, grounded generation, claim verification, human review, and outcome-driven ranking.

> **Retrieve → Resolve → Verify → Human Review → Learn**

This repository is a fresh implementation. It is intentionally independent of the earlier baseline.

## 1. Architecture

```text
React Agent UI
      |
      v
FastAPI API
      |
      +--> PostgreSQL --------------------+
      |                                    |
      +--> Query Understanding             |
      |                                    |
      +--> Azure AI Search                 |
      |      BM25 + Vector + RRF           |
      |      + semantic reranking          |
      |                                    |
      +--> Resolution Intelligence         |
      |      context + success + authority |
      |      + freshness + learned ranker  |
      |                                    |
      +--> Evidence Arbitration             |
      |      conflicts + stale + abstain   |
      |                                    |
      +--> Microsoft Foundry               |
      |      grounded response             |
      |                                    |
      +--> Claim Verification              |
      |      evidence coverage + NLI       |
      |                                    |
      +--> Human feedback / outcome -------+
                     |
                     v
              Resolution Memory
                     |
                     v
              Learned ranker
```

## 2. Stack

- Python 3.12, FastAPI, Pydantic v2
- SQLAlchemy 2 + async PostgreSQL + Alembic
- Azure AI Search for BM25/vector/hybrid search and semantic ranking
- Microsoft Foundry / Azure OpenAI-compatible Responses API
- Sentence Transformers for local development embeddings
- LightGBM LambdaMART for learned resolution ranking
- Transformers + DeBERTa NLI for claim entailment when enabled
- HDBSCAN for knowledge-gap clustering
- Presidio for PII detection/redaction
- LangGraph-ready orchestration boundary (the pipeline is implemented as explicit typed stages so LangGraph can be introduced without changing domain contracts)
- React + TypeScript + Vite + Tailwind CSS + TanStack Query
- Docker Compose, Azure Container Apps, Azure Static Web Apps
- OpenTelemetry + Application Insights hooks
- Pytest, Ruff, mypy

## 3. Quick Start (local, no Azure required)

### Prerequisites

- Python 3.12+
- Node.js 20+
- Docker Desktop (recommended)
- Git

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

The default `.env` uses SQLite and the deterministic local retriever/generator, so the application can run without cloud credentials.

Start API:

```bash
uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`).

### Docker

```bash
docker compose up --build
```

The compose stack starts PostgreSQL and the API. Run the frontend locally or add the optional frontend profile.

## 4. Cloud Configuration

Set:

```env
APP_ENV=production
DATABASE_URL=postgresql+asyncpg://...
AZURE_SEARCH_ENDPOINT=https://<service>.search.windows.net
AZURE_SEARCH_INDEX=resolveiq
AZURE_SEARCH_API_KEY=...
FOUNDRY_ENDPOINT=https://<resource>.openai.azure.com
FOUNDRY_API_KEY=...
FOUNDRY_MODEL=<deployment-name>
EMBEDDING_PROVIDER=azure
EMBEDDING_MODEL=<embedding-deployment>
VERIFICATION_PROVIDER=deberta
```

For production, replace API keys with managed identity / Entra ID and Key Vault. The application keeps provider interfaces separate so local development does not depend on Azure.

## 5. Knowledge Ingestion

Supported source types:

- PDF
- DOCX
- TXT
- Markdown
- CSV
- JSON / JSONL

Put source files in `backend/data/sources/` and run:

```bash
python -m scripts.ingest --input backend/data/sources --index resolveiq
```

The ingestion pipeline performs parsing, normalization, structure-aware chunking, metadata extraction, PII redaction, embeddings, and index upload.

Create the Azure Search index first:

```bash
python -m scripts.create_search_index
```

Then ingest.

For local development, use the included JSONL corpus:

```bash
python -m scripts.seed_demo
```

## 6. Main API

### Create a resolution draft

```http
POST /api/v1/tickets/{ticket_id}/resolve
```

or submit a new ticket:

```http
POST /api/v1/tickets
```

Example:

```json
{
  "customer_message": "I was charged twice for my premium subscription.",
  "customer_context": {
    "product": "premium_subscription",
    "region": "IN",
    "customer_segment": "student"
  }
}
```

### Feedback

```http
POST /api/v1/tickets/{ticket_id}/feedback
```

```json
{
  "decision": "approved",
  "edited_response": "...",
  "rating": 5,
  "reason": "Accurate and concise"
}
```

### Analytics

```http
GET /api/v1/analytics/overview
GET /api/v1/analytics/knowledge-gaps
```

## 7. Resolution Pipeline

1. Parse and validate ticket.
2. Extract intent, issue, product, region and other context.
3. Rewrite the query for retrieval while preserving the original.
4. Execute lexical BM25 and dense vector retrieval.
5. Fuse candidates with Reciprocal Rank Fusion.
6. Apply semantic ranking when Azure Search is configured.
7. Retrieve historical Resolution Memory separately.
8. Rank resolutions using semantic/context/authority/freshness/success features.
9. Arbitrate evidence: conflicts, stale policy, authority and compatibility.
10. Decide `RESOLVE`, `CLARIFY`, `ABSTAIN`, or `ESCALATE`.
11. Generate a structured customer-facing draft from allowed evidence only.
12. Extract claims and verify claim-to-evidence support.
13. Run NLI entailment where configured; otherwise use deterministic evidence coverage.
14. Calculate calibrated confidence.
15. Present draft, evidence and verification results to a human.
16. Store approval/edit/rejection and eventual outcome.
17. Convert successful approved resolutions into Resolution Memory.
18. Train/update the learned ranker from positive/negative resolution examples.
19. Cluster recurring low-confidence questions into knowledge gaps.

## 8. Ranking

Initial Resolution Intelligence score:

```text
0.35 semantic relevance
+0.20 context match
+0.20 historical resolution success
+0.15 authority
+0.10 freshness
```

When enough feedback exists, the learned model replaces the manual combination with LightGBM LambdaMART. Features include BM25, vector, semantic, context, authority, freshness, historical success and customer similarity.

## 9. Evidence Arbitration

Each evidence item receives:

- source authority
- freshness
- product compatibility
- region compatibility
- customer-segment compatibility
- policy key/value
- version

Conflicts are detected by policy key/value and version metadata. Higher-authority, applicable, newer evidence wins. If reliable evidence cannot be selected, the pipeline abstains instead of hallucinating.

## 10. Claim Verification

The verifier:

1. Splits a generated answer into atomic claims.
2. Maps each claim to selected evidence.
3. Computes lexical/semantic evidence coverage.
4. Optionally runs DeBERTa NLI.
5. Labels claims as `SUPPORTED`, `PARTIALLY_SUPPORTED`, or `UNSUPPORTED`.
6. Rejects/regenerates drafts with unacceptable groundedness.

## 11. Human-in-the-loop

The UI exposes:

- customer message
- extracted context
- AI summary
- suggested resolution
- confidence
- claim verification
- source snippets
- draft response
- edit/approve/reject actions

Every edit is stored. Approved final responses are candidates for Resolution Memory after outcome confirmation.

## 12. Evaluation

The repository includes an evaluation runner and a benchmark format.

Create `evaluation/dataset.jsonl` using:

```json
{"id":"1","question":"...","context":{},"gold_evidence_ids":["..."],"gold_resolution":"..."}
```

Run:

```bash
python -m scripts.evaluate --dataset evaluation/dataset.jsonl
```

Metrics:

- Recall@K
- Precision@K
- MRR
- NDCG@K
- evidence coverage
- groundedness
- resolution accuracy
- conflict detection accuracy
- abstention accuracy
- acceptance rate
- edit distance
- time-to-draft
- time-to-resolution

The evaluation runner supports baseline labels so the competition report can compare:

```text
LLM-only
Vector RAG
Hybrid RAG
Hybrid + semantic ranking
ResolveIQ
```

## 13. Learned Ranker

Generate ranking examples from approved/rejected resolutions:

```bash
python -m scripts.train_ranker --input data/ranking_examples.jsonl --output artifacts/resolution_ranker.txt
```

The trainer requires enough labeled examples. Until then, the application automatically uses the deterministic scoring model.

## 14. Knowledge Gaps

```bash
python -m scripts.cluster_gaps --input data/knowledge_gap_events.jsonl --output artifacts/knowledge_gaps.json
```

HDBSCAN groups semantically similar unresolved questions. The dashboard exposes the highest-frequency clusters.

## 15. Security

Production requirements:

- Entra ID / OAuth2 authentication
- RBAC: Agent, Manager, Admin
- Key Vault / managed identity
- PII redaction before logs and learning datasets
- customer text treated as untrusted prompt content
- strict system/developer instructions
- output schema validation
- audit logging
- rate limiting
- CORS allow-list

## 16. Testing

Run all backend tests:

```bash
cd backend
pytest -q
```

With coverage:

```bash
pytest --cov=app --cov-report=term-missing
```

Lint/format:

```bash
ruff check .
ruff format --check .
```

Type checking:

```bash
mypy app
```

Frontend:

```bash
cd frontend
npm run build
```

Integration tests requiring Azure are marked `azure` and are skipped unless credentials are configured:

```bash
pytest -m azure
```

## 17. Production Deployment

Recommended Azure topology:

```text
Azure Static Web Apps
        |
Azure Container Apps
        |
+-------+-------+----------------+
|               |                |
AI Search   PostgreSQL       Blob Storage
|               |
Foundry       Key Vault
|
Application Insights / OpenTelemetry
```

Use GitHub Actions for:

```text
git push
 → lint
 → unit tests
 → integration tests
 → security scan
 → Docker build
 → deploy
```

## 18. Competition Demo

Use one ticket to show:

```text
Customer question
 → context extraction
 → hybrid retrieval
 → official policy
 → similar successful resolution
 → outdated/conflicting evidence detection
 → evidence arbitration
 → grounded draft
 → claim verification
 → confidence
 → human edit
 → approval
 → resolution memory
```

Then submit a second similar ticket and show that the historical resolution changes ranking.

## 19. Important Development Rule

Do not build a large frontend before the core intelligence works.

The first production milestone is:

```text
Question
 → Hybrid Azure Search
 → Resolution Memory
 → Evidence Arbitration
 → Microsoft Foundry
 → Verified Answer
```

The product's differentiator is the Resolution Intelligence layer, not the chat UI.
