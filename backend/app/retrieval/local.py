from collections import Counter
import re
from app.embeddings import embed_texts, cosine
from app.retrieval.base import Retriever, SearchHit

class LocalHybridRetriever(Retriever):
    def __init__(self, documents: list[dict]):
        self.documents=documents
        self.embeddings=embed_texts([d["content"] for d in documents])

    @staticmethod
    def tokens(s): return re.findall(r"[a-z0-9_]+", s.lower())

    def bm25_like(self, query, doc):
        q=set(self.tokens(query)); d=self.tokens(doc["content"])
        if not q: return 0.0
        c=Counter(d); return sum((1 if t in c else 0)*min(1+c[t]/10,2) for t in q)/len(q)

    async def search(self, query, context, top_k=8):
        qv=embed_texts([query])[0]
        lexical=[self.bm25_like(query,d) for d in self.documents]
        dense=[cosine(qv,e) for e in self.embeddings]
        # RRF-like fusion of normalized lexical and dense ranks.
        lr=sorted(range(len(self.documents)), key=lambda i: lexical[i], reverse=True)
        dr=sorted(range(len(self.documents)), key=lambda i: dense[i], reverse=True)
        scores={}
        for rank,i in enumerate(lr): scores[i]=scores.get(i,0)+1/(60+rank+1)
        for rank,i in enumerate(dr): scores[i]=scores.get(i,0)+1/(60+rank+1)
        ranked=sorted(scores,key=scores.get,reverse=True)[:top_k]
        return [SearchHit(self.documents[i]["id"],self.documents[i]["title"],self.documents[i]["content"],self.documents[i].get("source_type","FAQ"),float(scores[i]),self.documents[i].get("metadata",{})) for i in ranked]
