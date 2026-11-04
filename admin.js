(function(){
"use strict";
const $=id=>document.getElementById(id);
let ready=false,currentTab="catalog",query="",filter="all",editing=null;
let timer;
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(timer);timer=setTimeout(()=>el.classList.remove("show"),3200);}
function error(el,message){el.textContent=message;el.hidden=false;}
function categoriesOptions(all=true){return (all?SD.categories:SD.categories.filter(c=>c.id!=="all")).map(c=>'<option value="'+c.id+'">'+c.name+'</option>').join("");}
function clean(str){return SD.escape(str);}
async function isAuthorized(){
 if(!SD.store.live)return false;
 const {data,error:authError}=await SD.store.client.auth.getUser();
 if(authError||!data?.user)return false;
 const {data:admin,error:dbError}=await SD.store.client.from("admins").select("user_id").eq("user_id",data.user.id).maybeSingle();
 if(dbError)throw Error("Не удалось проверить полномочия: "+dbError.message);
 return !!admin;
}
async function showPanel(){
 await SD.refresh();
 ready=true;
 $("login-screen").hidden=true;
 $("admin-shell").hidden=false;
 $("demo-warning").hidden=SD.store.live;
 $("admin-mode").textContent=SD.store.live?"Защищённый режим Supabase":"Локальный демо-режим";
 $("mode-chip").textContent=SD.store.live?"● База подключена":"◉ Демо / локально";
 renderAll();showTab(currentTab);
}
function showLogin(){
 ready=false;
 $("login-screen").hidden=false;$("admin-shell").hidden=true;
}
async function start(){
 $("admin-filter").innerHTML=categoriesOptions();
 $("product-category").innerHTML=categoriesOptions(false);
 bind();
 try{
   await SD.initialize();
   if(!SD.store.live){
    $("demo-login").hidden=false;$("login-form").hidden=true;
   }else{
    $("demo-login").hidden=true;$("login-form").hidden=false;
    if(await isAuthorized())await showPanel();
   }
 }catch(ex){error($("login-message"),ex.message);}
}
async function login(e){
 e.preventDefault();
 const btn=$("login-submit");btn.disabled=true;
 $("login-message").hidden=true;
 try{
   const {data,error:authError}=await SD.store.client.auth.signInWithPassword({email:$("admin-email").value.trim(),password:$("admin-pass").value});
   if(authError)throw Error("Неверные данные входа или ошибка авторизации.");
   if(!data?.user || !(await isAuthorized())){await SD.store.client.auth.signOut();throw Error("У этого аккаунта нет доступа администратора. Добавьте user_id в таблицу admins.");}
   $("admin-pass").value="";
   await showPanel();
 }catch(ex){error($("login-message"),ex.message);}
 finally{btn.disabled=false;}
}
async function logout(){
 if(SD.store.live)await SD.store.client.auth.signOut();
 showLogin();
}
function showTab(tab){
 if(!ready)return;
 currentTab=tab;
 $("catalog-panel").hidden=tab!=="catalog";
 $("settings-panel").hidden=tab!=="settings";
 $("admin-title").textContent=tab==="catalog"?"Меню и товары":"Настройки ресторана";
 $("breadcrumb").textContent=tab==="catalog"?"Каталог":"Настройки";
 document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
 if(tab==="settings")renderSettings();
}
function renderAll(){
 renderTable();renderSettings();
 $("stat-total").textContent=SD.store.products.length;
 $("stat-visible").textContent=SD.store.products.filter(p=>p.visible!==false).length;
 $("stat-categories").textContent=new Set(SD.store.products.map(p=>p.category)).size;
}
function renderTable(){
 const list=SD.store.products.filter(p=>(filter==="all"||p.category===filter)&&p.name.toLocaleLowerCase("ru").includes(query)).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
 $("admin-empty").hidden=list.length>0;
 $("admin-products").innerHTML=list.map(p=>{
  const cat=SD.categories.find(c=>c.id===p.category)?.name||p.category;
  const thumb=SD.photo(p.image);
  return '<tr><td><div class="admin-product">'+(thumb?'<img class="admin-thumb" src="'+clean(thumb)+'" alt="">':'<div class="admin-thumb" style="display:grid;place-items:center">🍣</div>')+
   '<div><strong>'+clean(p.name)+'</strong><small>'+clean(p.description||"Без описания")+'</small></div></div></td>'+
   '<td>'+clean(cat)+'</td><td><strong>'+SD.money(p.price)+'</strong></td>'+
   '<td><span class="pill '+(p.visible===false?"off":"")+'">'+(p.visible===false?"Скрыт":"На сайте")+'</span></td>'+
   '<td><div class="table-actions"><button class="small-action" type="button" data-edit="'+clean(p.id)+'">Изменить</button><button class="small-action" type="button" data-toggle="'+clean(p.id)+'">'+(p.visible===false?"Показать":"Скрыть")+'</button><button class="small-action" type="button" data-delete="'+clean(p.id)+'" title="Удалить">✕</button></div></td></tr>';
 }).join("");
}
function renderSettings(){
 const s=SD.store.settings;
 $("setting-whatsapp").value=s.whatsapp||"";
 $("setting-phone").value=s.phone||"";
 $("setting-address").value=s.address||"";
 $("setting-kaspi").value=s.kaspi_receiver||"";
 $("setting-fee").value=s.delivery_fee??"";
 $("setting-min").value=s.min_order||0;
 $("setting-delivery-note").value=s.delivery_note||"";
 $("setting-demo").checked=!!s.demo_mode;
}
function openProduct(id=null){
 editing=id?SD.store.products.find(p=>p.id===id):null;
 $("product-modal-title").textContent=editing?"Редактировать товар":"Добавить товар";
 $("product-id").value=editing?.id||"";
 $("product-name").value=editing?.name||"";
 $("product-category").value=editing?.category||"sets";
 $("product-price").value=editing?.price??"";
 $("product-description").value=editing?.description||"";
 $("product-image").value=editing?.image||"";
 $("product-badge").value=editing?.badge||"";
 $("product-sort").value=editing?.sort_order??SD.store.products.length;
 $("product-visible").checked=editing?.visible!==false;
 $("product-error").hidden=true;
 updatePreview();
 $("product-overlay").hidden=false;
 document.body.style.overflow="hidden";
 $("product-name").focus();
}
function closeProduct(){
 $("product-overlay").hidden=true;
 document.body.style.overflow="";
 editing=null;
}
function updatePreview(){
 const src=SD.photo($("product-image").value);
 const img=$("image-preview");
 img.hidden=!src;
 if(src){img.src=src;img.onerror=()=>{img.hidden=true;};}
}
async function saveProduct(e){
 e.preventDefault();
 const btn=$("save-product");btn.disabled=true;$("product-error").hidden=true;
 try{
   const name=$("product-name").value.trim(),price=Number($("product-price").value),category=$("product-category").value;
   if(name.length<2)throw Error("Введите название товара.");
   if(!Number.isFinite(price)||price<0)throw Error("Цена должна быть неотрицательным числом.");
   if(!SD.categories.some(c=>c.id===category&&category!=="all"))throw Error("Выберите категорию.");
   const url=$("product-image").value.trim();
   if(url&&!SD.photo(url))throw Error("Нужна корректная HTTPS-ссылка на изображение.");
   const id=editing?.id||(globalThis.crypto?.randomUUID?.()||"new-"+Date.now().toString(36));
   await SD.saveProduct({id,name,category,price,description:$("product-description").value.trim(),image:url,badge:$("product-badge").value.trim(),sort_order:Math.max(0,Number($("product-sort").value)||0),visible:$("product-visible").checked});
   closeProduct();renderAll();toast("Товар сохранён");
 }catch(ex){error($("product-error"),ex.message);}
 finally{btn.disabled=false;}
}
async function updateVisibility(id){
 const p=SD.store.products.find(x=>x.id===id);if(!p)return;
 try{await SD.saveProduct({...p,visible:p.visible===false});renderAll();toast("Статус товара обновлён");}
 catch(ex){toast("Ошибка: "+ex.message);}
}
async function deleteProduct(id){
 const p=SD.store.products.find(x=>x.id===id);if(!p)return;
 if(!confirm('Удалить товар «'+p.name+'»?'))return;
 try{await SD.removeProduct(id);renderAll();toast("Товар удалён");}
 catch(ex){toast("Ошибка удаления: "+ex.message);}
}
async function importDemo(){
 if(!confirm("Загрузить примерное меню из стороннего каталога? Позиции с одинаковыми ID будут перезаписаны. Цены требуют подтверждения ресторана."))return;
 const btn=$("import-demo");btn.disabled=true;
 try{await SD.importDemo();renderAll();toast("Примерное меню загружено");}
 catch(ex){toast("Ошибка импорта: "+ex.message);}
 finally{btn.disabled=false;}
}
async function saveSettings(e){
 e.preventDefault();
 const btn=$("save-settings"),st=$("settings-status");btn.disabled=true;st.textContent="";
 try{
   const wa=SD.digits($("setting-whatsapp").value);
   if(wa && !([10,11].includes(wa.length)&&((wa.length===11&&(wa[0]==="7"||wa[0]==="8"))||(wa.length===10))))throw Error("Проверьте номер WhatsApp (например, +7 777 123 45 67).");
   const fee=$("setting-fee").value.trim();
   await SD.saveSettings({...SD.store.settings,whatsapp:$("setting-whatsapp").value.trim(),phone:$("setting-phone").value.trim(),address:$("setting-address").value.trim(),kaspi_receiver:$("setting-kaspi").value.trim(),delivery_fee:fee===""?null:Math.max(0,Math.round(Number(fee))),min_order:Math.max(0,Math.round(Number($("setting-min").value)||0)),delivery_note:$("setting-delivery-note").value.trim(),demo_mode:$("setting-demo").checked});
   st.classList.remove("error");st.textContent="✓ Настройки сохранены";renderAll();toast("Настройки обновлены");
 }catch(ex){st.classList.add("error");st.textContent=ex.message;}
 finally{btn.disabled=false;}
}
function bind(){
 $("enter-demo").addEventListener("click",showPanel);
 $("login-form").addEventListener("submit",login);
 $("logout").addEventListener("click",logout);
 $("logout-mobile").addEventListener("click",logout);
 document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>showTab(b.dataset.tab)));
 $("admin-search").addEventListener("input",e=>{query=e.target.value.toLocaleLowerCase("ru").trim();renderTable();});
 $("admin-filter").addEventListener("change",e=>{filter=e.target.value;renderTable();});
 $("add-product").addEventListener("click",()=>openProduct());
 $("import-demo").addEventListener("click",importDemo);
 $("admin-products").addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.dataset.edit)openProduct(b.dataset.edit);
  if(b.dataset.toggle)updateVisibility(b.dataset.toggle);
  if(b.dataset.delete)deleteProduct(b.dataset.delete);
 });
 $("close-modal").addEventListener("click",closeProduct);
 $("cancel-product").addEventListener("click",closeProduct);
 $("product-overlay").addEventListener("click",e=>{if(e.target===$("product-overlay"))closeProduct();});
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("product-overlay").hidden)closeProduct();});
 $("product-image").addEventListener("change",updatePreview);
 $("product-form").addEventListener("submit",saveProduct);
 $("settings-form").addEventListener("submit",saveSettings);
}
document.addEventListener("DOMContentLoaded",start);
})();