import argparse,json
from app.resolution.learner import train_lightgbm
p=argparse.ArgumentParser(); p.add_argument("--input",required=True); p.add_argument("--output",required=True); a=p.parse_args()
rows=[json.loads(x) for x in open(a.input,encoding="utf-8") if x.strip()]
print("trained:",train_lightgbm(rows,a.output))
