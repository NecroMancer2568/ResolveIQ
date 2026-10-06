from datetime import datetime, timezone

def freshness(updated_at) -> float:
    if not updated_at: return 0.5
    try:
        dt=datetime.fromisoformat(str(updated_at).replace("Z","+00:00")); days=max(0,(datetime.now(timezone.utc)-dt).days)
        return max(0.0, min(1.0, 1/(1+days/365)))
    except Exception: return 0.5

def context_match(query_context: dict, metadata: dict) -> float:
    fields=["product","region","customer_segment","issue"]
    vals=[1 for f in fields if query_context.get(f) and metadata.get(f) and str(query_context[f]).lower()==str(metadata[f]).lower()]
    specified=sum(1 for f in fields if query_context.get(f))
    return sum(vals) / specified if specified else 0.5

def authority(meta: dict) -> float:
    if meta.get("authority") is not None: return float(meta["authority"])
    return {"POLICY":1.0,"FAQ":0.9,"PRODUCT_DOCUMENT":0.85,"HISTORICAL_RESOLUTION":0.75,"AGENT_RESPONSE":0.6}.get(meta.get("source_type"),0.5)

def score(hit, query_context, success=0.5):
    cm=context_match(query_context,hit.metadata)
    au=authority(hit.metadata)
    fr=freshness(hit.metadata.get("updated_at"))
    sem=max(0.0,min(1.0,hit.score))
    return .35*sem+.20*cm+.20*success+.15*au+.10*fr, cm, au, fr
