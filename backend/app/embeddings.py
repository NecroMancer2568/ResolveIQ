from functools import lru_cache
import numpy as np
from app.core.config import get_settings

@lru_cache
def get_embedder():
    settings = get_settings()
    if settings.embedding_provider == "local":
        try:
            from sentence_transformers import SentenceTransformer
            return SentenceTransformer(settings.embedding_model)
        except ImportError:
            return None
    return None

def embed_texts(texts: list[str]) -> list[list[float]]:
    model = get_embedder()
    if model is None:
        # deterministic fallback for environments without ML dependencies
        out=[]
        for text in texts:
            v=np.zeros(64, dtype=float)
            for i,ch in enumerate(text.lower().encode("utf-8")):
                v[i % 64] += (ch % 31) / 31
            n=np.linalg.norm(v) or 1
            out.append((v/n).tolist())
        return out
    return model.encode(texts, normalize_embeddings=True).tolist()

def cosine(a: list[float], b: list[float]) -> float:
    x=np.asarray(a); y=np.asarray(b)
    denom=np.linalg.norm(x)*np.linalg.norm(y)
    return float(np.dot(x,y)/denom) if denom else 0.0
