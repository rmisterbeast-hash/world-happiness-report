const cache = new Map();
const paths = { countries:"./data/countries.json", happiness:"./data/happiness.json", ranking:"./data/ranking.json" };
export async function loadData(key) {
  if (!Object.hasOwn(paths,key)) throw Error("Неизвестный набор данных: "+key);
  if (!cache.has(key)) cache.set(key, fetch(paths[key], {cache:"force-cache"}).then(r=>{
    if(!r.ok) throw Error("HTTP "+r.status+" при загрузке "+paths[key]);
    return r.json();
  }).catch(err=>{cache.delete(key);throw err;}));
  return cache.get(key);
}
export const factorLabels = Object.freeze({
  gdp:"ВВП на душу населения",support:"Социальная поддержка",
  health:"Здоровая продолжительность жизни",freedom:"Свобода выбора",
  generosity:"Щедрость",corruption:"Восприятие коррупции"
});
export const factorDetails = Object.freeze({
  gdp:"В отчёте 2024 этот столбец содержит вклад экономической компоненты в оценку жизни. Это НЕ величина ВВП в валюте. В годовом наборе используется логарифм ВВП на душу населения.",
  support:"Описывает доступность социальной поддержки. В отчётном срезе 2024 указан вклад фактора в объясняющую модель оценки жизни, а в историческом ряду присутствует исходное значение другого масштаба.",
  health:"В отчётном рейтинге 2024 приведён вклад здоровой продолжительности жизни в оценку. В годовом ряду доступен отдельный исходный показатель продолжительности здоровой жизни в годах.",
  freedom:"Восприятие возможностей самостоятельно принимать жизненные решения. Срез 2024 содержит вклад в модель, а исторический ряд — значение исходного признака.",
  generosity:"Показатель благотворительного поведения, используемый в аналитической модели. Значения годового ряда и вклады отчёта 2024 следует интерпретировать по отдельности.",
  corruption:"Восприятие распространённости коррупции. В отчёте 2024 показан вклад фактора, не являющийся прямой долей людей, отметивших наличие коррупции."
});
export const formatScore = (v, digits=3) => typeof v==="number" && Number.isFinite(v) ? v.toLocaleString("ru-RU",{minimumFractionDigits:digits,maximumFractionDigits:digits}):"нет данных";
export const reportCountryUrl = name => "./country.html?name="+encodeURIComponent(name);
export function countryLabel(name, list) {return list.find(x=>x.name===name)?.nameRu || name;}
export function countryAnnualRows(name, arr){return arr.filter(x=>x.name===name).sort((a,b)=>a.year-b.year);}
export function getFactorRange(countries, key){
  const vals=countries.map(c=>c.contributions?.[key]).filter(x=>typeof x==="number"&&Number.isFinite(x));
  return vals.length?{min:Math.min(...vals),max:Math.max(...vals)}:null;
}
export function normalizeContribution(v,range){
  if(typeof v!=="number"||!range) return null;
  if(range.max===range.min) return .5;
  return Math.max(0,Math.min(1,(v-range.min)/(range.max-range.min)));
}
