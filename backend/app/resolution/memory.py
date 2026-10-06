from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import Resolution
from app.embeddings import embed_texts, cosine

async def retrieve_resolution_memory(db: AsyncSession, problem: str, context: dict, limit: int=5):
    rows=(await db.execute(select(Resolution).order_by(Resolution.success_score.desc()).limit(200))).scalars().all()
    if not rows: return []
    q=embed_texts([problem])[0]
    ranked=[]
    for r in rows:
        sim=cosine(q,embed_texts([r.problem])[0])
        matches=sum(1 for k in ["product","region","customer_segment","issue"] if context.get(k) and r.context.get(k)==context.get(k))
        cm=matches/max(1,sum(1 for k in ["product","region","customer_segment","issue"] if context.get(k)))
        rank=.55*sim+.25*cm+.20*r.success_score
        ranked.append((rank,r))
    return [r for _,r in sorted(ranked,key=lambda x:x[0],reverse=True)[:limit]]
