from pathlib import Path
import json

def build_examples(records):
    rows=[]
    for r in records:
        rows.append({"query":r["query"],"resolution_id":r["resolution_id"],"label":float(r.get("label",0)),"features":r.get("features",{})})
    return rows

def train_lightgbm(examples, output):
    if len(examples)<20: return False
    import pandas as pd
    import lightgbm as lgb
    feature_names=sorted({k for e in examples for k in e["features"]})
    X=pd.DataFrame([{k:e["features"].get(k,0) for k in feature_names} for e in examples])
    y=[e["label"] for e in examples]
    groups=[len(examples)]
    model=lgb.LGBMRanker(objective="lambdarank",n_estimators=100,learning_rate=.05,num_leaves=15)
    model.fit(X,y,group=groups)
    Path(output).parent.mkdir(parents=True,exist_ok=True); model.booster_.save_model(output)
    return True
