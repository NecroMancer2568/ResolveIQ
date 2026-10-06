from dataclasses import dataclass, field

@dataclass
class SearchHit:
    id: str
    title: str
    content: str
    source_type: str
    score: float
    metadata: dict = field(default_factory=dict)

class Retriever:
    async def search(self, query: str, context: dict, top_k: int=8) -> list[SearchHit]:
        raise NotImplementedError
