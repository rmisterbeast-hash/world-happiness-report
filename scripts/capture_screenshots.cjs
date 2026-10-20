const {chromium}=require('@playwright/test');
const fs=require('fs'),path=require('path');
const base='http://127.0.0.1:8000/';
const cases={
 'index':'',
 'countries':'countries.html',
 'country-finland':'country.html?name=Finland',
 'compare':'compare.html',
 'factors':'factors.html',
 'about':'about.html',
};
(async()=>{
 const browser=await chromium.launch({headless:true});
 const manifest={generatedAt:new Date().toISOString(),runner:'GitHub Actions Chromium',pages:[]};
 fs.mkdirSync('docs/screenshots',{recursive:true});
 for(const width of [320,768,1280]){
  const context=await browser.newContext({viewport:{width,height:860},deviceScaleFactor:1,colorScheme:'light'});
  for(const [name,route] of Object.entries(cases)){
   const page=await context.newPage(),exceptions=[];
   page.on('pageerror',e=>exceptions.push(e.message));
   const response=await page.goto(base+route,{waitUntil:'networkidle',timeout:45000});
   await page.waitForTimeout(650);
   const actualWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
   const fname=`${name}-${width}.jpg`,file=path.join('docs/screenshots',fname);
   await page.screenshot({path:file,type:'jpeg',quality:73,fullPage:true,animations:'disabled'});
   manifest.pages.push({name,url:base+route,width,scrollWidth:actualWidth,httpStatus:response.status(),pageErrors:exceptions,screenshot:fname});
   console.log(name,width,response.status(),'scroll',actualWidth,'js-errors',exceptions.length,'saved',fname);
   await page.close();
  }
  await context.close();
 }
 await browser.close();
 fs.writeFileSync('docs/screenshots/manifest.json',JSON.stringify(manifest,null,2)+'\n');
 const fail=manifest.pages.filter(x=>x.httpStatus!==200||x.pageErrors.length||x.scrollWidth>x.width+2);
 if(fail.length){console.error('Detected screenshot or overflow issues:',JSON.stringify(fail));process.exitCode=1;}
})().catch(e=>{console.error(e);process.exitCode=1;});
