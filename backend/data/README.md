# ResolveIQ Standalone Demo Data

This bundle contains a fictional NovaMart support knowledge base and 50 human-approved historical resolutions.

## Install

Copy `sources/*` into:

`backend/data/sources/`

Copy `historical_resolutions.jsonl` into:

`backend/data/`

## Source corpus

Six policy/FAQ documents cover refunds, shipping, payments, accounts, subscriptions, and warranties.

## Historical resolutions

`historical_resolutions.jsonl` contains 50 structured examples with:
- customer question
- context
- successful resolution
- outcome
- human approval
- edit signal
- source document
- resolution tags

These are synthetic competition-demo data, not real customer records.

## Suggested flow

1. Create the Azure AI Search index.
2. Ingest `backend/data/sources/`.
3. Seed/import historical resolutions into Resolution Memory.
4. Run the evaluation set.
5. Demonstrate retrieval + resolution ranking + evidence arbitration + human review.
