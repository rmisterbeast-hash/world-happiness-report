import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {getFactorRange,normalizeContribution} from '../js/data.js';
const read=path=>JSON.parse(readFileSync(resolve(path),'utf8'));
const {countries,meta:countryMeta}=read('data/countries.json');
const {records,meta:annualMeta}=read('data/happiness.json');
const {years}=read('data/ranking.json');
assert.equal(countries.length,143,'2024: 143 countries');
assert.equal(records.length,2363,'Annual series: 2363 rows');
assert.equal(annualMeta.years[0],2005);assert.equal(annualMeta.years[1],2023);
assert.equal(years['2024'].kind,'published-report');
assert.equal(years['2024'].count,countries.length);
assert.equal(years['2024'].entries[0].name,'Finland');
assert.equal(years['2024'].entries[0].score,7.741);
const names=new Set(countries.map(x=>x.name));assert.equal(names.size,countries.length,'unique countries');
assert.equal(countries.filter(x=>!x.nameRu).length,0,'all Russian names provided');
assert.equal(countries.filter(x=>!x.regionRu).length,0,'all regional translations provided');
for(const country of countries){
 assert.ok(country.score>=0&&country.score<=10);
 assert.ok(country.contributions&&Object.keys(country.contributions).length===6);
 assert.ok(country.rank>=1&&country.rank<=countries.length);
}
const pairs=new Set();
for(const r of records){assert.ok(r.year>=2005&&r.year<=2023);assert.ok(r.score===null||(r.score>=0&&r.score<=10));
 const id=r.name+':'+r.year;assert.ok(!pairs.has(id),'unique country-year '+id);pairs.add(id);}
for(const [year,row] of Object.entries(years)){
 assert.equal(row.count,row.entries.length);
 for(const [i,entry] of row.entries.entries()){assert.equal(entry.rank,i+1);if(i>0)assert.ok(entry.score<=row.entries[i-1].score);}
 if(Number(year)!==2024)assert.equal(row.kind,'annual-recomputed');
}
for(const f of ['gdp','support','health','freedom','generosity','corruption']){
 const range=getFactorRange(countries,f);assert.ok(range.max>=range.min);
 for(const c of countries){const n=normalizeContribution(c.contributions[f],range);if(n!==null)assert.ok(n>=0&&n<=1);}
}
assert.equal(normalizeContribution(null,{min:0,max:10}),null,'do not convert missing to zero');
assert.equal(normalizeContribution(2,{min:2,max:2}),.5,'constant factor handling');
const pages=['index.html','countries.html','country.html','compare.html','factors.html','about.html'];
const links=['index','countries','country','compare','factors','about'];
for(const page of pages){
 const html=readFileSync(page,'utf8'),main=html.match(/<main id="main">([\s\S]*?)<\/main>/)?.[1]||'';
 assert.ok(html.includes('<html lang="ru">')&&html.includes('<meta charset="UTF-8">'));
 assert.equal((main.match(/<h1\b/g)||[]).length,1,page+' one h1');
 assert.ok((main.match(/<section\b/g)||[]).length>=5,page+' at least 5 sections');
 assert.ok(main.includes('src="./images/'),page+' has illustration');
 assert.ok(html.includes('aria-label'),page+' ARIA markup');
 assert.ok(html.includes('src="./js/app.js'),page+' application module');
 const wordCount=main.replace(/<[^>]+>/g,' ').trim().split(/\s+/).length;
 assert.ok(wordCount>=200,page+' at least 200 useful words: '+wordCount);
}
for(const file of ['data/countries.json','data/happiness.json','data/ranking.json']){
 assert.ok(statSync(file).size<=3*1024*1024,'JSON size limit: '+file);
}
assert.ok(readFileSync('about.html','utf8').includes('"@type":"Dataset"'),'Dataset schema');
console.log('PASS: data integrity, publication method distinctions, six HTML pages and Dataset JSON-LD');
// Auxiliary KPI repeat and related-navigation cards are not separate analytical
// sections: country has five semantic sections, preserving three principal
// data-driven topics (overview, annual chart, factor scales).
const countrySections=readFileSync('country.html','utf8').match(/<section\\b/g)||[];
assert.equal(countrySections.length,5,'country: five primary sections, no redundant analytical sections');
for(const id of ['country-score','nearby-countries'])
 assert.ok(readFileSync('country.html','utf8').includes('id="'+id+'"'),'auxiliary content preserved: '+id);
const about=readFileSync('about.html','utf8');
const glossary=[...about.matchAll(/<dt>([^<]+)<\/dt><dd>([^<]+)<\/dd>/g)];
assert.ok(glossary.length>=8 && glossary.length<=10,'8–10 glossary entries');
for(const entry of glossary){
 const words=entry[2].trim().split(/\s+/).length;
 assert.ok(words>=30 && words<=50,entry[1]+' glossary definition must have 30–50 words: '+words);
}
const totalWords=['index.html','countries.html','country.html','compare.html','factors.html','about.html'].reduce((sum,f)=>{
 const html=readFileSync(f,'utf8'),main=html.match(/<main id="main">([\s\S]*?)<\/main>/)?.[1]||'';
 return sum+main.replace(/<[^>]+>/g,' ').trim().split(/\s+/).length;
},0);
assert.ok(totalWords>=1300,'Site authored content must be at least 1300 words, found '+totalWords);
console.log('PASS: 8–10 glossary items, each 30–50 words; site >= 1300 authored words');

const geoMap=read('data/world-map.json');
const matchedKeys=new Set([...geoMap.features,...geoMap.markers].map(f=>f.key).filter(Boolean));
assert.equal(geoMap.features.length,176,'Natural Earth non-Antarctic boundaries');
assert.equal(geoMap.features.filter(f=>f.key).length,137,'Known countries with polygon boundaries');
assert.equal(geoMap.markers.length,6,'Small countries and territories shown as markers');
assert.equal(matchedKeys.size,countries.length,'All 143 WHR countries can be selected on map');
for(const c of countries)assert.ok(matchedKeys.has(c.name),'Unmatched rating on map: '+c.name);
assert.ok(readFileSync('index.html','utf8').includes('id="world-map-svg"'),'Map section present on homepage');
console.log('PASS: 143 mapped WHR scores (137 borders + 6 markers), no invented scores');

function svgSubpaths(path){return path.match(/M[^M]*?Z/g)||[];}
function svgContains(subpath,x,y){
 const nums=(subpath.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);
 let inside=false;
 for(let i=0,j=nums.length/2-1;i<nums.length/2;j=i++){
  const xi=nums[2*i],yi=nums[2*i+1],xj=nums[2*j],yj=nums[2*j+1];
  if((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
 }
 return inside;
}
const crimeaX=(34.2+180)*1000/360;
const crimeaY=(85-45.3)*500/150;
const russiaGeo=geoMap.features.find(f=>f.key==='Russia');
const ukraineGeo=geoMap.features.find(f=>f.key==='Ukraine');
assert.ok(russiaGeo && ukraineGeo,'Russia and Ukraine map layers must exist');
assert.equal(svgSubpaths(russiaGeo.d).filter(p=>svgContains(p,crimeaX,crimeaY)).length,0,'Crimea must not be in Russia geometry');
assert.equal(svgSubpaths(ukraineGeo.d).filter(p=>svgContains(p,crimeaX,crimeaY)).length,1,'Crimea must be inside Ukraine geometry');
console.log('PASS: Crimean peninsula polygon belongs to Ukraine, not Russia');

assert.equal(geoMap.crimea.key,'Ukraine','Crimea dedicated hit overlay is Ukraine');
assert.equal(geoMap.crimea.name,'Крым — Украина','Crimea overlay has explicit attribution');
assert.equal(svgSubpaths(geoMap.crimea.d).length,1);
assert.equal(svgSubpaths(ukraineGeo.d).some(p=>p===geoMap.crimea.d),true,'Crimea overlay must be identical to Ukraine polygon');
assert.equal(svgSubpaths(russiaGeo.d).some(p=>p===geoMap.crimea.d),false,'Crimea overlay must not be sourced from Russia');
console.log('PASS: Crimea interactive overlay uses Ukrainian polygon and data');

const homePage=readFileSync('index.html','utf8');
assert.ok(homePage.includes('id="hero-leader-name"'),'Hero must show the leader');
assert.ok(homePage.includes('id="ranking-warning"'),'Historic small-year coverage notice');
for(const page of ['index.html','countries.html','country.html','compare.html','factors.html','about.html']){
 const content=readFileSync(page,'utf8');
 assert.ok(content.includes('данные Kaggle и условия использования'),'Data source & licensing link in '+page);
}
console.log('PASS: 2024 leader and historical coverage warning; source attribution in six footers');
