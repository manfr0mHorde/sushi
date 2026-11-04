// Real Chromium mobile layout check at common iPhone / compact Android widths.
// Run in GitHub Actions after installing puppeteer-core.
const puppeteer=require("puppeteer-core");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const http=require("node:http");
const mime={".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml"};
const root=process.cwd();
const server=http.createServer((req,res)=>{
 const pathname=decodeURI(new URL(req.url,"http://localhost").pathname);
 const target=path.resolve(root,"."+pathname);
 if(!target.startsWith(root+path.sep)&&target!==root){res.writeHead(403).end();return;}
 const file=fs.existsSync(target)&&fs.statSync(target).isDirectory()?path.join(target,"index.html"):target;
 fs.readFile(file,(e,bytes)=>{
  if(e){res.writeHead(404).end();return;}
  res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream","Cache-Control":"no-store"});
  res.end(bytes);
 });
});
function rectsOverlap(a,b){return Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));}
async function inspect(page,width){
 await page.setViewport({width,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:"+server.address().port+"/",{waitUntil:"domcontentloaded"});
 await page.waitForSelector(".product-card",{timeout:20000});
 await page.evaluate(()=>document.fonts?.ready);
 const info=await page.evaluate(()=>{
  const r=selector=>{const e=document.querySelector(selector);if(!e)return null;const x=e.getBoundingClientRect();return {left:x.left,top:x.top,right:x.right,bottom:x.bottom,width:x.width,height:x.height};};
  return {
    viewport:window.innerWidth,doc:document.documentElement.scrollWidth,
    hero:r(".hero"),heading:r(".hero h1"),primary:r(".hero-primary"),secondary:r(".hero-secondary"),bottom:r(".hero-bottom"),
    image:r(".hero-visual"),firstCard:r(".product-card"),grid:r(".product-grid"),
    price:r(".product-card .product-price"),add:r(".product-card .add-btn"),
    compositionButton:r(".set-details-link"),productCount:document.querySelectorAll(".product-card").length
  };
 });
 if(info.viewport!==width||info.doc>width+1){
  const offenders=await page.evaluate((target)=>Array.from(document.querySelectorAll("body *")).map(el=>{
    const r=el.getBoundingClientRect();
    return {tag:el.tagName.toLowerCase(),id:el.id,cls:String(el.className||"").slice(0,90),left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),scroll:el.scrollWidth};
  }).filter(x=>x.right>target+1||x.left< -2).sort((a,b)=>b.right-a.right).slice(0,30),width);
  console.log("DEBUG mobile overflow",width,JSON.stringify(info),JSON.stringify(offenders));
 }
 assert.equal(info.viewport,width);
 assert.ok(info.doc<=width+1,"Document horizontal overflow: "+JSON.stringify(info));
 for(const el of ["hero","heading","primary","secondary","grid","firstCard","compositionButton"]){
  const q=info[el];
  assert.ok(q&&q.left>=-1.5&&q.right<=width+1.5,el+" outside viewport "+JSON.stringify(info));
 }
 assert.ok(rectsOverlap(info.primary,info.secondary)<2,"Hero buttons overlap at "+width);
 assert.ok(info.bottom.top>=Math.max(info.primary.bottom,info.secondary.bottom)-2,"Hero footer overlaps buttons at "+width);
 assert.ok(info.price.right<=info.add.left+2,"Price and add button overlap at "+width);
 // Product modal should fit even at the smallest supported width.
 await page.click(".set-details-link");
 const details=await (await page.$("#details-modal")).boundingBox();
 assert.ok(details&&details.x>=-1&&details.x+details.width<=width+1,"Details dialog off screen at "+width);
 const pending=await page.$eval("#details-pending",e=>!e.hidden && e.getClientRects().length>0);
 assert.equal(pending,true,"Unknown set recipe must be explained, not invented");
 await page.click("#details-close");
 await page.click(".product-card .add-btn");
 await page.click("#open-cart");
 // The slide-in drawer animates for 300ms; measure only after transition finishes.
 await page.waitForFunction(()=>{const r=document.querySelector("#cart-drawer").getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1;},{timeout:3500});
 const cart=await (await page.$("#cart-drawer")).boundingBox();
 assert.ok(cart&&cart.x>=-1&&cart.x+cart.width<=width+1,"Cart offscreen at "+width);
 await page.click("#go-checkout");
 assert.equal(await page.$eval("#checkout-view",e=>!e.hidden),true);
 await page.click("#close-cart");
 await page.evaluate(()=>localStorage.removeItem("sushiday_cart_v2"));
 console.log("PASS viewport="+width+"px: width, hero, cards, set details, cart, checkout");
 return info;
}
async function main(){
 const candidates=[process.env.CHROME_BIN,"/usr/bin/google-chrome","/usr/bin/chromium","/usr/bin/chromium-browser"].filter(Boolean);
 const executablePath=candidates.find(fs.existsSync);
 if(!executablePath)throw Error("No Chrome/Chromium found on runner");
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const browser=await puppeteer.launch({executablePath,headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 try{
  fs.mkdirSync("/tmp/sushiday-shots",{recursive:true});
  const page=await browser.newPage();
  page.on("pageerror",err=>console.error("Browser page error:",err.message));
  for(const width of [320,375,390,430,768]){
   await inspect(page,width);
   if(width===390){
    await page.goto("http://127.0.0.1:"+server.address().port+"/",{waitUntil:"domcontentloaded"});
    await page.waitForSelector(".product-card");
    await page.screenshot({path:"/tmp/sushiday-shots/phone-390-home.png"});
    await page.$eval("#menu",e=>e.scrollIntoView());
    await page.screenshot({path:"/tmp/sushiday-shots/phone-390-menu.png"});
   }
  }
  console.log("PASS: real Chromium responsive layout at all five widths");
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1;});
