// --- FIREBASE ---
firebase.initializeApp({
  apiKey: "AIzaSyBXYrQwpfcuAili1HvrmDGEWKjj_2j_lzY",
  authDomain: "proyectovendor.firebaseapp.com",
  projectId: "proyectovendor"
});
const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// --- VARIABLES GLOBALES ---
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let role = "usuario";

const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");

// --- MODAL ---
function openModal(content){ modal.style.display="flex"; modalBody.innerHTML=content; }
function closeModal(){ modal.style.display="none"; }
function showModalMessage(msg){ 
    openModal(`<div class="text-center py-4 text-lg font-bold text-zinc-800">${msg}</div>`); 
    setTimeout(closeModal,1500); 
}

// --- AUTENTICACIÓN ---
function showLoginForm(){
  openModal(`
    <div class="text-center mb-6">
      <h3 class="text-2xl font-black">Bienvenido</h3>
      <p class="text-zinc-500">Ingresa tus credenciales</p>
    </div>
    <input id="loginEmail" placeholder="Correo electrónico" class="w-full rounded-xl p-4 mb-3">
    <input id="loginPass" placeholder="Contraseña" type="password" class="w-full rounded-xl p-4 mb-4">
    <button onclick="login()" class="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition mb-3">Entrar</button>
    <div class="flex justify-between text-sm text-zinc-500 px-1">
      <button onclick="showResetPass()" class="hover:text-indigo-600">¿Olvidaste tu contraseña?</button>
      <button onclick="loginWithGoogle()" class="font-bold text-indigo-600 hover:underline">Acceso Google</button>
    </div>
  `);
}

function showRegisterForm(){
  openModal(`
    <div class="text-center mb-6">
      <h3 class="text-2xl font-black">Crear Cuenta</h3>
    </div>
    <input id="regEmail" placeholder="Email" class="w-full rounded-xl p-4 mb-3">
    <input id="regPass" placeholder="Contraseña" type="password" class="w-full rounded-xl p-4 mb-4">
    <button onclick="register()" class="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-zinc-800 transition mb-3">Registrarse</button>
    <button onclick="loginWithGoogle()" class="w-full border border-zinc-200 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-50 transition font-medium">
      <i class="fab fa-google"></i> Continuar con Google
    </button>
  `);
}

function showResetPass(){
  const email = prompt("Ingrese su correo para recuperar contraseña:");
  if(email) auth.sendPasswordResetEmail(email).then(()=>alert("Correo enviado")).catch(e=>alert(e.message));
}

function login(){
  const email=document.getElementById("loginEmail").value;
  const pass=document.getElementById("loginPass").value;
  auth.signInWithEmailAndPassword(email,pass).then(u=>{ closeModal(); initUser(u.user); }).catch(e=>alert(e.message));
}

function register(){
  const email=document.getElementById("regEmail").value;
  const pass=document.getElementById("regPass").value;
  auth.createUserWithEmailAndPassword(email,pass).then(u=>{ closeModal(); initUser(u.user); }).catch(e=>alert(e.message));
}

function loginWithGoogle(){
  auth.signInWithPopup(provider).then(result => { closeModal(); initUser(result.user); }).catch(e=>alert(e.message));
}

function logout(){ auth.signOut().then(()=>location.reload()); }

// --- INICIALIZAR USUARIO ---
async function initUser(user){
  document.getElementById("authButtons").style.display="none";
  document.getElementById("userInfo").style.display="flex";
  document.getElementById("userEmail").innerText=user.email;
  const docRef = db.collection("users").doc(user.uid);
  const docSnap = await docRef.get();
  if(!docSnap.exists){ await docRef.set({pais:'',residencia:'',name:user.displayName||'',email:user.email}); }
  role = (user.email==="admin@vendors.com") ? "admin" : "usuario";
  document.getElementById("dashboard").style.display="block";
  toggleAdmin();
  setUpTabs();
  loadProducts();
  loadOrders();
  loadUserOrders();
  renderCart();
}

// --- CONFIGURACIÓN ---
async function openConfig(){
  const user = auth.currentUser;
  const docSnap = await db.collection("users").doc(user.uid).get();
  const data = docSnap.data();
  openModal(`<h3 class="text-xl font-bold mb-4">Mi Perfil</h3>
    <div class="space-y-3">
        <input id="configName" placeholder="Nombre" value="${data.name||''}" class="w-full p-3 rounded-lg">
        <input id="configEmail" placeholder="Email" value="${data.email||''}" class="w-full p-3 rounded-lg">
        <input id="configCountry" placeholder="País" value="${data.pais||''}" class="w-full p-3 rounded-lg">
        <input id="configResidence" placeholder="Residencia" value="${data.residencia||''}" class="w-full p-3 rounded-lg">
        <input id="configPass" placeholder="Nueva contraseña (opcional)" type="password" class="w-full p-3 rounded-lg">
        <button onclick="updateConfig()" class="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">Guardar Cambios</button>
    </div>`);
}

async function updateConfig(){
  const user = auth.currentUser;
  const name=document.getElementById("configName").value;
  const email=document.getElementById("configEmail").value;
  const pais=document.getElementById("configCountry").value;
  const residencia=document.getElementById("configResidence").value;
  const pass=document.getElementById("configPass").value;
  await db.collection("users").doc(user.uid).update({name,email,pais,residencia});
  if(name) user.updateProfile({displayName:name});
  if(email) user.updateEmail(email).catch(e=>alert(e.message));
  if(pass) user.updatePassword(pass).catch(e=>alert(e.message));
  showModalMessage("Configuración actualizada");
}

// --- TABS ---
function setUpTabs(){
  document.querySelectorAll(".tab-btn").forEach(btn=>{
    btn.onclick = () => {
      document.querySelectorAll(".tab-btn").forEach(b=>{
          b.classList.remove("active", "bg-white", "shadow-sm", "text-indigo-600");
          b.classList.add("text-zinc-500");
      });
      btn.classList.add("active", "bg-white", "shadow-sm", "text-indigo-600");
      btn.classList.remove("text-zinc-500");
      document.querySelectorAll(".tab-content").forEach(tab=>tab.classList.remove("active"));
      document.getElementById(btn.dataset.tab).classList.add("active");
    };
    if(btn.classList.contains("active")) btn.click();
  });
}

function toggleAdmin(){ 
  if(role==="admin"){
     document.querySelector("[data-tab='adminTab']").classList.remove("hidden");
  }
}

// --- PRODUCTOS ---
async function loadProducts(){
  const productsList = document.getElementById("productsList");
  productsList.innerHTML = `<div class="col-span-full py-10 text-center text-zinc-400">Cargando catálogo...</div>`;
  db.collection("products").onSnapshot(snapshot=>{
    let html="";
    snapshot.forEach(doc=>{
      const p = doc.data();
      html+=`
      <div class="product-card bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col">
        <div class="h-48 rounded-xl overflow-hidden bg-zinc-100 mb-4 relative">
            ${p.media ? (p.media.includes('video') ? `<video src="${p.media}" class="w-full h-full object-cover" muted loop onmouseover="this.play()" onmouseout="this.pause()"></video>` : `<img src="${p.media}" class="w-full h-full object-cover">`) : `<div class="flex items-center justify-center h-full text-zinc-300"><i class="fas fa-image text-3xl"></i></div>`}
            <div class="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-lg font-bold">$${p.price}</div>
        </div>
        <div class="flex-grow">
            <h4 class="font-bold text-lg text-zinc-800">${p.name}</h4>
            <p class="text-zinc-500 text-sm line-clamp-2 mb-4">${p.description}</p>
        </div>
        <div class="actions mt-auto flex gap-2">
          <button onclick="addToCart('${doc.id}','${p.name}',${p.price},'${p.media||''}')" class="flex-grow bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2">
            <i class="fa fa-cart-plus"></i> Añadir
          </button>
          ${role==='admin'?`
          <button onclick="editProductForm('${doc.id}')" class="bg-zinc-100 p-2 rounded-lg text-zinc-600 hover:bg-indigo-100 hover:text-indigo-600 transition"><i class="fa fa-edit"></i></button>
          <button onclick="deleteProduct('${doc.id}')" class="bg-zinc-100 p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-500 transition"><i class="fa fa-trash"></i></button>`:''}
        </div>
      </div>`;
    });
    productsList.innerHTML = html || `<div class="col-span-full text-center py-10 text-zinc-400">No hay productos disponibles</div>`;
  });
}

// --- SUBIR PRODUCTO ---
async function uploadProduct(){
  const name=document.getElementById("name").value.trim();
  const desc=document.getElementById("description").value.trim();
  const price=parseFloat(document.getElementById("price").value);
  const mediaFile=document.getElementById("media").files[0];
  if(!name||!desc||!price) return alert("Completa todos los campos");
  let mediaUrl="";
  if(mediaFile){
    const data = new FormData();
    data.append("file", mediaFile);
    data.append("upload_preset","vendors_preset");
    const res = await fetch(`https://api.cloudinary.com/v1_1/df79cjklp/upload`, {method:"POST", body:data});
    const json = await res.json();
    mediaUrl = json.secure_url;
  }
  db.collection("products").add({name, description:desc, price, media:mediaUrl})
    .then(()=>{ showModalMessage("✅ Producto subido"); document.getElementById("name").value=''; document.getElementById("description").value=''; document.getElementById("price").value=''; document.getElementById("media").value=''; })
    .catch(e=>alert(e.message));
}

// --- AGREGAR AL CARRITO ---
function addToCart(id,name,price,media){
  cart.push({id,name,price,media,qty:1});
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
  showModalMessage("Producto agregado al carrito");
}

// --- RENDER CARRITO ---
function renderCart(){
  const cartList=document.getElementById("cartList");
  if(cart.length===0){ cartList.innerHTML="<i>Carrito vacío</i>"; return; }
  let html="";
  let total=0;
  cart.forEach((item,i)=>{
    total+=item.price*item.qty;
    html+=`
      <div class="flex justify-between items-center p-3 bg-zinc-50 rounded-xl">
        <div class="flex items-center gap-3">
          ${item.media?`<img src="${item.media}" class="w-12 h-12 object-cover rounded-lg">`:`<i class="fas fa-box text-2xl text-zinc-300"></i>`}
          <div>
            <p class="font-bold text-zinc-800">${item.name}</p>
            <p class="text-zinc-500 text-sm">$${item.price} x ${item.qty}</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button onclick="changeQty(${i},-1)" class="px-2 bg-zinc-200 rounded-lg">-</button>
          <button onclick="changeQty(${i},1)" class="px-2 bg-zinc-200 rounded-lg">+</button>
          <button onclick="removeFromCart(${i})" class="px-2 bg-red-200 rounded-lg"><i class="fa fa-trash"></i></button>
        </div>
      </div>
    `;
  });
  html+=`<p class="font-bold text-right mt-2">Total: $${total}</p>`;
  cartList.innerHTML=html;
}

// --- CAMBIAR CANTIDAD ---
function changeQty(index,delta){
  cart[index].qty+=delta;
  if(cart[index].qty<1) cart[index].qty=1;
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}

// --- REMOVER PRODUCTO ---
function removeFromCart(index){
  cart.splice(index,1);
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}

// --- VACIAR CARRITO ---
function emptyCart(){
  cart=[];
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}

// --- FORMULARIO DE COMPRA ---
function openPurchaseForm(){
  if(cart.length===0) return showModalMessage("Carrito vacío");
  let itemsHtml="";
  cart.forEach(it=>itemsHtml+=`<li>${it.name} x${it.qty} - $${it.price*it.qty}</li>`);
  openModal(`
    <h3 class="text-xl font-bold mb-4">Confirmar Compra</h3>
    <ul class="mb-4 list-disc list-inside">${itemsHtml}</ul>
    <p class="mb-4 font-bold">Total: $${cart.reduce((a,b)=>a+b.price*b.qty,0)}</p>
    <p class="mb-2 font-semibold">Pago por Yappy: +507 63892022</p>
    <p class="mb-2 font-semibold">ACH:</p>
    <p class="mb-2 text-sm">EMANUEL CLEMENTE CEDEÑO MORAN<br>Banco General<br>Cuenta de ahorros 0454966165208</p>
    <input type="file" id="paymentProof" accept="image/*" class="mb-3 w-full">
    <button onclick="submitPurchase()" class="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition">Enviar Comprobante</button>
  `);
}

// --- ENVIAR COMPRA ---
async function submitPurchase(){
  const proof=document.getElementById("paymentProof").files[0];
  if(!proof) return alert("Debes adjuntar el comprobante");
  const data=new FormData();
  data.append("file",proof);
  data.append("upload_preset","vendors_preset");
  const res=await fetch(`https://api.cloudinary.com/v1_1/df79cjklp/upload`, {method:"POST",body:data});
  const json=await res.json();
  const proofUrl=json.secure_url;
  const user=auth.currentUser;
  await db.collection("orders").add({
    user:user.uid,
    email:user.email,
    items:cart,
    total:cart.reduce((a,b)=>a+b.price*b.qty,0),
    proof:proofUrl,
    status:"revision",
    createdAt:firebase.firestore.FieldValue.serverTimestamp()
  });
  showModalMessage("Compra enviada correctamente");
  cart=[];
  localStorage.setItem("cart",JSON.stringify(cart));
  renderCart();
  closeModal();
  loadUserOrders();
  loadOrders();
}

// --- CARGAR MIS COMPRAS ---
function loadUserOrders(){
  const user=auth.currentUser;
  db.collection("orders").where("user","==",user.uid).orderBy("createdAt","desc").onSnapshot(snapshot=>{
    const history=document.getElementById("purchaseHistory");
    let html="";
    snapshot.forEach(doc=>{
      const o=doc.data();
      html+=`
        <div class="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center">
          <div>
            <p class="font-bold">${o.items.map(i=>i.name).join(", ")}</p>
            <p class="text-zinc-500 text-sm">Total: $${o.total} - Estado: <span class="status-badge status-${o.status.replace(" ","-")}">${o.status}</span></p>
          </div>
        </div>
      `;
    });
    history.innerHTML=html || "<i>No hay compras</i>";
  });
}

// --- CARGAR SOLICITUDES ADMIN ---
function loadOrders(){
  if(role!=="admin") return;
  db.collection("orders").orderBy("createdAt","desc").onSnapshot(snapshot=>{
    const list=document.getElementById("ordersList");
    let html="";
    snapshot.forEach(doc=>{
      const o=doc.data();
      html+=`
        <div class="bg-white p-4 rounded-xl shadow-sm">
          <p class="font-bold">${o.items.map(i=>i.name).join(", ")}</p>
          <p class="text-zinc-500 text-sm">Usuario: ${o.email} - Total: $${o.total} - Estado: <span class="status-badge status-${o.status.replace(" ","-")}">${o.status}</span></p>
          <button onclick="viewOrder('${doc.id}')" class="mt-2 bg-indigo-600 text-white py-1 px-3 rounded-lg text-sm hover:bg-indigo-700 transition">Ver</button>
        </div>
      `;
    });
    list.innerHTML=html || "<i>No hay pedidos</i>";
  });
}

async function viewOrder(id){
  const doc=await db.collection("orders").doc(id).get();
  const o=doc.data();
  let itemsHtml=o.items.map(i=>`<li>${i.name} x${i.qty} - $${i.price*i.qty}</li>`).join("");
  openModal(`
    <h3 class="text-xl font-bold mb-4">Pedido de ${o.email}</h3>
    <ul class="list-disc list-inside mb-4">${itemsHtml}</ul>
    <p class="mb-2 font-bold">Total: $${o.total}</p>
    <p class="mb-4">Estado: <span class="status-badge status-${o.status.replace(" ","-")}">${o.status}</span></p>
    <img src="${o.proof}" class="rounded-xl w-full mb-4">
    ${role==="admin"?`
      <div class="flex gap-2">
        <button onclick="updateOrderStatus('${id}','verificado')" class="bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition">Verificado</button>
        <button onclick="updateOrderStatus('${id}','en-camino')" class="bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition">En Camino</button>
        <button onclick="updateOrderStatus('${id}','finalizado')" class="bg-zinc-500 text-white py-2 px-4 rounded-lg hover:bg-zinc-600 transition">Finalizado</button>
        <button onclick="updateOrderStatus('${id}','cancelada')" class="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition">Cancelar</button>
      </div>`:""}
  `);
}

function updateOrderStatus(id,status){
  db.collection("orders").doc(id).update({status});
  closeModal();
  loadOrders();
}

// --- FILTRAR PRODUCTOS ---
function filterProducts(){
  const search=document.getElementById("search").value.toLowerCase();
  const maxPrice=parseFloat(document.getElementById("maxPrice").value)||Infinity;
  document.querySelectorAll("#productsList .product-card").forEach(card=>{
    const name=card.querySelector("h4").innerText.toLowerCase();
    const price=parseFloat(card.querySelector(".absolute").innerText.replace('$',''));
    card.style.display = (name.includes(search) && price<=maxPrice) ? "flex" : "none";
  });
}

// --- EDITAR PRODUCTO ---
async function editProductForm(id){
  const doc=await db.collection("products").doc(id).get();
  const p=doc.data();
  openModal(`
    <h3 class="text-xl font-bold mb-4">Editar Producto</h3>
    <input id="editName" class="w-full p-3 rounded-lg mb-3" value="${p.name}">
    <textarea id="editDesc" class="w-full p-3 rounded-lg mb-3">${p.description}</textarea>
    <input id="editPrice" type="number" class="w-full p-3 rounded-lg mb-3" value="${p.price}">
    <button onclick="updateProduct('${id}')" class="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition">Actualizar</button>
  `);
}

function updateProduct(id){
  const name=document.getElementById("editName").value;
  const desc=document.getElementById("editDesc").value;
  const price=parseFloat(document.getElementById("editPrice").value);
  db.collection("products").doc(id).update({name,description:desc,price});
  closeModal();
}

// --- ELIMINAR PRODUCTO ---
function deleteProduct(id){
  if(confirm("¿Seguro que deseas eliminar este producto?")){
    db.collection("products").doc(id).delete();
  }
}
