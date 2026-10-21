/**
 * Capture genuine public screenshots of three teacher-approved analogue sites.
 * Each site is represented by a landing/overview page and an internal page.
 * Never substitute placeholder imagery if a page refuses access: write a
 * machine-readable result and fail so the limitation can be reported.
 */
const {chromium}=require('@playwright/test');
const fs=require('fs'),path=require('path');
const sites=[
 {id:'whr-overview',name:'World Happiness Report',type:'главная/выпуск',url:'https://worldhappiness.report/ed/2024/'},
 {id:'whr-chapter',name:'World Happiness Report',type:'внутренняя/глава',url:'https://worldhappiness.report/ed/2024/happiness-of-the-younger-the-older-and-those-in-between'},
 {id:'owid-overview',name:'Our World in Data',type:'главная/исследование',url:'https://ourworldindata.org/happiness-and-life-satisfaction'},
 {id:'owid-chart',name:'Our World in Data',type:'внутренняя/интерактивный график',url:'https://ourworldindata.org/grapher/happiness-cantril-ladder?tab=map&time=2024'},
 {id:'oecd-index',name:'OECD Well-being Data Monitor',type:'основная/Better Life Index',url:'https://www.oecd.org/en/data/tools/well-being-data-monitor/better-life-index.html'},
 {id:'oecd-dashboard',name:'OECD Well-being Data Monitor',type:'внутренняя/Current well-being',url:'https://www.oecd.org/en/data/tools/well-being-data-monitor/current-well-being.html'}
];
(async()=>{
 const out='docs/analog-screenshots';
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--disable-blink-features=AutomationControlled']});
 const results=[];
 for(const item of sites){
  const context=await browser.newContext({viewport:{width:1366,height:860},deviceScaleFactor:1,locale:'ru-RU',colorScheme:'light',acceptDownloads:false});
  const page=await context.newPage();
  const errorLog=[];page.on('pageerror',e=>errorLog.push(e.message));
  const result={...item,time:new Date().toISOString(),viewport:1366,errors:errorLog};
  try{
   const response=await page.goto(item.url,{waitUntil:'domcontentloaded',timeout:50000});
   result.status=response?.status()||0;
   await page.waitForTimeout(5500);
   result.finalUrl=page.url();
   result.title=(await page.title()).slice(0,300);
   result.textChars=(await page.locator('body').innerText({timeout:13000})).trim().length;
   const text=(await page.locator('body').innerText()).slice(0,600).toLowerCase();
   result.challenge=/just a moment|access denied|verify you are human|unusual traffic|enable javascript|attention required|bot detection/.test(text);
   result.ok=result.status===200&&result.textChars>=350&&!result.challenge;
   if(result.ok){
    result.file=item.id+'.jpg';
    await page.screenshot({path:path.join(out,result.file),fullPage:true,type:'jpeg',quality:75,animations:'disabled',timeout:40000});
   }
  }catch(e){result.ok=false;result.failure=String(e).slice(0,1300);}
  results.push(result);
  console.log(item.id,'status',result.status,'chars',result.textChars,'ok',result.ok,result.failure||'');
  await context.close();
 }
 await browser.close();
 const report={createdAt:new Date().toISOString(),purpose:'Academic comparative analysis with attribution to each original URL',licenseNote:'Screenshots document third-party pages for commentary; do not treat them as owned or freely licensed.',results};
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(report,null,2)+'\n');
 const good=results.filter(x=>x.ok).length;
 console.log('Verified external pages:',good,'of',sites.length);
 if(good!==sites.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
