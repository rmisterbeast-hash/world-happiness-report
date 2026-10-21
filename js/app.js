import {loadData, factorLabels, factorDetails, formatScore, reportCountryUrl, countryLabel, countryAnnualRows, getFactorRange, normalizeContribution} from "./data.js";
import {$, text, make, makeLink, emptyInto, setStatus, initModal, initNavigation, countryCard} from "./ui.js";
import {initWorldMap} from "./world-map.js?v=crimea-ukraine-20261020-v2";
initNavigation();initModal();
const page=location.pathname.split("/").pop()||"index.html";
const palette=["#C15C44","#3D405B","#2C7E66","#AF8C3A","#8070B0","#1B7992"];
const chartInstances=new Map();
let chartModule=null;
async function draw(canvasId,config){
 const element=document.getElementById(canvasId);if(!element)return;
 try {
   if(!chartModule)chartModule=import("https://cdn.jsdelivr.net/npm/chart.js@4.4.7/auto/+esm").then(m=>m.default).catch(e=>{chartModule=null;throw e;});
   const Chart=await chartModule;
   chartInstances.get(canvasId)?.destroy();
   chartInstances.set(canvasId,new Chart(element,config));
 } catch(e){element.replaceWith(make("p","empty-state","График не удалось загрузить. Проверьте интернет-соединение и доступность Chart.js."));console.error("Chart.js:",e);}
}
const axisDefaults={grid:{color:"#E9E8E2"},ticks:{color:"#3D405B"}};
function chartConfig(type,datasets,labels=[],opts={}){
 return {type,data:{labels,datasets},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"nearest",intersect:false},plugins:{legend:{labels:{color:"#3D405B",usePointStyle:true}}},scales:{x:{...axisDefaults},y:{...axisDefaults,beginAtZero:false,min:opts.yMin??undefined,max:opts.yMax??undefined}}}};
}
function fillSelect(select,arr,placeholder=null){
 if(!select)return;const old=select.value;select.replaceChildren();
 if(placeholder!==null){const op=make("option",null,placeholder);op.value="";select.append(op);}
 for(const c of arr){const opt=make("option",null,c.nameRu||c.name);opt.value=c.name;select.append(opt);}
 if([...select.options].some(o=>o.value===old))select.value=old;
}
function introError(id,e){setStatus(id,"Не удалось получить данные: "+e.message,true);console.error(e);}
async function renderIndex(){
 try{
 const [data,ranking]=await Promise.all([loadData("countries"),loadData("ranking")]);
 const names=Object.fromEntries(data.countries.map(x=>[x.name,x.nameRu]));
 const years=Object.keys(ranking.years).map(Number).sort((a,b)=>b-a);
 const select=$("#year-select");for(const y of years){const opt=make("option",null,y===2024?"2024 — опубликованный рейтинг":String(y)+" — годовые данные");opt.value=y;select.append(opt);}
 select.value="2024";
 const leader=ranking.years["2024"]?.entries?.[0];
 const leaderData=data.countries.find(c=>c.name===leader?.name);
 if(leader && leaderData){
  text("#hero-leader-name",leaderData.nameRu||leaderData.name);
  text("#hero-leader-score",formatScore(leader.score));
 }
 function drawRanking(){
 const r=ranking.years[select.value];if(!r)return;
 $("#ranking-top").replaceChildren();$("#ranking-bottom").replaceChildren();
 const top=r.entries.slice(0,5),bottom=r.entries.slice(-5).reverse();
 function row(item){const li=make("li");const a=makeLink(reportCountryUrl(item.name),names[item.name]||item.name);const val=make("strong",null,formatScore(item.score));li.append(a,val);return li;}
 top.forEach(x=>$("#ranking-top").append(row(x)));
 bottom.forEach(x=>$("#ranking-bottom").append(row(x)));
 text("#ranking-count",r.label+" · Стран в наблюдении: "+r.count);
 const alert=$("#ranking-warning");
 const limited=r.kind==="annual-recomputed"&&r.count<50;
 alert.hidden=!limited;
 alert.textContent=limited
  ?"Внимание: в "+r.year+" году доступны оценки только "+r.count+" стран. Небольшой охват делает такой пересчитанный рейтинг неполным: отсутствие страны в списке не означает низкий показатель."
  :"";
 setStatus("ranking-status",r.kind==="published-report"?"Опубликованное значение: многолетнее среднее по отчёту 2024.":"Исторический рейтинг пересчитан по годовому показателю, не является опубликованным рейтингом WHR.");
 }
 select.addEventListener("change",drawRanking);drawRanking();
 void initWorldMap(data.countries);
 }catch(e){introError("ranking-status",e);}
}
async function renderCatalog(){
 try{
 const {countries}=await loadData("countries"), regions=[...new Set(countries.map(c=>c.region))].sort();
 const select=$("#region-select"),search=$("#search-input"),heroSearch=$("#hero-country-search"),sort=$("#sort-select"),grid=$("#countries-grid"),pages=$("#pagination");
 regions.forEach(region=>{const op=make("option",null,countries.find(c=>c.region===region)?.regionRu||region);op.value=region;select.append(op);});
 let current=1;
 function render(){
  const s=search.value.trim().toLocaleLowerCase("ru"),region=select.value;
  let all=countries.filter(c=>(!region||c.region===region)&&(!s||((c.nameRu||"")+" "+c.name).toLocaleLowerCase("ru").includes(s)));
  const mode=sort.value;
  all.sort(mode==="score-asc"?(a,b)=>a.score-b.score:mode==="score-desc"?(a,b)=>b.score-a.score:mode==="name"?(a,b)=>(a.nameRu||a.name).localeCompare(b.nameRu||b.name,"ru"):(a,b)=>a.rank-b.rank);
  const maxPage=Math.max(1,Math.ceil(all.length/12));current=Math.min(current,maxPage);
  grid.replaceChildren();all.slice((current-1)*12,current*12).forEach(c=>grid.append(countryCard(c,reportCountryUrl(c.name))));
  if(!all.length)grid.append(make("p","empty-state","По заданным условиям страны не найдены. Попробуйте изменить поиск или регион."));
  setStatus("catalog-status","Показано "+all.length+" из "+countries.length+" стран отчёта 2024 года.");
  pages.replaceChildren();
  if(maxPage>1){const btn=(label,to,disabled=false,active=false)=>{const b=make("button",null,label);b.type="button";b.disabled=disabled;if(active)b.setAttribute("aria-current","page");b.addEventListener("click",()=>{current=to;render();grid.scrollIntoView({block:"start",behavior:"smooth"});});return b;};
   pages.append(btn("←",Math.max(1,current-1),current===1));
   for(let i=1;i<=maxPage;i++) if(i===1||i===maxPage||Math.abs(i-current)<=1)pages.append(btn(String(i),i,false,i===current));
   pages.append(btn("→",Math.min(maxPage,current+1),current===maxPage));
  }
 }
 [search,select,sort].forEach(el=>el.addEventListener(el===search?"input":"change",()=>{if(el===search&&heroSearch)heroSearch.value=search.value;current=1;render();}));
 if(heroSearch)heroSearch.addEventListener("input",()=>{search.value=heroSearch.value;current=1;render();});
 render();
 }catch(e){introError("catalog-status",e);}
}
function favoritesRead(){try{return JSON.parse(localStorage.getItem("whr-favorites")||"[]").filter(x=>typeof x==="string").slice(0,5);}catch{return [];}}
function favoritesWrite(arr){try{localStorage.setItem("whr-favorites",JSON.stringify(arr));return true;}catch{return false;}}
function renderBar(container, label,value,range){
 const row=make("div","factor-row"),name=make("strong",null,label),track=make("div","factor-track"),fill=make("div","factor-fill");
 const pct=normalizeContribution(value,range);fill.style.width=(pct===null?0:pct*100)+"%";
 track.append(fill);const amount=make("span",null,formatScore(value));row.append(name,track,amount);container.append(row);
}
async function renderCountry(){
 try{
 const [{countries},annual]=await Promise.all([loadData("countries"),loadData("happiness")]);
 const name=new URLSearchParams(location.search).get("name");
 if(!name){setStatus("country-status","Не указана страна в адресе. Выберите страну в каталоге.",true);return;}
 const country=countries.find(c=>c.name===name);
 const rows=countryAnnualRows(name,annual.records);
 if(!country&&!rows.length){setStatus("country-status","Страна не найдена в выбранном наборе. Откройте каталог.",true);return;}
 text("#country-title",country?.nameRu||name);document.title=(country?.nameRu||name)+" — Атлас благополучия";
 text("#country-subtitle","Отчёт 2024 и годовые наблюдения "+(rows.length?rows[0].year+"–"+rows.at(-1).year:"не представлены")+"; показатели рассчитываются по разным методикам.");
 text("#country-score",formatScore(country?.score));text("#country-rank",country?.rank?"№ "+country.rank:"нет данных");
 text("#country-hero-score",formatScore(country?.score));text("#country-hero-rank",country?.rank?"№ "+country.rank:"нет данных");
 setStatus("country-status",country?"Показаны опубликованный срез и отдельно годовой ряд.":"Страна доступна в истории, но отсутствует в рейтинге 2024.");
 if(rows.length){
  const years=[...new Set(rows.map(x=>x.year))].sort((a,b)=>a-b);
  const lookup=new Map(rows.map(x=>[x.year,x.score]));
  const scores=years.map(y=>lookup.get(y));
  const config=chartConfig("line",[{label:"Годовая оценка жизни",data:scores,borderColor:palette[0],backgroundColor:palette[0]+"33",pointRadius:3,tension:.22,spanGaps:false}],years,{yMin:0,yMax:10});
  draw("history-chart",config);
  const valid=rows.filter(r=>typeof r.score==="number");
  if(valid.length>=2){const first=valid[0],last=valid.at(-1);const delta=last.score-first.score;
  text("#history-note",`В ${first.year} году годовая оценка жизни составляла ${formatScore(first.score)}, а в ${last.year} году — ${formatScore(last.score)} по шкале от 0 до 10. Изменение между доступными крайними точками: ${delta>=0?"+":""}${formatScore(delta)} балла. Этот результат относится только к представленному ряду годовых наблюдений и не объясняет причин изменения. Срез рейтинга 2024 намеренно не добавлен в график.`);}
  else text("#history-note",`По стране «${country?.nameRu||name}» доступно только одно годовое наблюдение с числовой оценкой жизни. Его можно показать на временной оси, однако вычислить изменение за период по одной точке нельзя. Отсутствующие наблюдения не заменяются нулём и не используются для предполагаемого тренда. Показатель опубликованного рейтинга 2024 года имеет другую методику и не подставляется в исторический ряд. Для сравнения рекомендуется выбрать страны с более полными наблюдениями.`);
 } else text("#history-note",`По стране «${country?.nameRu||name}» в выбранном историческом наборе нет годовых наблюдений. Поэтому линия динамики не формируется, а пропуски не подменяются нулевыми значениями. Если страна включена в опубликованный рейтинг 2024 года, её оценку можно изучить отдельно, но нельзя считать её наблюдением за отдельный 2024 год. Отсутствие временного ряда не свидетельствует ни об улучшении, ни об ухудшении благополучия. Для временного сравнения следует выбрать страну с доступными годовыми оценками.`);
 const bars=$("#factor-scales");bars.replaceChildren();
 for(const [key,label] of Object.entries(factorLabels))renderBar(bars,label,country?.contributions?.[key],getFactorRange(countries,key));
 text("#country-description",country?
 `В отчёте 2024 года ${country.nameRu} занимает ${country.rank}-е место среди ${countries.length} стран, а опубликованная оценка жизни составляет ${formatScore(country.score)} балла по шкале от 0 до 10. Эта величина относится к многолетнему периоду расчёта отчёта. Шкалы факторов показывают вклады в объясняющую модель, а не исходные показатели в денежных единицах или годах. Годовые точки на соседнем графике отображают самостоятельные наблюдения, поэтому их нельзя механически приравнивать к отчётному рейтингу. Наличие статистической связи между двумя величинами само по себе не устанавливает причинность.`:
 "Страна представлена в исторических наблюдениях, но отсутствует в опубликованном срезе 2024 года. Поэтому оценка 2024 и шкалы факторов не отображаются как числовые нули.");
 const nearby=$("#nearby-countries");if(country){const idx=countries.findIndex(c=>c.name===name);const neighbours=countries.slice(Math.max(0,idx-1),idx+3).filter(c=>c.name!==name).slice(0,3);neighbours.forEach(c=>nearby.append(countryCard(c,reportCountryUrl(c.name))));}
 const button=$("#favorite-button");function drawFav(){const selected=favoritesRead().includes(name);button.textContent=selected?"★ Удалить из избранного":"☆ Добавить в избранное";button.setAttribute("aria-pressed",String(selected));}
 button.addEventListener("click",()=>{const arr=favoritesRead();const has=arr.includes(name);if(!has&&arr.length>=5){alert("Можно сохранить не более пяти стран. Удалите одну из избранного.");return;}
 const updated=has?arr.filter(x=>x!==name):[...arr,name];if(!favoritesWrite(updated))alert("Браузер запретил сохранение данных.");drawFav();});drawFav();
 }catch(e){introError("country-status",e);}
}
async function renderCompare(){
 try{
 const [d,h]=await Promise.all([loadData("countries"),loadData("happiness")]);
 const countries=d.countries,selects=[$("#compare-one"),$("#compare-two"),$("#compare-three")];
 selects.forEach((el,i)=>{fillSelect(el,countries,i===2?"Не выбирать третью страну":null);});
 selects[0].value="Finland";selects[1].value="Moldova";selects[2].value="";
 const keys=Object.keys(factorLabels);
 function render(){
  const chosen=selects.map(el=>el.value).filter(Boolean);
  if(new Set(chosen).size!==chosen.length){setStatus("compare-status","Выберите разные страны для сравнения.",true);$("#compare-table").replaceChildren();text("#compare-summary","В сравнении обнаружены повторяющиеся страны. График и сводные значения не используются для вывода до выбора разных государств. Измените повторяющийся пункт: одно и то же государство не может считаться двумя независимыми объектами сравнения. После выбора разных стран будет построена годовая динамика, а отдельно — таблица вкладов факторов за 2024 год. Пока различия между странами не вычисляются и не интерпретируются.");chartInstances.get("compare-chart")?.destroy();chartInstances.delete("compare-chart");return;}
  setStatus("compare-status","Сравниваются "+chosen.map(n=>countryLabel(n,countries)).join(", ")+".");
  const years=[...new Set(h.records.map(r=>r.year))].sort((a,b)=>a-b);
  const datasets=chosen.map((name,i)=>{const m=new Map(countryAnnualRows(name,h.records).map(x=>[x.year,x.score]));return {label:countryLabel(name,countries),data:years.map(y=>m.get(y)??null),borderColor:palette[i],backgroundColor:palette[i],tension:.18,pointRadius:2,spanGaps:false};});
  draw("compare-chart",chartConfig("line",datasets,years,{yMin:0,yMax:10}));
  const table=$("#compare-table");table.replaceChildren();const head=make("thead"),hr=make("tr");hr.append(make("th",null,"Показатель (вклад 2024)"));chosen.forEach(n=>hr.append(make("th",null,countryLabel(n,countries))));head.append(hr);table.append(head);
  const body=make("tbody");for(const key of keys){const tr=make("tr");tr.append(make("th",null,factorLabels[key]));chosen.forEach(n=>{const td=make("td",null,formatScore(countries.find(c=>c.name===n)?.contributions[key]));td.dataset.label=countryLabel(n,countries);tr.append(td);});body.append(tr);}table.append(body);
  const links=$("#compare-links");links.replaceChildren();
  chosen.forEach(n=>links.append(makeLink(reportCountryUrl(n),"Карточка: "+countryLabel(n,countries)+" ↗","button button--small button--outline")));
  const items=chosen.map(n=>countries.find(c=>c.name===n)).filter(Boolean).sort((a,b)=>b.score-a.score);
  if(items.length>=2){const hi=items[0],low=items.at(-1),diff=hi.score-low.score;
   text("#compare-summary",`Среди выбранных стран в опубликованном рейтинге 2024 года более высокая оценка жизни зафиксирована у страны «${hi.nameRu}»: ${formatScore(hi.score)} балла. Для страны «${low.nameRu}» она составляет ${formatScore(low.score)} балла. Разница равна ${formatScore(diff)} балла по шкале от 0 до 10. График выше описывает отдельные годовые наблюдения и не включает значение отчёта 2024. Приведённое сопоставление носит описательный характер и не объясняет причин различий.`);}
 }
 selects.forEach(el=>el.addEventListener("change",render));render();
 }catch(e){introError("compare-status",e);}
}
async function renderFactors(){
 try{
 const {countries}=await loadData("countries");const all=countries;
 const select=$("#factor-select");
 function scatter(){
  const key=select.value;const points=all.filter(c=>typeof c.contributions?.[key]==="number"&&typeof c.score==="number").map(c=>({x:c.contributions[key],y:c.score,label:c.nameRu||c.name}));
  const config=chartConfig("scatter",[{label:factorLabels[key]+" (вклад в баллах)",data:points,backgroundColor:palette[0],pointRadius:4,pointHoverRadius:6}],[],{yMin:0,yMax:10});
  config.options.plugins.tooltip={callbacks:{label:ctx=>ctx.raw.label+": вклад "+formatScore(ctx.raw.x)+", оценка "+formatScore(ctx.raw.y)}};
  chartInstances.get("factor-scatter")?.destroy();draw("factor-scatter",config);
  if(points.length<2){
   text("#factor-summary",`Для фактора «${factorLabels[key]}» доступно ${points.length} сопоставимых наблюдений. Этого недостаточно, чтобы анализировать взаимосвязь двух величин или делать вывод о её направлении. Отсутствующие показатели исключены из построения; их не заменяют нулями. Даже если отдельная точка показана, она описывает только соответствующую страну в отчётном срезе 2024 года. Для содержательного сравнения следует выбрать другой фактор с достаточным числом наблюдений. Сведения о методике приведены в разделе «О данных».`);
   return;
  }
  const hi=[...points].sort((a,b)=>b.y-a.y)[0],lo=[...points].sort((a,b)=>a.y-b.y)[0];
  text("#factor-summary",`Выбран фактор «${factorLabels[key]}». На диаграмме представлено ${points.length} стран отчёта 2024. Например, ${hi.label} имеет оценку жизни ${formatScore(hi.y)} и вклад фактора ${formatScore(hi.x)}, тогда как ${lo.label} — ${formatScore(lo.y)} и ${formatScore(lo.x)} соответственно. Каждая точка отражает пару значений из одного отчётного среза; возможная статистическая связь не является доказательством причинности.`);
 }
 select.addEventListener("change",scatter);scatter();
 const countrySelect=$("#calculator-country");fillSelect(countrySelect,all);countrySelect.value="Moldova";
 const controls=$("#calculator-inputs");for(const [key,label] of Object.entries(factorLabels)){const box=make("div");const header=make("label","slider-label");header.htmlFor="weight-"+key;header.append(document.createTextNode(label));const value=make("strong",null,"3");header.append(value);const slider=make("input");slider.id="weight-"+key;slider.type="range";slider.min="0";slider.max="5";slider.step="1";slider.value="3";slider.dataset.factor=key;slider.addEventListener("input",()=>value.textContent=slider.value);box.append(header,slider);controls.append(box);}
 $("#calculate-btn").addEventListener("click",()=>{
  const country=all.find(c=>c.name===countrySelect.value),weights=[...controls.querySelectorAll("input")].map(input=>({key:input.dataset.factor,weight:Number(input.value)}));const requested=weights.filter(w=>w.weight>0),total=requested.reduce((s,w)=>s+w.weight,0);
  const out=$("#calculator-result");out.replaceChildren();
  if(!country||!total){out.textContent="Выберите страну и задайте ненулевой вес хотя бы одного фактора.";return;}
  const valid=requested.map(w=>({...w,value:normalizeContribution(country.contributions[w.key],getFactorRange(all,w.key))})).filter(x=>x.value!==null);
  if(!valid.length){out.textContent="Для выбранных факторов отсутствуют значения. Расчёт невозможен.";return;}
  const den=valid.reduce((s,w)=>s+w.weight,0),score=valid.reduce((s,w)=>s+w.weight*w.value,0)/den;
  out.append(make("div","eyebrow","Условный персональный индекс"),make("h3",null,country.nameRu||country.name),make("strong",null,score.toFixed(3)+" / 1"),make("p",null,"Баллы вычислены как взвешенное среднее нормированных вкладов по диапазону стран отчёта 2024. Учтено факторов: "+valid.length+" из "+requested.length+". Это учебная модель, не объективная оценка жизни и не рекомендация."));
  if(valid.length<requested.length)out.append(make("p","help-text","Некоторые факторы исключены из расчёта из-за отсутствующих значений."));
 });
 }catch(e){text("#factor-summary","Ошибка загрузки данных: "+e.message);text("#calculator-result","Нет данных для расчёта.");console.error(e);}
}
async function main(){
 if(page==="index.html")await renderIndex();
 else if(page==="countries.html")await renderCatalog();
 else if(page==="country.html")await renderCountry();
 else if(page==="compare.html")await renderCompare();
 else if(page==="factors.html")await renderFactors();
}
main();
