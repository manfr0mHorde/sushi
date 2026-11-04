/* Shared catalog + persistence layer. Supabase with admin RLS in production;
   localStorage fallback is ONLY a same-browser, unsecured demo. */
(function(){
"use strict";
const PHOTO={
  set1:"https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=85",
  set2:"https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=900&q=85",
  roll1:"https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=900&q=85",
  roll2:"https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=900&q=85",
  roll3:"https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=900&q=85",
  fried:"https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=900&q=85",
  drink:"https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=900&q=85",
  sauce:"https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85",
  pizza:"https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=85"
};
const categories=[
{id:"all",name:"Всё меню",emoji:"✦"},
{id:"sets",name:"Сеты",emoji:"🍱"},
{id:"rolls",name:"Холодные роллы",emoji:"🍣"},
{id:"baked",name:"Запечённые",emoji:"🔥"},
{id:"fried",name:"Жареные",emoji:"🥢"},
{id:"pizza",name:"Пицца",emoji:"🍕"},
{id:"snacks",name:"Закуски",emoji:"🍟"},
{id:"drinks",name:"Напитки",emoji:"🥤"},
{id:"sauces",name:"Соусы",emoji:"🥣"}
];
/* Source: third-party listing, not restaurant-confirmed. Must remain marked unverified. */
const rows=[
["set-assorti","sets","Сет Ассорти",13390,"1,5 кг","set1","Хит"],
["set-sakura","sets","Сет Сакура",15990,"2,5 кг","set2",""],
["set-50","sets","Сет 50",16390,"1,9 кг","set1","На компанию"],
["set-gonkong","sets","Сет Гонг-Конг",18890,"2,5 кг","set2",""],
["set-yakuza","sets","Сет Якудза",13290,"1,5 кг","set1",""],
["set-moto","sets","Сет Мото Мото",10290,"1,5 кг","set2",""],
["set-family","sets","Сет Семейный праздник",20690,"2,7 кг","set1","Для семьи"],
["set-tokyo","sets","Сет Токио",16490,"1,9 кг","set2",""],
["set-osaka","sets","Сет Осака",18290,"2,2 кг","set1",""],
["set-hot","sets","Сет Жареный",11790,"1,5 кг","set2",""],
["roll-philly","rolls","Филадельфия",4390,"300 г","roll1","Популярное"],
["roll-deluxe","rolls","Филадельфия де-люкс",4790,"300 г","roll2",""],
["roll-california","rolls","Калифорния",2990,"300 г","roll3",""],
["roll-chicago","rolls","Чикаго",2990,"300 г","roll1",""],
["roll-canada","rolls","Канада",4090,"300 г","roll2",""],
["roll-bonito","rolls","Бонито",3090,"300 г","roll3",""],
["roll-kappa","rolls","Каппа маки",1490,"250 г","roll1",""],
["roll-shrimp","rolls","Калифорния с креветкой",3990,"300 г","roll2",""],
["baked-caesar","baked","Запечённый Цезарь",3490,"300 г","roll3",""],
["baked-california","baked","Запечённая Калифорния",3490,"300 г","roll2",""],
["baked-florence","baked","Флоренция",3990,"300 г","roll1",""],
["fried-tempura","fried","Темпура",3390,"300 г","fried",""],
["fried-ebi","fried","Эби Темпура",3390,"300 г","roll3",""],
["fried-caesar","fried","Цезарь",3090,"300 г","fried",""],
["pizza-pepperoni","pizza","Пицца Пепперони",4490,"500 г","pizza",""],
["pizza-margherita","pizza","Пицца Маргарита",3690,"500 г","pizza",""],
["pizza-4","pizza","Пицца 4 сезона",4490,"500 г","pizza",""],
["fries","snacks","Картофель фри",1290,"180 г","pizza",""],
["nuggets","snacks","Наггетсы",1790,"250 г","fried",""],
["cola","drinks","Coca-Cola",1150,"1 л","drink",""],
["soy","sauces","Соевый соус",350,"50 г","sauce",""],
["ginger","sauces","Маринованный имбирь",350,"50 г","sauce",""],
["wasabi","sauces","Васаби",350,"40 г","sauce",""]
];
const demoProducts=rows.map((r,i)=>({id:r[0],category:r[1],name:r[2],price:r[3],description:r[4],image:PHOTO[r[5]],badge:r[6],composition:"",pieces:null,visible:true,sort_order:i}));
const defaults={whatsapp:"",phone:"+7 (701) 844-56-40",address:"ул. Санжара Асфендиярова, 5, Астана",delivery_fee:null,min_order:0,demo_mode:true,delivery_note:"Стоимость и время доставки уточняются оператором.",hero_title:"Вкусные моменты начинаются здесь"};
const KEY_PRODUCTS="sushiday_demo_products_v2",KEY_SETTINGS="sushiday_demo_settings_v2",KEY_CART="sushiday_cart_v2";
const store={products:[],settings:{...defaults},client:null,live:false};
const storage={
 get(key,fallback){try{const x=localStorage.getItem(key);return x?JSON.parse(x):fallback;}catch{return fallback;}},
 set(key,data){try{localStorage.setItem(key,JSON.stringify(data));}catch{}}
};
function configReady(){const c=window.SUSHIDAY_CONFIG||{};return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(c.supabaseUrl||"") && !!c.supabaseAnonKey;}
async function initialize(){
 if(configReady()&&!window.supabase)throw new Error("Supabase подключён в настройках, но библиотека не загрузилась.");
 store.live=!!(configReady() && window.supabase);
 if(store.live){
   const c=window.SUSHIDAY_CONFIG;
   store.client=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey);
 }
 await refresh();
 return store;
}
async function refresh(){
 if(store.live){
  const [p,s]=await Promise.all([store.client.from("products").select("*").order("sort_order",{ascending:true}),store.client.from("settings").select("*").eq("id",1).maybeSingle()]);
  if(p.error) throw new Error("Ошибка каталога: "+p.error.message);
  if(s.error) throw new Error("Ошибка настроек: "+s.error.message);
  store.products=p.data||[];
  store.settings={...defaults,...(s.data||{})};
 }else{
  store.products=storage.get(KEY_PRODUCTS,demoProducts);
  store.settings={...defaults,...storage.get(KEY_SETTINGS,{})};
 }
 return store;
}
async function saveProduct(product){
 if(store.live){const {error}=await store.client.from("products").upsert(product,{onConflict:"id"});if(error)throw new Error(error.message);}
 else {store.products=store.products.filter(x=>x.id!==product.id).concat(product);storage.set(KEY_PRODUCTS,store.products);}
 await refresh();
}
async function removeProduct(id){
 if(store.live){const {error}=await store.client.from("products").delete().eq("id",id);if(error)throw new Error(error.message);}
 else {store.products=store.products.filter(x=>x.id!==id);storage.set(KEY_PRODUCTS,store.products);}
 await refresh();
}
async function saveSettings(settings){
 const clean={...defaults,...settings};
 if(store.live){const {error}=await store.client.from("settings").upsert({id:1,...clean},{onConflict:"id"});if(error)throw new Error(error.message);}
 else storage.set(KEY_SETTINGS,clean);
 await refresh();
}
async function importDemo(){
 if(store.live){
  const {error}=await store.client.from("products").upsert(demoProducts,{onConflict:"id"});
  if(error)throw new Error(error.message);
 }else{
  const map=new Map(store.products.map(p=>[p.id,p]));
  demoProducts.forEach(p=>map.set(p.id,p));
  storage.set(KEY_PRODUCTS,[...map.values()]);
 }
 await refresh();
}
function money(value){return new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(Number(value)||0)+" ₸";}
function escape(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function photo(url){try{const p=new URL(url);return p.protocol==="https:"?p.href:"";}catch{return "";}}
function digits(value){return String(value??"").replace(/\D/g,"");}
function phoneOk(value){const d=digits(value);return d.length===11 && (d.startsWith("7")||d.startsWith("8"));}
document.addEventListener("DOMContentLoaded",()=>{const url=window.SUSHIDAY_CONFIG?.avatarUrl; if(!photo(url))return; document.querySelectorAll(".brand-icon").forEach(icon=>{const img=document.createElement("img");img.className="brand-avatar";img.src=url;img.alt="";img.loading="lazy";img.addEventListener("error",()=>img.remove(),{once:true});icon.appendChild(img);});});
window.SD={PHOTO,categories,demoProducts,defaults,store,storage,KEY_CART,initialize,refresh,saveProduct,removeProduct,saveSettings,importDemo,money,escape,photo,digits,phoneOk,configReady};
})();