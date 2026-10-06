# ResolveIQ Evaluation

Create a JSONL dataset with `question`, optional `context`, `gold_evidence_ids`, and `gold_resolution`.

Run:

```bash
cd backend
python -m scripts.evaluate --dataset ../evaluation/dataset.jsonl
```

For the competition, run the same dataset against five configurations: LLM-only, vector RAG, hybrid RAG, hybrid+semantic, and full ResolveIQ. Report retrieval, groundedness, resolution quality and agent productivity metrics.
