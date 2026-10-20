import {formatScore,reportCountryUrl} from "./data.js";

const SVG_NS="http://www.w3.org/2000/svg";
const thresholds=[
 {end:3,color:"#ca6a59"},
 {end:4,color:"#dd9775"},
 {end:5,color:"#e7bc84"},
 {end:6,color:"#c0d1b4"},
 {end:7,color:"#83b29c"},
 {end:Infinity,color:"#397f70"}
];

function colorFor(score){
 if(typeof score!=="number"||!Number.isFinite(score))return "#d7d9d3";
 return thresholds.find(bucket=>score<bucket.end).color;
}
function svgNode(tag,attrs={}){
 const el=document.createElementNS(SVG_NS,tag);
 for(const [name,value] of Object.entries(attrs))el.setAttribute(name,String(value));
 return el;
}
function el(tag,className,value){
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(value!==undefined)node.textContent=String(value);
 return node;
}
function setText(id,value){const node=document.getElementById(id);if(node)node.textContent=value;}

export async function initWorldMap(countries){
 const root=document.getElementById("world-map");
 if(!root)return;
 const svg=document.getElementById("world-map-svg");
 const layer=document.getElementById("world-map-regions");
 const places=document.getElementById("world-map-markers");
 const select=document.getElementById("map-country-select");
 const viewport=document.getElementById("world-map-viewport");
 const tooltip=document.getElementById("world-map-tooltip");
 const tipName=document.getElementById("world-map-tooltip-name");
 const tipValue=document.getElementById("world-map-tooltip-value");
 const link=document.getElementById("map-country-link");
 const byName=new Map(countries.map(c=>[c.name,c]));
 const elements=new Map();
 let active=null;
 const hideTooltip=()=>{tooltip.hidden=true;};

 const setActive=name=>{
  if(active&&elements.has(active))elements.get(active).classList.remove("world-map__country--selected");
  active=name;
  const country=byName.get(name);
  if(!country)return;
  const item=elements.get(name);
  if(item)item.classList.add("world-map__country--selected");
  setText("map-country-name",country.nameRu||country.name);
  setText("map-country-position","№ "+country.rank+" в рейтинге World Happiness Report 2024");
  setText("map-country-score",formatScore(country.score));
  setText("map-country-context","Регион: "+(country.regionRu||country.region)+". Опубликованная оценка жизни получена по многолетнему периоду 2021–2023; это не результат опроса только за 2024 год.");
  link.href=reportCountryUrl(country.name);
  link.removeAttribute("aria-disabled");
  select.value=country.name;
  // An explicit selection remains visible separately from a temporary hover.
  if(item&&viewport.scrollWidth>viewport.clientWidth){
   const rect=item.getBoundingClientRect(),box=viewport.getBoundingClientRect();
   if(rect.right<box.left+16||rect.left>box.right-16){
    viewport.scrollLeft+=rect.left+rect.width/2-(box.left+box.width/2);
   }
  }
 };
 function showTooltip(country,fallbackName,e){
  tipName.textContent=country?.nameRu||fallbackName;
  tipValue.textContent=country
   ?"Оценка жизни: "+formatScore(country.score)+" / 10 · место "+country.rank
   :"Нет данных в рейтинге 2024";
  tooltip.hidden=false;
  const bounds=e?.clientX!==undefined?{x:e.clientX,y:e.clientY}:(document.activeElement?.getBoundingClientRect?(()=>{
   const r=document.activeElement.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};
  })():{x:20,y:20});
  const width=tooltip.offsetWidth||220,height=tooltip.offsetHeight||72;
  tooltip.style.left=Math.max(8,Math.min(bounds.x+15,window.innerWidth-width-8))+"px";
  tooltip.style.top=Math.max(8,Math.min(bounds.y+15,window.innerHeight-height-8))+"px";
 }
 const addRegion=(node,key,name)=>{
  const country=byName.get(key);
  node.dataset.country=key||"";
  if(country){
   node.dataset.score=String(country.score);
   node.style.fill=colorFor(country.score);
   node.classList.add("world-map__country--measured");
   node.setAttribute("role","button");
   node.setAttribute("tabindex","0");
   node.setAttribute("aria-label",(country.nameRu||country.name)+", "+formatScore(country.score)+" из 10; показать сведения о стране");
   elements.set(key,node);
  }else{
   node.style.fill=colorFor(null);
   node.classList.add("world-map__country--no-data");
   node.setAttribute("aria-hidden","true");
  }
  node.addEventListener("pointerenter",e=>showTooltip(country,name,e));
  node.addEventListener("pointermove",e=>{if(!tooltip.hidden)showTooltip(country,name,e);});
  node.addEventListener("pointerleave",hideTooltip);
  if(country){
   node.addEventListener("focus",e=>showTooltip(country,name,e));
   node.addEventListener("blur",hideTooltip);
   node.addEventListener("click",()=>{setActive(country.name);hideTooltip();});
   node.addEventListener("keydown",e=>{
    if(e.key==="Enter"||e.key===" "){e.preventDefault();setActive(country.name);hideTooltip();}
   });
  }
 };

 try{
  const response=await fetch("./data/world-map.json",{cache:"force-cache"});
  if(!response.ok)throw Error("HTTP "+response.status);
  const map=await response.json();
  if(!Array.isArray(map.features)||!Array.isArray(map.markers))throw Error("Некорректная геометрия");
  const coverage=new Set([...map.features.map(x=>x.key),...map.markers.map(x=>x.key)].filter(Boolean));
  const unmatched=countries.filter(c=>!coverage.has(c.name));
  if(unmatched.length)throw Error("Нет геометрии для "+unmatched.length+" стран");
  svg.setAttribute("viewBox",map.viewBox);
  const frame=document.createDocumentFragment();
  for(const feature of map.features){
   const path=svgNode("path",{d:feature.d,"fill-rule":"evenodd"});
   path.classList.add("world-map__country");
   addRegion(path,feature.key,feature.name);
   frame.append(path);
  }
  layer.append(frame);

  const markerFragment=document.createDocumentFragment();
  for(const point of map.markers){
   const group=svgNode("g",{transform:"translate("+point.x+" "+point.y+")"});
   group.classList.add("world-map__country","world-map__marker");
   const hit=svgNode("circle",{r:10,fill:"transparent"});
   const dot=svgNode("circle",{r:5.1,class:"world-map__marker-dot"});
   const ring=svgNode("circle",{r:8.5,class:"world-map__marker-ring"});
   // Decoration circles are not separate controls: the group handles focus and events.
   group.append(hit,ring,dot);
   addRegion(group,point.key,byName.get(point.key)?.nameRu||point.key);
   dot.style.fill=colorFor(byName.get(point.key)?.score);
   markerFragment.append(group);
  }
  places.append(markerFragment);
  const options=document.createDocumentFragment();
  for(const country of [...countries].sort((a,b)=>(a.nameRu||a.name).localeCompare(b.nameRu||b.name,"ru"))){
   const option=el("option",null,country.nameRu||country.name);
   option.value=country.name;
   options.append(option);
  }
  select.append(options);
  select.addEventListener("change",()=>{
   if(byName.has(select.value))setActive(select.value);
  });
  viewport.addEventListener("scroll",hideTooltip,{passive:true});
  window.addEventListener("scroll",hideTooltip,{passive:true});
  const first=byName.has("Finland")?"Finland":countries[0]?.name;
  if(first)setActive(first);
  setText("map-status",coverage.size+" стран и территорий с оценками. Серый цвет — нет данных. Небольшие страны обозначены точками.");
 }catch(error){
  console.error("World happiness map:",error);
  setText("map-status","Не удалось загрузить карту. Оценки стран по-прежнему доступны в каталоге.");
  root.classList.add("world-map--error");
 }
}
