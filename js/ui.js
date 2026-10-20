import {factorDetails, factorLabels} from "./data.js";
export const $ = s => document.querySelector(s);
export const fmtYear = x => String(x);
export function text(selector,value){const x=$(selector);if(x)x.textContent=String(value??"нет данных");}
export function make(tag,cls,textValue){const e=document.createElement(tag);if(cls)e.className=cls;if(textValue!==undefined)e.textContent=String(textValue);return e;}
export function makeLink(href,label,cls){const a=make("a",cls,label);a.href=href;return a;}
export function emptyInto(id,msg){const el=document.getElementById(id);if(!el)return;el.replaceChildren(make("p","empty-state",msg));}
export function setStatus(id,msg,error=false){const x=document.getElementById(id);if(x){x.textContent=msg;x.style.color=error?"#963C30":"";}}
export function initNavigation(){
 const toggle=$("#menu-toggle"),nav=$("#main-menu");
 if(toggle&&nav){toggle.addEventListener("click",()=>{const isOpen=nav.classList.toggle("is-open");toggle.setAttribute("aria-expanded",String(isOpen));});
 nav.addEventListener("click",e=>{if(e.target.closest("a")){nav.classList.remove("is-open");toggle.setAttribute("aria-expanded","false");}});}
 window.addEventListener("scroll",()=>$(".site-header")?.classList.toggle("site-header--compact",window.scrollY>30),{passive:true});
}
let lastFocus=null;
const modal=$("#info-modal"),panel=modal?.querySelector(".modal__panel");
function getInfo(key){
 if(factorDetails[key])return [factorLabels[key],factorDetails[key]];
 if(key==="scatter")return ["Диаграмма рассеяния","Каждая точка — отдельная страна в срезе отчёта 2024. По вертикали размещена средняя оценка жизни от 0 до 10, по горизонтали — вклад выбранного фактора в объясняющую модель. Скопление точек может указывать на статистическую связь, но не устанавливает причинности."];
 if(key==="history")return ["Годовая динамика","Каждая точка соответствует одной годовой оценке жизни из набора 2005–2023. Пропуски не заменяются нулями и приводят к разрывам линии. Число 2024 относится к отдельно опубликованному рейтингу за многолетний период, поэтому не добавляется в этот график."];
 if(key==="limitations")return ["Ограничения данных","Показатели отражают средние ответы участников опросов, а не индивидуальную оценку каждого жителя. Отчётный рейтинг 2024 и годовые значения не сопоставимы как точки одного ряда. Исходные CSV-копии получены из общедоступных зеркал и требуют финальной сверки с Kaggle. Персональный балл зависит от выбранных весов и не является научной рекомендацией."];
 return ["Справка","Подробная информация содержится на странице «О данных»."];
}
export function closeModal(){
 if(!modal||modal.hidden)return;
 modal.hidden=true;document.body.classList.remove("modal--open");
 lastFocus?.focus();lastFocus=null;
}
export function openInfo(key,opener=document.activeElement){
 if(!modal||!panel)return;lastFocus=opener;
 const [heading,body]=getInfo(key);
 text("#modal-title",heading);text("#modal-body",body);
 modal.hidden=false;document.body.classList.add("modal--open");
 $("#modal-close")?.focus();
}
export function initModal(){
 if(!modal)return;
 document.addEventListener("click",e=>{const button=e.target.closest("[data-info]");if(button){openInfo(button.dataset.info,button);return;}
 if(e.target.closest("[data-close-modal]")||e.target.closest("#modal-close"))closeModal();});
 document.addEventListener("keydown",e=>{
   if(modal.hidden)return;
   if(e.key==="Escape"){e.preventDefault();closeModal();return;}
   if(e.key==="Tab"){const focusable=[...panel.querySelectorAll("button,[href],input,select,[tabindex]:not([tabindex='-1'])")].filter(x=>!x.disabled);
     if(!focusable.length){e.preventDefault();panel.focus();return;}
     const first=focusable[0],last=focusable.at(-1);
     if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
     else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
   }
 });
}
export function countryCard(country,href){
 const card=make("article","card");const meta=make("div","card__meta","#"+(country.rank||"—")+" · "+(country.regionRu||""));
 const h=make("h3",null,country.nameRu||country.name);
 const score=make("div","card__metric",typeof country.score==="number"?country.score.toLocaleString("ru-RU",{minimumFractionDigits:3,maximumFractionDigits:3}):"нет данных");
 const foot=make("div","card__meta","Оценка жизни, 0–10");
 const link=makeLink(href,"Открыть карточку ↗","card__link");
 card.append(meta,h,score,foot,link);return card;
}
