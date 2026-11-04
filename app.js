(function(){
"use strict";
const $=id=>document.getElementById(id);
const state={category:"all",query:"",cart:SD.storage.get(SD.KEY_CART,{})||{},checkout:false};
const getProduct=id=>SD.store.products.find(p=>p.id===id);
const cartEntries=()=>Object.entries(state.cart).map(([id,qty])=>({product:getProduct(id),qty:Number(qty)||0})).filter(x=>x.product&&x.product.visible!==false&&x.qty>0);
const cartCount=()=>cartEntries().reduce((n,x)=>n+x.qty,0);
const cartTotal=()=>cartEntries().reduce((n,x)=>n+x.qty*Number(x.product.price||0),0);
let toastTimer;
function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2800);}
function setCart(id,delta){
 const product=getProduct(id);if(!product || product.visible===false)return;
 state.cart[id]=Math.max(0,Math.min(99,(Number(state.cart[id])||0)+delta));
 if(!state.cart[id]) delete state.cart[id];
 SD.storage.set(SD.KEY_CART,state.cart);
 renderProducts();renderCart();updateCartButtons();
 if(delta>0)toast("Добавлено в корзину · "+product.name);
}
function updateCartButtons(){
 const n=cartCount();
 document.querySelectorAll("[data-cart-count]").forEach(el=>el.textContent=n);
 $("drawer-title-count").textContent=n?"("+n+")":"";
 $("mobile-bar").hidden=n===0;
 $("mobile-total").textContent=SD.money(cartTotal());
}
function makeCategory(c){
 const selected=state.category===c.id;
 return '<button type="button" class="category-btn '+(selected?'active':'')+'" data-category="'+SD.escape(c.id)+'" aria-pressed="'+selected+'"><span>'+c.emoji+'</span>'+SD.escape(c.name)+'</button>';
}
function renderCategories(){
 $("categories").innerHTML=SD.categories.map(makeCategory).join("");
}
function makeCard(p){
 const qty=Number(state.cart[p.id]||0),src=SD.photo(p.image);
 return '<article class="product-card">'+
  '<div class="product-photo">'+(src?'<img src="'+SD.escape(src)+'" alt="'+SD.escape(p.name)+' — иллюстративное фото" loading="lazy">':'<div class="image-fallback">🍣</div>')+
  (p.badge?'<span class="card-tag">'+SD.escape(p.badge)+'</span>':'')+
  '</div><div class="product-info"><div class="product-category">'+SD.escape(SD.categories.find(c=>c.id===p.category)?.name||"Меню")+'</div>'+
  '<h3>'+SD.escape(p.name)+'</h3><p class="product-description">'+SD.escape(p.description||"Приготовлено с заботой")+'</p>'+
  '<div class="product-bottom"><span class="product-price">'+SD.money(p.price)+'</span>'+
  (qty?
   '<div class="quantity-control"><button type="button" data-change="'+SD.escape(p.id)+'" data-delta="-1" aria-label="Уменьшить '+SD.escape(p.name)+'">−</button><span>'+qty+'</span><button type="button" data-change="'+SD.escape(p.id)+'" data-delta="1" aria-label="Увеличить '+SD.escape(p.name)+'">+</button></div>':
   '<button type="button" class="add-btn" data-change="'+SD.escape(p.id)+'" data-delta="1" aria-label="Добавить '+SD.escape(p.name)+'">+</button>')+
  '</div></div></article>';
}
function renderProducts(){
 const prods=SD.store.products.filter(p=>p.visible!==false && (state.category==="all"||p.category===state.category) && (p.name+" "+(p.description||"")).toLocaleLowerCase("ru").includes(state.query));
 $("product-grid").innerHTML=prods.map(makeCard).join("");
 $("empty-state").hidden=!!prods.length;
 $("product-count").textContent=prods.length+" "+(prods.length===1?"позиция":prods.length>=2&&prods.length<=4?"позиции":"позиций");
}
function renderCart(){
 const entries=cartEntries();
 $("cart-empty").hidden=entries.length>0;
 $("cart-footer").hidden=entries.length===0;
 $("cart-items").innerHTML=entries.map(({product:p,qty})=>'<div class="cart-line">'+
  '<div class="cart-thumb">'+(SD.photo(p.image)?'<img src="'+SD.escape(SD.photo(p.image))+'" alt="">':'🍣')+'</div>'+
  '<div class="cart-line-body"><h3>'+SD.escape(p.name)+'</h3><span>'+SD.money(p.price)+'</span>'+
  '<div class="cart-line-control"><div class="quantity-control"><button type="button" data-change="'+SD.escape(p.id)+'" data-delta="-1" aria-label="Минус один">−</button><span>'+qty+'</span><button type="button" data-change="'+SD.escape(p.id)+'" data-delta="1" aria-label="Плюс один">+</button></div><b>'+SD.money(p.price*qty)+'</b></div></div></div>').join("");
 const addons=SD.store.products.filter(p=>p.visible!==false&&["drinks","sauces","snacks"].includes(p.category)&&!state.cart[p.id]).slice(0,3);
 $("addon-section").hidden=!(entries.length&&addons.length);
 $("addon-list").innerHTML=addons.map(p=>'<button type="button" class="addon-item" data-change="'+SD.escape(p.id)+'" data-delta="1"><span class="addon-emoji">'+(p.category==="drinks"?"🥤":p.category==="sauces"?"🥣":"🍟")+'</span><span class="addon-name">'+SD.escape(p.name)+'<small>'+SD.money(p.price)+'</small></span><span class="addon-plus">+</span></button>').join("");
 $("cart-subtotal").textContent=SD.money(cartTotal());
 $("checkout-total").textContent=SD.money(cartTotal());
 const fee=SD.store.settings.delivery_fee;
 const caption=fee===null||fee===undefined?"Доставка рассчитывается отдельно":Number(fee)===0?"Условия доставки уточняйте у ресторана":"Доставка: "+SD.money(fee);
 document.querySelector(".drawer-footnote").textContent=caption;
 document.querySelector(".checkout-total small").textContent=caption;
}
function openCart(checkout=false){
 state.checkout=checkout&&cartCount()>0;
 $("cart-view").hidden=state.checkout;
 $("checkout-view").hidden=!state.checkout;
 $("cart-drawer").classList.add("open");
 $("cart-drawer").setAttribute("aria-hidden","false");
 $("drawer-backdrop").hidden=false;
 document.body.classList.add("drawer-open");
 $("drawer-title").textContent=state.checkout?"Оформление":"Корзина";
 if(state.checkout) $("customer-name").focus();else $("close-cart").focus();
 renderCart();
}
function closeCart(){
 $("cart-drawer").classList.remove("open");
 $("cart-drawer").setAttribute("aria-hidden","true");
 $("drawer-backdrop").hidden=true;
 document.body.classList.remove("drawer-open");
 $("open-cart").focus();
}
function buildOrder(){
 const f=$("checkout-form"),d=new FormData(f);
 const name=(d.get("name")||"").trim(),phone=(d.get("phone")||"").trim(),fulfilment=d.get("fulfilment"),address=(d.get("address")||"").trim();
 if(cartCount()===0)throw Error("Корзина пуста.");
 if(name.length<2)throw Error("Укажите имя получателя.");
 if(!SD.phoneOk(phone))throw Error("Введите телефон в формате +7 777 123 45 67.");
 if(fulfilment==="Доставка"&&address.length<5)throw Error("Укажите полный адрес доставки.");
 const kaspi=(d.get("kaspi")||"").trim();
 if(kaspi&&!SD.phoneOk(kaspi))throw Error("Проверьте номер телефона Kaspi.");
 if(!$("privacy").checked)throw Error("Необходимо согласие на передачу данных в WhatsApp.");
 const lines=cartEntries().map(({product:p,qty},i)=>(i+1)+". "+p.name+" × "+qty+" — "+SD.money(p.price*qty));
 const extra=[(d.get("apartment")||"").trim()&&"кв./офис "+d.get("apartment").trim(),(d.get("entrance")||"").trim()&&"подъезд/этаж "+d.get("entrance").trim()].filter(Boolean).join(", ");
 const delivery=SD.store.settings.delivery_fee;
 const feeInfo=fulfilment==="Самовывоз"?"Самовывоз":delivery==null?"Стоимость доставки уточнить":Number(delivery)===0?"Доставка по согласованию":"Стоимость доставки (ориентир): "+SD.money(delivery);
 const no="WEB-"+Date.now().toString(36).slice(-6).toUpperCase();
 return [
 "🍣 *НОВЫЙ ЗАКАЗ • SUSHIDAY*",
 "Номер: "+no,
 "",
 "*СОСТАВ ЗАКАЗА*",
 ...lines,
 "",
 "*Товары: "+SD.money(cartTotal())+"*",
 "🚗 "+feeInfo,
 ...(SD.store.settings.demo_mode?["⚠️ Цены предварительные, требуется подтверждение."]:[]),
 "",
 "*ДАННЫЕ КЛИЕНТА*",
 "Имя: "+name,
 "Телефон: "+phone,
 "Получение: "+fulfilment,
 ...(fulfilment==="Доставка"?["Адрес: г. Астана, "+address+(extra?", "+extra:"")]:[]),
 "Оплата: "+d.get("payment"),
 ...(kaspi?["Телефон Kaspi для счёта: "+kaspi]:[]),
 ...((d.get("comment")||"").trim()?["Комментарий: "+String(d.get("comment")).trim()]:[]),
 "",
 "Пожалуйста, подтвердите наличие, итоговую стоимость и время заказа."
 ].join("\n");
}
function submitCheckout(e){
 e.preventDefault();
 const err=$("form-error");err.hidden=true;
 try{
  const order=buildOrder();
  const phone=SD.digits(SD.store.settings.whatsapp);
  const validPhone=(phone.length===11 && (phone[0]==="7"||phone[0]==="8"))||(phone.length===10);
  const target=validPhone?(phone.length===10?"7"+phone:phone[0]==="8"?"7"+phone.slice(1):phone):"";
  const url=target?"https://wa.me/"+target+"?text="+encodeURIComponent(order):"https://api.whatsapp.com/send?text="+encodeURIComponent(order);
  if(!target)toast("У ресторана пока не указан WhatsApp. Выберите чат вручную.");
  const opened=window.open(url,"_blank","noopener,noreferrer");
  if(!opened){window.location.href=url;}
 }catch(ex){err.textContent=ex.message;err.hidden=false;err.scrollIntoView({behavior:"smooth",block:"center"});}
}
function checkoutChanges(){
 const f=$("checkout-form");
 const delivery=f.elements.fulfilment.value==="Доставка";
 $("delivery-fields").hidden=!delivery;
 $("customer-address").required=delivery;
 $("kaspi-wrap").hidden=f.elements.payment.value!=="Kaspi перевод / QR";
}
function bind(){
 $("categories").addEventListener("click",e=>{const b=e.target.closest("[data-category]");if(!b)return;state.category=b.dataset.category;renderCategories();renderProducts();});
 $("product-grid").addEventListener("click",e=>{const b=e.target.closest("[data-change]");if(b)setCart(b.dataset.change,Number(b.dataset.delta));});
 ["cart-items","addon-list"].forEach(id=>$(id).addEventListener("click",e=>{const b=e.target.closest("[data-change]");if(b)setCart(b.dataset.change,Number(b.dataset.delta));}));
 $("menu-search").addEventListener("input",e=>{state.query=e.target.value.trim().toLocaleLowerCase("ru");renderProducts();});
 $("reset-filters").addEventListener("click",()=>{state.category="all";state.query="";$("menu-search").value="";renderCategories();renderProducts();});
 $("show-sets").addEventListener("click",()=>{state.category="sets";state.query="";$("menu-search").value="";renderCategories();renderProducts();});
 ["open-cart","mobile-cart"].forEach(id=>$(id).addEventListener("click",()=>openCart()));
 $("close-cart").addEventListener("click",closeCart);
 $("drawer-backdrop").addEventListener("click",closeCart);
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("cart-drawer").classList.contains("open"))closeCart();});
 $("back-to-menu").addEventListener("click",()=>{closeCart();$("menu").scrollIntoView({behavior:"smooth"});});
 $("go-checkout").addEventListener("click",()=>openCart(true));
 $("back-cart").addEventListener("click",()=>openCart(false));
 $("checkout-form").addEventListener("change",checkoutChanges);
 $("checkout-form").addEventListener("submit",submitCheckout);
 $("copy-order").addEventListener("click",async()=>{
  const err=$("form-error");err.hidden=true;
  try{const message=buildOrder();if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(message);}else{const t=document.createElement("textarea");t.value=message;document.body.append(t);t.select();document.execCommand("copy");t.remove();}toast("Текст заказа скопирован");}
  catch(ex){err.textContent=ex.message;err.hidden=false;}
 });
 window.addEventListener("storage",async e=>{if([SD.KEY_CART,"sushiday_demo_products_v2","sushiday_demo_settings_v2"].includes(e.key)){state.cart=SD.storage.get(SD.KEY_CART,{});await SD.refresh();renderCategories();renderProducts();renderCart();updateCartButtons();}});
}
async function start(){
 bind();
 checkoutChanges();
 $("footer-year").textContent=new Date().getFullYear();
 try{
  await SD.initialize();
  renderCategories();renderProducts();renderCart();updateCartButtons();
  $("demo-notice").hidden=!SD.store.settings.demo_mode;
  $("price-note").hidden=!SD.store.settings.demo_mode;
  const phone=SD.store.settings.phone;
  if(phone){$("footer-phone").textContent=phone;$("footer-phone").href="tel:+"+SD.digits(phone);}
  if(SD.store.settings.address){$("footer-address").textContent=SD.store.settings.address+" ↗";}
  $("whatsapp-hint").textContent=SD.store.settings.whatsapp?"WhatsApp откроется с готовым текстом. Для отправки нажмите «Отправить». Ресторан подтверждает заказ.":"WhatsApp ресторана ещё не настроен. Пока можно поделиться сообщением вручную; заявка автоматически не принимается.";
 }catch(ex){
  $("product-count").textContent="Не удалось загрузить меню";
  $("product-grid").innerHTML='<div class="load-error">Не удалось подключиться к базе меню. Обновите страницу или сообщите администратору.</div>';
  console.error(ex);
 }
}
document.addEventListener("DOMContentLoaded",start);
})();