const {chromium}=require("@playwright/test");
const fs=require("fs"),path=require("path");
const sources=[
 {id:"whr-main",group:"World Happiness Report",kind:"main",url:"https://worldhappiness.report/ed/2024/",must:"World Happiness"},
 {id:"whr-inner",group:"World Happiness Report",kind:"inner",url:"https://worldhappiness.report/ed/2024/happiness-of-the-younger-the-older-and-those-in-between",must:"Happiness"},
 {id:"owid-main",group:"Our World in Data",kind:"main",url:"https://ourworldindata.org/happiness-and-life-satisfaction",must:"Happiness"},
 {id:"owid-inner",group:"Our World in Data",kind:"inner",url:"https://ourworldindata.org/grapher/happiness-cantril-ladder?tab=chart&time=2024",must:"Self-reported"},
 {id:"oecd-main",group:"OECD Better Life Index",kind:"main",url:"https://www.oecd.org/en/data/tools/well-being-data-monitor/better-life-index.html",must:"Better Life"},
 {id:"oecd-inner",group:"OECD Better Life Index",kind:"inner",url:"https://www.oecd.org/en/data/tools/well-being-data-monitor/current-well-being.html",must:"well-being"}
];
(async()=>{
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 const dir="docs/analog-screenshots";fs.mkdirSync(dir,{recursive:true});
 const results=[];
 for(const item of sources){
  const page=await browser.newPage({viewport:{width:1280,height:840},deviceScaleFactor:1,locale:"en-US"});
  const result={...item,shot:null,ok:false,status:null,title:null,reason:null};
  try{
   const response=await page.goto(item.url,{waitUntil:"domcontentloaded",timeout:50000});
   result.status=response?.status()??null;
   await page.waitForTimeout(1900);
   const info=await page.evaluate(()=>({title:document.title,text:document.body?.innerText?.slice(0,20000)||""}));
   result.title=info.title;result.textLength=info.text.length;
   const check=(info.title+" "+info.text),bad=/sorry, you have been blocked|just a moment|access denied|captcha|robot check|verify you are human/i.test(info.title+" "+info.text.slice(0,800));
   if(result.status!==200||info.text.length<300||!check.toLowerCase().includes(item.must.toLowerCase())||bad){
    result.reason="HTTP "+result.status+" text "+info.text.length+" expected "+item.must+" blocked "+bad;
   }else{
    await page.evaluate(()=>window.scrollTo(0,0));
    const file=path.join(dir,item.id+".jpg");
    await page.screenshot({path:file,type:"jpeg",quality:76,fullPage:false,animations:"disabled"});
    result.shot=item.id+".jpg";result.ok=true;
   }
  }catch(error){result.reason=String(error).slice(0,500);}
  console.log(item.id,result.ok?"PASS":"UNVERIFIED",result.status,result.title,result.reason||result.shot);
  results.push(result);await page.close();
 }
 await browser.close();
 const manifest={generatedAt:new Date().toISOString(),method:"Chromium real external website screenshot for coursework comparative analysis",width:1280,height:840,results};
 fs.writeFileSync(path.join(dir,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");
 if(results.filter(x=>x.ok).length<4){
  console.error("Too few independently verified screenshots: "+results.filter(x=>x.ok).length);process.exitCode=1;
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
