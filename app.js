// --- FIREBASE CONFIG ---
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

// --- AUTH ---
function showLoginForm(){
  openModal(`<div class="text-center mb-6"><h3 class="text-2xl font-black">Bienvenido</h3><p class="text-zinc-500">Ingresa tus credenciales</p></div>
  <input id="loginEmail" placeholder="Correo electrónico" class="w-full rounded-xl p-4 mb-3">
  <input id="loginPass" placeholder="Contraseña" type="password" class="w-full rounded-xl p-4 mb-4">
  <button onclick="login()" class="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition mb-3">Entrar</button>
  <div class="flex justify-between text-sm text-zinc-500 px-1">
    <button onclick="showResetPass()" class="hover:text-indigo-600">¿Olvidaste tu contraseña?</button>
    <button onclick="loginWithGoogle()" class="font-bold text-indigo-600 hover:underline">Acceso Google</button>
  </div>`);
}

function showRegisterForm(){
  openModal(`<div class="text-center mb-6"><h3 class="text-2xl font-black">Crear Cuenta</h3></div>
  <input id="regEmail" placeholder="Email" class="w-full rounded-xl p-4 mb-3">
  <input id="regPass" placeholder="Contraseña" type="password" class="w-full rounded-xl p-4 mb-4">
  <button onclick="register()" class="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-zinc-800 transition mb-3">Registrarse</button>
  <button onclick="loginWithGoogle()" class="w-full border border-zinc-200 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-50 transition font-medium">
    <i class="fab fa-google"></i> Continuar con Google
  </button>`);
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

// --- INICIO SESION / CARGA ---
async function initUser(user){
  document.getElementById("authButtons").style.display="none";
  document.getElementById("userInfo").style.display="flex";
  document.getElementById("userEmail").innerText=user.email;
  const docRef = db.collection("users").doc(user.uid);
  const docSnap = await docRef.get();
  if(!docSnap.exists){ 
    await docRef.set({pais:'',residencia:'',name:user.displayName||'',email:user.email}); 
  }
  role = (user.email==="admin@vendors.com") ? "admin" : "usuario";
  document.getElementById("dashboard").style.display="block";
  toggleAdmin();
  setUpTabs();
  loadProducts();
  loadOrders();
  loadUserOrders();
  renderCart();
}

// --- CONFIGURACION USUARIO ---
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

// --- AÑADIR AL CARRITO ---
function addToCart(id,name,price,media){
  const index = cart.findIndex(p=>p.id===id);
  if(index>-1) cart[index].qty +=1;
  else cart.push({id,name,price,media,qty:1});
  localStorage.setItem("cart",JSON.stringify(cart));
  showModalMessage("Producto agregado al carrito");
  renderCart();
}

// --- RENDER CARRITO ---
function renderCart(){
  const list = document.getElementById("cartList");
  if(cart.length===0){ list.innerHTML="<i>Carrito vacío</i>"; return; }
  list.innerHTML = "";
  cart.forEach((p,i)=>{
    const div = document.createElement("div");
    div.className="flex justify-between items-center bg-zinc-50 p-3 rounded-xl";
    div.innerHTML=`
      <div class="flex items-center gap-3">
        ${p.media? `<img src="${p.media}" class="w-12 h-12 object-cover rounded-lg">` : `<i class="fas fa-box text-2xl"></i>`}
        <div>
          <p class="font-bold">${p.name}</p>
          <p class="text-sm text-zinc-500">$${p.price} x ${p.qty}</p>
        </div>
      </div>
      <div class="flex gap-2">
        <button onclick="changeQty(${i},-1)" class="bg-zinc-200 px-2 rounded-lg">-</button>
        <button onclick="changeQty(${i},1)" class="bg-zinc-200 px-2 rounded-lg">+</button>
      </div>`;
    list.appendChild(div);
  });
}

// --- CAMBIAR CANTIDAD ---
function changeQty(index,delta){
  cart[index].qty += delta;
  if(cart[index].qty<1) cart.splice(index,1);
  localStorage.setItem("cart",JSON.stringify(cart));
  renderCart();
}

// --- VACIAR CARRITO ---
function emptyCart(){ cart=[]; localStorage.setItem("cart",JSON.stringify(cart)); renderCart(); }

// --- COMPRAR ---
function openPurchaseForm(){
  if(cart.length===0) return showModalMessage("El carrito está vacío");
  let html = `<h3 class="text-xl font-bold mb-4">Finalizar Compra</h3>
  <p class="mb-3">Selecciona método de pago y sube comprobante:</p>
  <select id="paymentMethod" class="w-full p-3 mb-3 rounded-lg">
    <option value="yappy">Yappy: +507 63892022</option>
    <option value="ach">ACH: EMANUEL CLEMENTE CEDEÑO MORAN, Banco General, Ahorros: 0454966165208</option>
  </select>
  <div class="relative border-2 border-dashed border-zinc-200 p-4 rounded-lg text-center hover:border-indigo-400 transition cursor-pointer mb-4">
    <input id="paymentProof" type="file" accept="image/*,application/pdf" class="absolute inset-0 opacity-0 cursor-pointer">
    <p class="text-zinc-500 text-sm"><i class="fas fa-cloud-upload-alt block text-2xl mb-1"></i> Adjuntar comprobante de pago</p>
  </div>
  <button onclick="submitPurchase()" class="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition">Enviar Compra</button>`;
  openModal(html);
}

// --- ENVIAR COMPRA ---
async function submitPurchase(){
  const method = document.getElementById("paymentMethod").value;
  const file = document.getElementById("paymentProof").files[0];
  if(!file) return alert("Adjunta comprobante de pago");
  let url="";
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset","vendors_preset");
  const res = await fetch(`https://api.cloudinary.com/v1_1/df79cjklp/upload`, {method:"POST", body:data});
  const json = await res.json();
  url = json.secure_url;
  const user = auth.currentUser;
  const total = cart.reduce((a,c)=>a+c.price*c.qty,0);
  await db.collection("orders").add({
    userId:user.uid,
    userEmail:user.email,
    items:cart,
    total,
    method,
    proof:url,
    status:"en_revision",
    createdAt: firebase.firestore.Timestamp.now()
  });
  cart=[]; localStorage.setItem("cart",JSON.stringify(cart));
  closeModal(); renderCart(); loadUserOrders(); loadOrders();
  showModalMessage("Compra enviada correctamente, esperando revisión");
}

// --- MIS COMPRAS ---
function loadUserOrders(){
  const history = document.getElementById("purchaseHistory");
  history.innerHTML = "Cargando...";
  const user = auth.currentUser;
  db.collection("orders").where("userId","==",user.uid).orderBy("createdAt","desc").onSnapshot(snapshot=>{
    history.innerHTML = "";
    snapshot.forEach(doc=>{
      const o = doc.data();
      const div = document.createElement("div");
      div.className="bg-white p-4 rounded-xl shadow-md flex justify-between items-center";
      div.innerHTML=`
        <div>
          <p class="font-bold">Total: $${o.total}</p>
          <p class="text-sm text-zinc-500">Estado: <span class="status-badge ${statusClass(o.status)}">${o.status.replace("_"," ")}</span></p>
        </div>
        <button onclick="viewOrder('${doc.id}','user')" class="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition text-sm">Ver</button>`;
      history.appendChild(div);
    });
  });
}

// --- ADMIN ORDERS ---
function loadOrders(){
  if(role!=="admin") return;
  const ordersList = document.getElementById("ordersList");
  ordersList.innerHTML="Cargando...";
  db.collection("orders").orderBy("createdAt","desc").onSnapshot(snapshot=>{
    ordersList.innerHTML="";
    snapshot.forEach(doc=>{
      const o = doc.data();
      const div = document.createElement("div");
      div.className="bg-white p-4 rounded-xl shadow-md flex justify-between items-center";
      div.innerHTML=`
        <div>
          <p class="font-bold">${o.userEmail}</p>
          <p class="text-sm text-zinc-500">Total: $${o.total}</p>
          <p class="text-sm text-zinc-500">Estado: <span class="status-badge ${statusClass(o.status)}">${o.status.replace("_"," ")}</span></p>
        </div>
        <button onclick="viewOrder('${doc.id}','admin')" class="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition text-sm">Ver</button>`;
      ordersList.appendChild(div);
    });
  });
}

// --- VER ORDEN ---
async function viewOrder(id,who){
  const doc = await db.collection("orders").doc(id).get();
  const o = doc.data();
  let itemsHtml = o.items.map(p=>`<p>${p.name} x ${p.qty} - $${p.price}</p>`).join("");
  let html=`<h3 class="text-xl font-bold mb-3">${who==="admin"?"Detalle de Compra":"Mi Compra"}</h3>
    <p class="font-bold">Usuario: ${o.userEmail}</p>
    <p class="font-bold">Total: $${o.total}</p>
    <p class="font-bold">Metodo: ${o.method}</p>
    <p class="font-bold mb-3">Items:</p>${itemsHtml}
    <p class="font-bold mb-3">Comprobante:</p><a href="${o.proof}" target="_blank" class="text-indigo-600 underline">Ver archivo</a>
    <p class="font-bold mt-3">Estado:</p>
    ${who==="admin"?`
    <select id="changeStatus" class="w-full p-2 rounded-lg mb-3">
      <option value="en_revision" ${o.status==="en_revision"?"selected":""}>En Revisión</option>
      <option value="pago_confirmado" ${o.status==="pago_confirmado"?"selected":""}>Pago Confirmado</option>
      <option value="en_camino" ${o.status==="en_camino"?"selected":""}>En Camino</option>
      <option value="finalizado" ${o.status==="finalizado"?"selected":""}>Finalizado</option>
      <option value="cancelada" ${o.status==="cancelada"?"selected":""}>Cancelada</option>
    </select>
    <button onclick="updateOrderStatus('${id}')" class="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition">Actualizar Estado</button>`:`<span class="status-badge ${statusClass(o.status)}">${o.status.replace("_"," ")}</span>`}`;
  openModal(html);
}

// --- ACTUALIZAR ESTADO ---
function updateOrderStatus(id){
  const status = document.getElementById("changeStatus").value;
  db.collection("orders").doc(id).update({status}).then(()=>{ closeModal(); showModalMessage("Estado actualizado"); });
}

// --- FUNCIONES UTILES ---
function statusClass(status){
  switch(status){
    case "en_revision": return "status-revision";
    case "pago_confirmado": return "status-verificado";
    case "en_camino": return "status-en-camino";
    case "finalizado": return "status-finalizado";
    case "cancelada": return "status-cancelada";
    default: return "status-pendiente";
  }
}
