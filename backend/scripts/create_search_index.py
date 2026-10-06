import asyncio
from app.core.config import get_settings
async def main():
    s=get_settings()
    if not s.azure_search_endpoint or not s.azure_search_api_key: raise SystemExit("Configure Azure Search credentials first.")
    from azure.core.credentials import AzureKeyCredential
    from azure.search.documents.indexes.aio import SearchIndexClient
    from azure.search.documents.indexes.models import SearchIndex, SimpleField, SearchableField, SearchField, SearchFieldDataType, VectorSearch, HnswAlgorithmConfiguration, VectorSearchProfile, SemanticConfiguration, SemanticPrioritizedFields, SemanticField, SemanticSearch
    fields=[SimpleField(name="id",type=SearchFieldDataType.String,key=True),SearchableField(name="title",type=SearchFieldDataType.String),SearchableField(name="content",type=SearchFieldDataType.String),SimpleField(name="source_type",type=SearchFieldDataType.String,filterable=True),SimpleField(name="product",type=SearchFieldDataType.String,filterable=True),SimpleField(name="region",type=SearchFieldDataType.String,filterable=True),SimpleField(name="customer_segment",type=SearchFieldDataType.String,filterable=True),SimpleField(name="authority",type=SearchFieldDataType.Double,filterable=True),SimpleField(name="updated_at",type=SearchFieldDataType.String,filterable=True),SimpleField(name="policy_key",type=SearchFieldDataType.String,filterable=True),SimpleField(name="policy_value",type=SearchFieldDataType.String,filterable=True),SearchField(name="embedding",type=SearchFieldDataType.Collection(SearchFieldDataType.Single),searchable=True,vector_search_dimensions=384,vector_search_profile_name="resolveiq-hnsw")]
    vs=VectorSearch(algorithms=[HnswAlgorithmConfiguration(name="resolveiq-hnsw-alg")],profiles=[VectorSearchProfile(name="resolveiq-hnsw",algorithm_configuration_name="resolveiq-hnsw-alg")])
    sem=SemanticSearch(configurations=[SemanticConfiguration(name=s.azure_search_semantic_config,prioritized_fields=SemanticPrioritizedFields(title_field=SemanticField(field_name="title"),content_fields=[SemanticField(field_name="content")]))])
    idx=SearchIndex(name=s.azure_search_index,fields=fields,vector_search=vs,semantic_search=sem)
    async with SearchIndexClient(s.azure_search_endpoint,AzureKeyCredential(s.azure_search_api_key)) as c: await c.create_or_update_index(idx)
    print("Created",s.azure_search_index)
if __name__=="__main__": asyncio.run(main())
