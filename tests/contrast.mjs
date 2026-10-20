// WCAG 2.x contrast check for primary content text on actual project palettes.
// Contrast ratio of normal-sized text should not be below 4.5:1.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const stylesheet=readFileSync('style.css','utf8');
for(const hex of ['#E07A5F','#3D405B','#81B29A','#F4F1DE'])assert.ok(stylesheet.includes(hex),'Expected lecturer palette: '+hex);
const channels=hex=>hex.match(/[a-fA-F0-9]{2}/g).map(n=>parseInt(n,16)/255);
const luminance=hex=>channels(hex).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const contrastRatio=(fg,bg)=>{const a=luminance(fg),b=luminance(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
const pairs=[
 ['Main copy on cream','#3D405B','#F4F1DE'],
 ['Main copy on white','#3D405B','#FFFEFA'],
 ['Secondary copy on white','#656A7D','#FFFEFA'],
 ['Eyebrow on cream','#9C4C39','#F4F1DE'],
 ['Text links on white','#954738','#FFFFFF'],
 ['Muted footer copy on footer','#C5C7D3','#282C42'],
];
for(const [name,fg,bg] of pairs){
 const ratio=contrastRatio(fg,bg);
 assert.ok(ratio>=4.5,name+' fails contrast: '+ratio.toFixed(2)+':1');
 console.log('PASS',name,ratio.toFixed(2)+':1');
}
console.log('Accessibility color palette checks passed');
