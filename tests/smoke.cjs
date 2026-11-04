const assert = require("node:assert/strict");
const fs = require("node:fs");
const { JSDOM } = require("jsdom");
const read=p=>fs.readFileSync(p,"utf8");
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(test, message){
  for(let i=0;i<50;i++){if(test())return;await delay(35);}
  throw Error("Timed out: "+message);
}
async function load(html,script){
  const dom=new JSDOM(read(html),{url:"http://localhost:8123/"+html,runScripts:"outside-only",pretendToBeVisual:true});
  dom.window.scrollTo=()=>{};
  dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
  const logs=[];
  dom.window.addEventListener("error",e=>logs.push(e.message));
  dom.window.eval(read("config.js"));
  dom.window.eval(read("data.js"));
  dom.window.eval(read(script));
  if(logs.length)throw Error(logs.join("; "));
  return dom;
}
async function storefront(){
  const dom=await load("index.html","app.js");
  const doc=dom.window.document;
  await until(()=>doc.querySelectorAll(".product-card").length>0,"storefront catalog");
  assert.ok(doc.body.textContent.includes("Сет Ассорти"),"real sourced demo item appears");
  assert.ok(doc.getElementById("demo-notice").hidden===false,"unverified prices marked demo");
  doc.querySelector("[data-change='set-assorti']").click();
  assert.equal(doc.querySelector("[data-cart-count]").textContent,"1","basket counter increments");
  doc.getElementById("open-cart").click();
  assert.equal(doc.getElementById("cart-drawer").getAttribute("aria-hidden"),"false");
  doc.getElementById("go-checkout").click();
  assert.equal(doc.getElementById("checkout-view").hidden,false);
  doc.getElementById("customer-name").value="Тест Клиент";
  doc.getElementById("customer-phone").value="+7 701 123 45 67";
  doc.getElementById("customer-address").value="Кабанбай батыр 1";
  doc.getElementById("privacy").checked=true;
  let url="";
  dom.window.open=u=>{url=u;return {};};
  doc.getElementById("checkout-form").dispatchEvent(new dom.window.Event("submit",{bubbles:true,cancelable:true}));
  assert.ok(url.startsWith("https://api.whatsapp.com/send?text="),"unconfigured chat uses share flow only");
  const msg=decodeURIComponent(url.split("?text=")[1]);
  assert.ok(msg.includes("Сет Ассорти × 1"),"contains item and quantity");
  assert.ok(msg.includes("Кабанбай батыр 1"),"contains delivery address");
  assert.ok(msg.includes("Тест Клиент"),"contains contact name");
  assert.ok(msg.includes("Цены предварительные"),"unverified prices disclosed");
  dom.window.close();
  console.log("✓ Storefront: menu, cart, validation, WhatsApp order");
}
async function admin(){
  const dom=await load("admin.html","admin.js");
  const doc=dom.window.document;
  await until(()=>!doc.getElementById("demo-login").hidden,"demo admin entry");
  doc.getElementById("enter-demo").click();
  await until(()=>!doc.getElementById("admin-shell").hidden,"admin dashboard");
  const total=Number(doc.getElementById("stat-total").textContent);
  assert.ok(total>10,"demo products present");
  doc.getElementById("add-product").click();
  doc.getElementById("product-name").value="Тестовый ролл";
  doc.getElementById("product-price").value="3333";
  doc.getElementById("product-description").value="8 шт";
  doc.getElementById("product-form").dispatchEvent(new dom.window.Event("submit",{bubbles:true,cancelable:true}));
  await until(()=>Number(doc.getElementById("stat-total").textContent)===total+1,"product creation");
  assert.ok(doc.getElementById("admin-products").textContent.includes("Тестовый ролл"),"new item appears");
  doc.querySelector("[data-tab='settings']").click();
  doc.getElementById("setting-whatsapp").value="+7 777 555 44 33";
  doc.getElementById("settings-form").dispatchEvent(new dom.window.Event("submit",{bubbles:true,cancelable:true}));
  await until(()=>dom.window.SD.store.settings.whatsapp.includes("777 555"),"settings save");
  assert.equal(dom.window.SD.store.settings.whatsapp,"+7 777 555 44 33");
  dom.window.close();
  console.log("✓ Admin: demo mode, add product, save WhatsApp settings");
}
(async()=>{await storefront();await admin();console.log("✓ All smoke tests passed");})().catch(e=>{console.error(e);process.exitCode=1;});
