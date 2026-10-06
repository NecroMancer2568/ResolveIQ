import re

def normalize(text: str) -> str:
    text=re.sub(r"\s+", " ", text).strip()
    return text

def chunk_text(text: str, target_tokens: int=450, overlap_tokens: int=60) -> list[str]:
    text=normalize(text)
    if not text: return []
    words=text.split()
    step=max(1,target_tokens-overlap_tokens)
    chunks=[]
    for start in range(0,len(words),step):
        part=words[start:start+target_tokens]
        if not part: break
        chunks.append(" ".join(part))
        if start+target_tokens>=len(words): break
    return chunks
