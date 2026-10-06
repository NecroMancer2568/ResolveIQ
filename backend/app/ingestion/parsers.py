from pathlib import Path
import csv, json
from pypdf import PdfReader
from docx import Document

def parse_file(path: Path) -> list[dict]:
    ext=path.suffix.lower()
    if ext == ".pdf":
        reader=PdfReader(str(path)); return [{"text": p.extract_text() or "", "page": i+1} for i,p in enumerate(reader.pages)]
    if ext == ".docx":
        doc=Document(str(path)); return [{"text":"\n".join(p.text for p in doc.paragraphs),"page":1}]
    if ext in {".txt", ".md"}:
        return [{"text":path.read_text(encoding="utf-8", errors="replace"),"page":1}]
    if ext == ".json":
        obj=json.loads(path.read_text(encoding="utf-8")); return [{"text":json.dumps(obj, ensure_ascii=False),"page":1}]
    if ext == ".jsonl":
        rows=[json.loads(x) for x in path.read_text(encoding="utf-8").splitlines() if x.strip()]
        return [{"text":json.dumps(x,ensure_ascii=False),"page":i+1} for i,x in enumerate(rows)]
    if ext == ".csv":
        with path.open(encoding="utf-8", newline="") as f: rows=list(csv.DictReader(f))
        return [{"text":json.dumps(x,ensure_ascii=False),"page":i+1} for i,x in enumerate(rows)]
    raise ValueError(f"Unsupported file type: {ext}")
