"""Attempt independent verification against teacher's original Kaggle archive.

This script makes no changes to site data. It downloads the public Kaggle
dataset directly using kagglehub, compares it with the two public CSV mirrors
used by preprocess_whr2024.ipynb, then writes a reproducible JSON report.
A mismatch causes failure: only an exact match permits marking validation
complete. Kaggle access/website license are separate questions.
"""
from pathlib import Path
from urllib.request import urlopen,Request
from io import BytesIO
import hashlib,json,sys,re,os
import pandas as pd
import kagglehub

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"docs"/"audit"/"original-kaggle-comparison.json"
SOURCES={
 "snapshot":"https://raw.githubusercontent.com/A713158/World-Happiness-Analysis/main/Dataset_World_happiness_report_2024.csv",
 "annual":"https://raw.githubusercontent.com/JLateef/Japan-Analysis/main/World-happiness-report-updated_2024.csv"
}
def norm(s):
 return re.sub(r"\s+"," ",str(s)).strip().lower()
def read(raw):
 for enc in ["utf-8-sig","cp1252","latin-1"]:
  try:return pd.read_csv(BytesIO(raw),encoding=enc)
  except UnicodeDecodeError:continue
 raise ValueError("Cannot decode CSV")
def grab(url):
 req=Request(url,headers={"User-Agent":"Atlas-WHR-coursework/1.0"})
 with urlopen(req,timeout=50) as resp:return resp.read()
def sha(raw):return hashlib.sha256(raw).hexdigest()
def choose(files,kind):
 if kind=="snapshot":
  opts=[f for f in files if ("2024" in f.name.lower()) and not ("updated" in f.name.lower() or "2005" in f.name.lower())]
 else:opts=[f for f in files if "updated" in f.name.lower() or "2005" in f.name.lower()]
 if len(opts)!=1:raise ValueError(f"Cannot identify {kind} uniquely: {[f.name for f in files]}")
 return opts[0]
def match(a,b,kind):
 if kind=="snapshot":
  country_opts=["country name","country","country_name"]
  value_opts=["ladder score","ladder_score"]
 else:
  country_opts=["country name","country","country_name"]
  value_opts=["life ladder","life_ladder"]
 def col(df,names):
  for n in df.columns:
   if norm(n) in names:return n
  raise KeyError(f"Cannot find {names} from {list(df.columns)}")
 ca,cb=col(a,country_opts),col(b,country_opts)
 va,vb=col(a,value_opts),col(b,value_opts)
 ya=yb=None
 if kind=="annual": ya=col(a,["year"]);yb=col(b,["year"])
 def indexed(df,c,v,y):
  tab=df[[c,v]+([y] if y else [])].copy()
  keys=tab[c].astype(str).str.strip().str.lower()
  if y is not None:keys=keys+"|"+tab[y].astype(str).str.replace(".0","",regex=False)
  tab["key"]=keys;tab["value"]=pd.to_numeric(tab[v],errors="coerce")
  if tab["key"].duplicated().any():raise ValueError("Duplicate keys")
  return tab.set_index("key")["value"]
 aa=indexed(a,ca,va,ya);bb=indexed(b,cb,vb,yb)
 common=aa.index.intersection(bb.index)
 differences=[]
 for key in common:
  x,y=aa[key],bb[key]
  if pd.isna(x) and pd.isna(y):continue
  if pd.isna(x)!=pd.isna(y) or abs(float(x)-float(y))>0.0005:
   if len(differences)<50:differences.append([key,None if pd.isna(x) else float(x),None if pd.isna(y) else float(y)])
 return {"originalRows":len(a),"mirrorRows":len(b),"commonKeys":len(common),
         "originalOnly":int(len(aa)-len(common)),"mirrorOnly":int(len(bb)-len(common)),
         "scoreMismatchCountSample":len(differences),"firstDifferences":differences,
         "matching":len(aa)==len(bb)==len(common) and len(differences)==0}
def main():
  original_dir=Path(kagglehub.dataset_download("jainaru/world-happiness-report-2024-yearly-updated"))
  files=[p for p in original_dir.rglob("*.csv") if p.is_file()]
  print("Kaggle archive files:",[(x.name,x.stat().st_size) for x in files])
  report={"dataset":"jainaru/world-happiness-report-2024-yearly-updated","kaggleSourceFetched":True,"comparisons":{}}
  # The publisher's declared license label is metadata, not proof of all upstream rights.
  url="https://www.kaggle.com/api/v1/datasets/view/jainaru/world-happiness-report-2024-yearly-updated"
  try:
    metadata=json.loads(grab(url).decode("utf-8"))
    raw_license=metadata.get("licenseName") or metadata.get("license")
    declared=raw_license.get("name") if isinstance(raw_license,dict) else raw_license
    report["licenseMetadata"]={"sourceUrl":url,"label":declared,"verifiedFromKaggleAPI":True,
      "caution":"Uploader license metadata does not establish all upstream Gallup redistribution rights."}
    print("Kaggle assigned dataset license label:",declared)
  except Exception as exc:
    report["licenseMetadata"]={"sourceUrl":url,"verifiedFromKaggleAPI":False,"error":str(exc)[:300]}
    print("Kaggle license metadata not independently accessible:",type(exc).__name__)

  valid=True
  for kind in ("snapshot","annual"):
   f=choose(files,kind);raw=f.read_bytes()
   mirror=grab(SOURCES[kind])
   rr={"originalFilename":f.name,"originalBytes":len(raw),"originalSha256":sha(raw),
       "mirrorUrl":SOURCES[kind],"mirrorBytes":len(mirror),"mirrorSha256":sha(mirror),
       "byteIdentical":raw==mirror}
   rr["table"]=match(read(raw),read(mirror),kind)
   report["comparisons"][kind]=rr
   valid=valid and rr["table"]["matching"]
   print(kind,json.dumps(rr,ensure_ascii=False,indent=2)[:2500])
  OUT.parent.mkdir(parents=True,exist_ok=True)
  OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
  print("Comparison report:",OUT)
  if not valid:
    sys.exit("FAIL: original Kaggle scores/row keys differ from mirrors, do NOT mark validated")
  print("PASS: Kaggle original data keys and life scores match mirrors on both input files")
if __name__=="__main__":main()
