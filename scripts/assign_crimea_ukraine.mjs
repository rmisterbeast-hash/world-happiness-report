/**
 * Repeatable correction for Natural Earth 1:110m de facto geography.
 * Crimea is internationally recognized as part of Ukraine (UNGA 68/262).
 * The small standalone Crimean SVG polygon is removed from Russia's path
 * and added to Ukraine's. No numeric World Happiness Report scores change.
 *
 * Run once or repeatedly: node scripts/assign_crimea_ukraine.mjs
 */
import {readFileSync,writeFileSync} from "node:fs";
const filename="data/world-map.json";
const dataset=JSON.parse(readFileSync(filename,"utf8"));
const ru=dataset.features.find(f=>f.key==="Russia");
const ua=dataset.features.find(f=>f.key==="Ukraine");
if(!ru||!ua)throw Error("Missing Ukraine or Russia feature");
const paths=s=>s.match(/M[^M]*?Z/g)||[];
const crimeaPoint=[(34.2+180)*1000/360,(85-45.3)*500/150];
function contains(part,[x,y]){
 const coords=(part.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);
 let inside=false;
 for(let i=0,j=coords.length/2-1;i<coords.length/2;j=i++){
  const xi=coords[2*i],yi=coords[2*i+1],xj=coords[2*j],yj=coords[2*j+1];
  if((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
 }
 return inside;
}
const source=paths(ru.d);
const crimea=source.filter(p=>contains(p,crimeaPoint));
if(crimea.length===1){
 if(paths(ua.d).some(p=>contains(p,crimeaPoint)))throw Error("Crimea already overlaps Ukraine");
 ru.d=source.filter(p=>p!==crimea[0]).join("");
 ua.d+=crimea[0];
}else if(crimea.length===0 && paths(ua.d).filter(p=>contains(p,crimeaPoint)).length===1){
 console.log("Crimea already mapped to Ukraine; no geometry change");
}else{
 throw Error("Cannot unambiguously locate Crimean peninsula polygon");
}
if(paths(ru.d).some(p=>contains(p,crimeaPoint))||!paths(ua.d).some(p=>contains(p,crimeaPoint)))throw Error("Crimea ownership test failed");
dataset.source.crimeaAssignment="The distinct Crimean peninsula polygon from default Natural Earth 1:110m de facto Russia geometry has been reassigned to Ukraine, reflecting Ukraine's internationally recognized borders (UN General Assembly resolution 68/262). No happiness value is invented: the territory inherits the Ukraine entry in countries.json. The source geometry's depiction of de facto control differs.";
dataset.source.crimeaInternationalLaw="https://digitallibrary.un.org/record/767883/files/A_RES_68_262-EN.pdf";
writeFileSync(filename,JSON.stringify(dataset)+"\n","utf8");
console.log("PASS Crimea renders within Ukraine; Russia geometry excludes Crimea");
