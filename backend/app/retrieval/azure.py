from app.retrieval.base import Retriever, SearchHit
from app.core.config import get_settings


class AzureSearchRetriever(Retriever):

    def __init__(self):
        from azure.core.credentials import AzureKeyCredential
        from azure.search.documents.aio import SearchClient
        from app.embeddings import embed_texts

        s = get_settings()

        self.embed_texts = embed_texts

        self.client = SearchClient(
            s.azure_search_endpoint,
            s.azure_search_index,
            AzureKeyCredential(s.azure_search_api_key),
        )

        self.semantic_config = s.azure_search_semantic_config

    async def search(self, query, context, top_k=8):

        from azure.search.documents.models import VectorizedQuery

        vector = self.embed_texts([query])[0]

        # Azure recommends giving semantic ranker up to 50
        # candidates when semantic ranking is used.
        vq = VectorizedQuery(
            vector=vector,
            k_nearest_neighbors=50,
            fields="embedding",
        )

        kwargs = {
            "search_text": query,
            "vector_queries": [vq],
            "top": top_k,
            "select": [
                "id",
                "title",
                "content",
                "source_type",
                "product",
                "region",
                "customer_segment",
                "authority",
                "updated_at",
                "policy_key",
                "policy_value",
            ],
        }

        # IMPORTANT:
        # Do not hard-filter on product/region/customer_segment
        # because the current corpus does not populate those
        # fields consistently.
        #
        # Context is handled later by ResolveIQ's resolution
        # ranking layer instead.

        try:
            kwargs["query_type"] = "semantic"
            kwargs["semantic_configuration_name"] = self.semantic_config
        except Exception:
            pass

        results = await self.client.search(**kwargs)

        out = []

        async for r in results:

            meta = {
                k: r.get(k)
                for k in [
                    "product",
                    "region",
                    "customer_segment",
                    "authority",
                    "updated_at",
                    "policy_key",
                    "policy_value",
                ]
                if r.get(k) is not None
            }

            # Prefer semantic reranker score when available.
            score = r.get("@search.reranker_score")

            if score is None:
                score = r.get("@search.score", 0)

            out.append(
                SearchHit(
                    str(r["id"]),
                    r.get("title", r["id"]),
                    r.get("content", ""),
                    r.get("source_type", "FAQ"),
                    float(score),
                    meta,
                )
            )

        return out