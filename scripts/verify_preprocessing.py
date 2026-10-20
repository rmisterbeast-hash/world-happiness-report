"""Verify the Google Colab-compatible notebook by rerunning raw-data preparation.

This check uses the documented public mirrors, NOT an unverified Kaggle download.
It fails if source content changes enough to invalidate committed JSON data.
"""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
notebook = json.loads((root/"notebooks/preprocess_whr2024.ipynb").read_text(encoding="utf-8"))
code = "\n".join("".join(c["source"]) for c in notebook["cells"] if c.get("cell_type")=="code")
with tempfile.TemporaryDirectory() as temp:
    proc = subprocess.run([sys.executable, "-c", code], cwd=temp, text=True, capture_output=True, timeout=180)
    if proc.returncode != 0:
        print(proc.stdout)
        print(proc.stderr, file=sys.stderr)
        raise SystemExit(f"Notebook execution failed: {proc.returncode}")
    print(proc.stdout)
    for filename, field in [("countries.json","countries"),("happiness.json","records"),("ranking.json","years")]:
        actual=json.loads((Path(temp)/"data"/filename).read_text(encoding="utf-8"))
        committed=json.loads((root/"data"/filename).read_text(encoding="utf-8"))
        assert actual[field] == committed[field], f"{filename}: notebook produced different {field}"
        assert (Path(temp)/"data"/filename).stat().st_size < 3*1024*1024
        print(f"PASS: notebook reproduced {filename}")
    yrs=json.loads((Path(temp)/"data/happiness.json").read_text(encoding="utf-8"))["meta"]["years"]
    assert yrs == [2005,2023], f"Year metadata must be numeric: {yrs!r}"
print("SUCCESS: reproducible source-data processing checks passed.")
