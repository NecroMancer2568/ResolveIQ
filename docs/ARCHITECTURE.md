# ResolveIQ Architecture

## Core principle

ResolveIQ is not just document retrieval. It ranks evidence and historical resolutions according to customer context, authority, freshness and observed resolution success, then verifies the generated answer before human approval.

## Data planes

### Knowledge plane
Source documents → parsing → chunking → embeddings → Azure AI Search.

### Resolution plane
Tickets → context → hybrid retrieval → resolution memory → arbitration → generation → verification.

### Learning plane
Human edits/approval → outcomes → ranking examples → learned ranker → knowledge gaps.

## Failure behavior

The system should prefer `ABSTAIN` or `ESCALATE` to unsupported answers when evidence is insufficient or materially conflicting.

## Provider boundaries

Retrieval, generation, embeddings and verification are defined behind small interfaces. Local implementations make development/test deterministic; Azure implementations can be enabled through configuration.
