from app.resolution.arbitration import arbitrate
from app.retrieval.base import SearchHit

def test_conflict_prefers_authority():
    hits=[SearchHit("a","A","refund","POLICY",.9,{"policy_key":"refund","policy_value":"30","authority":1.0,"updated_at":"2026-01-01T00:00:00+00:00"}),SearchHit("b","B","refund","FAQ",.95,{"policy_key":"refund","policy_value":"14","authority":.5,"updated_at":"2026-01-01T00:00:00+00:00"})]
    out=arbitrate(hits,{})
    assert out.conflicts and out.evidence[0].id=="a"

def test_empty_abstains():
    out=arbitrate([],{}); assert out.decision=="ABSTAIN"
