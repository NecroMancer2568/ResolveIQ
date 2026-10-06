import argparse, asyncio, json
from pathlib import Path
from app.ingestion.parsers import parse_file
from app.ingestion.chunker import chunk_text
from app.embeddings import embed_texts
from app.core.config import get_settings
async def main():
    p=argparse.ArgumentParser(); p.add_argument("--input",required=True); p.add_argument("--index",default=None); args=p.parse_args(); root=Path(args.input)
    records=[]
    for path in root.rglob("*"):
        if not path.is_file(): continue
        for page in parse_file(path):
            for i,ch in enumerate(chunk_text(page["text"])):
                records.append({"id":f"{path.stem}-{page['page']}-{i}","title":path.stem,"content":ch,"source_type":"PRODUCT_DOCUMENT","metadata":{"source_file":path.name,"page":page["page"],"authority":.85}})
    for r,e in zip(records,embed_texts([x["content"] for x in records])): r["embedding"]=e
    out=Path("artifacts/ingested.jsonl"); out.parent.mkdir(exist_ok=True); out.write_text("\n".join(json.dumps(r) for r in records),encoding="utf-8")
    s = get_settings()

    print(f"Embedding dimension: {len(records[0]['embedding']) if records else 0}")
    print(f"Retriever provider: {s.retriever_provider}")
    print(f"Azure Search endpoint: {s.azure_search_endpoint}")
    print(f"Azure Search index: {args.index or s.azure_search_index}")

    if s.retriever_provider == "azure" and s.azure_search_endpoint:
        from azure.core.credentials import AzureKeyCredential
        from azure.search.documents.aio import SearchClient

        async with SearchClient(
            s.azure_search_endpoint,
            args.index or s.azure_search_index,
            AzureKeyCredential(s.azure_search_api_key)
        ) as c:

            docs = []

            for r in records:
                m = r.pop("metadata")

                docs.append({
                    "id": r["id"],
                    "title": r["title"],
                    "content": r["content"],
                    "source_type": r["source_type"],
                    "embedding": r["embedding"],
                    **{
                        k: v
                        for k, v in m.items()
                        if k in {
                            "product",
                            "region",
                            "customer_segment",
                            "authority",
                            "updated_at",
                            "policy_key",
                            "policy_value"
                        }
                    }
                })

            result = await c.upload_documents(docs)

            print(f"Azure upload attempted for {len(docs)} documents")
            print(f"Azure upload results: {result}")

    else:
        print("Azure upload SKIPPED.")
        print("Set RETRIEVER_PROVIDER=azure to upload to Azure AI Search.")

    print(f"Processed {len(records)} chunks")
if __name__=="__main__": asyncio.run(main())
