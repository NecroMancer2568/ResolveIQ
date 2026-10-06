import argparse,json
from app.embeddings import embed_texts
p=argparse.ArgumentParser(); p.add_argument("--input",required=True); p.add_argument("--output",required=True); a=p.parse_args()
rows=[json.loads(x) for x in open(a.input,encoding="utf-8") if x.strip()]
if not rows: json.dump([],open(a.output,"w")); raise SystemExit
from sklearn.cluster import DBSCAN
X=embed_texts([r["question"] for r in rows]); labels=DBSCAN(eps=.35,min_samples=2,metric="cosine").fit_predict(X)
out=[]
for lab in sorted(set(labels)):
    members=[r for r,l in zip(rows,labels) if l==lab]
    if lab==-1: continue
    out.append({"cluster_id":str(lab),"count":len(members),"examples":[r["question"] for r in members[:5]]})
json.dump(out,open(a.output,"w"),indent=2)
