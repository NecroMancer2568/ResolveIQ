import json
from pathlib import Path
from app.core.config import get_settings
from app.retrieval.local import LocalHybridRetriever

def load_local():
    path=Path(__file__).parents[2]/"data"/"knowledge.jsonl"
    docs=[json.loads(x) for x in path.read_text(encoding="utf-8").splitlines() if x.strip()]
    return LocalHybridRetriever(docs)

def get_retriever():
    s=get_settings()
    if s.retriever_provider=="azure" and s.azure_search_endpoint and s.azure_search_api_key:
        from app.retrieval.azure import AzureSearchRetriever
        return AzureSearchRetriever()
    return load_local()
