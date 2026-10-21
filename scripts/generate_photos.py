"""Build licensed city photography WebP assets for the WHR coursework.
Sources are pinned Wikimedia Commons File pages, authors and CC BY-SA 4.0.
This script only downloads these three documented files, not arbitrary images.
WebP resize/re-encoding is a CC BY-SA licensed adaptation. Reproduction license
details are recorded in docs/image-credits.md.
"""
from pathlib import Path
from PIL import Image,ImageOps
from urllib.request import Request,urlopen
from urllib.parse import urlencode
from io import BytesIO
import json,time
ROOT=Path(__file__).resolve().parents[1]
SOURCES=[{"stem":"city-helsinki","commons":"Skyline_of_Helsinki_seen_from_Hotel_Torni.jpg"},{"stem":"city-tokyo","commons":"Tokyo_Street.jpg"},{"stem":"city-paris","commons":"City_Street_in_Paris,_France_2.jpg"}]
HEADERS={"User-Agent":"AtlasBlagopoluchiya-Coursework/1.0 (CC-BY-SA image attribution; student project)"}
def get(url):
    last=None
    for trial in range(4):
        try:
            with urlopen(Request(url,headers=HEADERS),timeout=35) as fp:
                content=fp.read()
            return content
        except Exception as exc:
            last=exc
            time.sleep(2*(trial+1))
    raise RuntimeError(f"Failed download {url}: {last}")
IMAGES=ROOT/"images"
IMAGES.mkdir(exist_ok=True)
for spec in SOURCES:
    params=urlencode({"action":"query","format":"json","prop":"imageinfo",
        "iiprop":"url","iiurlwidth":"1600","titles":"File:"+spec["commons"]})
    query="https://commons.wikimedia.org/w/api.php?"+params
    meta=json.loads(get(query))
    pages=meta["query"]["pages"]
    item=next(iter(pages.values()))
    ii=item.get("imageinfo",[])
    if not ii:
        raise RuntimeError("Commons did not return image information for "+spec["commons"])
    url=ii[0].get("thumburl") or ii[0]["url"]
    image=Image.open(BytesIO(get(url))).convert("RGB")
    image=ImageOps.exif_transpose(image)
    for width in [640,1200]:
        copy=image.copy()
        copy.thumbnail((width,760),Image.Resampling.LANCZOS)
        path=IMAGES/(spec["stem"]+f"-{width}.webp")
        copy.save(path,format="WEBP",quality=81,method=6)
        if path.stat().st_size==0:
            raise RuntimeError("Empty output: "+str(path))
        print(path.relative_to(ROOT),copy.size,path.stat().st_size)
