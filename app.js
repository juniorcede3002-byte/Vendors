/* ================== FIREBASE ================== */
firebase.initializeApp({
  apiKey: "AIzaSyBXYrQwpfcuAili1HvrmDGEWKjj_2j_lzY",
  authDomain: "proyectovendor.firebaseapp.com",
  projectId: "proyectovendor"
});

const auth = firebase.auth();
const db = firebase.firestore();

/* ================== CLOUDINARY ================== */
const CLOUD_NAME = "df79cjklp";
const UPLOAD_PRESET = "vendors_preset";

/* ================== GLOBAL ================== */
let role = "usuario";
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let currentUser = null;

/* ================== AUTH ================== */
auth.onAuthStateChanged(async user=>{
  if(!user) return;
  currentUser = user;
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("authButtons").style.display="none";
  document.getElementById("userMenu").classList.remove("hidden");
  document.getElementById("userEmail").innerText = user.email;

  role = user.email === "admin@vendors.com" ? "admin" : "usuario";
  if(role==="admin") document.getElementById("adminTab").classList.remove("hidden");

  await ensureUserDoc(user);
  loadProducts();
  loadOrders();
  loadUserOrders();
});

/* ================== USERS ================== */
async function ensureUserDoc(user){
  const ref = db.collection("users").doc(user.uid);
  if(!(await ref.get()).exists){
    await ref.set({
      email:user.email,
      name:user.displayName||"",
      pais:"",
      residencia:"",
      role: user.email==="admin@vendors.com"?"admin":"usuario",
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}

/* ================== LOGIN ================== */
function showLogin(){
  openModal(`
    <h3>Iniciar sesión</h3>
    <input id="lEmail" placeholder="Email">
    <input id="lPass" type="password" placeholder="Contraseña">
    <button onclick="login()">Entrar</button>
    <button onclick="resetPass()">Olvidé mi contraseña</button>
  `);
}

function showRegister(){
  openModal(`
    <h3>Crear cuenta</h3>
    <input id="rEmail" placeholder="Email">
    <input id="rPass" type="password" placeholder="Contraseña">
    <button onclick="register()">Registrar</button>
  `);
}

function login(){
  auth.signInWithEmailAndPassword(
    lEmail.value, lPass.value
  ).then(closeModal).catch(e=>alert(e.message));
}

function register(){
  auth.createUserWithEmailAndPassword(
    rEmail.value, rPass.value
  ).then(closeModal).catch(e=>alert(e.message));
}

function loginGoogle(){
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
}

function resetPass(){
  const email = prompt("Correo:");
  if(email) auth.sendPasswordResetEmail(email);
}

function logout(){
  auth.signOut();
  location.reload();
}

/* ================== PRODUCTS ================== */
async function uploadProduct(){
  const name=pName.value.trim();
  const description=pDesc.value.trim();
  const price=Number(pPrice.value);
  const file=pMedia.files[0];

  let media="";
  if(file){
    const fd=new FormData();
    fd.append("file",file);
    fd.append("upload_preset",UPLOAD_PRESET);
    const r=await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,{method:"POST",body:fd});
    media=(await r.json()).secure_url;
  }

  await db.collection("products").add({name,description,price,media});
}

function loadProducts(){
  db.collection("products").onSnapshot(s=>{
    productsList.innerHTML="";
    s.forEach(d=>{
      const p=d.data();
      productsList.innerHTML+=`
      <div class="product">
        ${p.media?.includes("video")?`<video src="${p.media}" controls></video>`:`<img src="${p.media}">`}
        <h4>${p.name}</h4>
        <p>${p.description}</p>
        <b>$${p.price}</b>
        <button onclick='addToCart(${JSON.stringify(p)})'>Añadir</button>
      </div>`;
    });
  });
}

/* ================== CART ================== */
function addToCart(p){
  cart.push(p);
  localStorage.setItem("cart",JSON.stringify(cart));
}

function openPurchaseForm(){
  openModal(`
    <h3>Datos de compra</h3>
    <input id="cName" placeholder="Nombre">
    <input id="cPhone" placeholder="Teléfono">
    <input id="cWhats" placeholder="WhatsApp">
    <input id="cAddr" placeholder="Dirección">
    <button onclick="submitOrder()">Enviar solicitud</button>
  `);
}

async function submitOrder(){
  await db.collection("orders").add({
    userId: currentUser.uid,
    items: cart,
    status: "en_revision",
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  cart=[];
  localStorage.removeItem("cart");
  closeModal();
}

/* ================== ORDERS ================== */
function loadUserOrders(){
  if(!currentUser) return;
  db.collection("orders").where("userId","==",currentUser.uid)
    .onSnapshot(s=>{
      userOrders.innerHTML="";
      s.forEach(d=>{
        const o=d.data();
        userOrders.innerHTML+=`
          <div>
            Estado: ${o.status}
            <button onclick="viewOrder('${d.id}',false)">Ver</button>
          </div>`;
      });
    });
}

function loadOrders(){
  if(role!=="admin") return;
  db.collection("orders").onSnapshot(s=>{
    adminOrders.innerHTML="";
    s.forEach(d=>{
      adminOrders.innerHTML+=`
        <div>
          Pedido ${d.id}
          <button onclick="viewOrder('${d.id}',true)">Ver</button>
        </div>`;
    });
  });
}

async function viewOrder(id,isAdmin){
  const o=(await db.collection("orders").doc(id).get()).data();
  openModal(`
    <h3>Detalle</h3>
    <pre>${JSON.stringify(o,null,2)}</pre>
  `);
}

/* ================== MODAL ================== */
function openModal(html){
  modal.classList.remove("hidden");
  modalContent.innerHTML=html;
}
function closeModal(){
  modal.classList.add("hidden");
}