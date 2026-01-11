// ================= FIREBASE =================
firebase.initializeApp({
  apiKey: "AIzaSyBXYrQwpfcuAili1HvrmDGEWKjj_2j_lzY",
  authDomain: "proyectovendor.firebaseapp.com",
  projectId: "proyectovendor"
});

const auth = firebase.auth();
const db = firebase.firestore();
const CLOUD_NAME = "df79cjklp";
const UPLOAD_PRESET = "vendors_preset";

let cart = JSON.parse(localStorage.getItem("cart")) || [];
let currentUser = null;
let role = "usuario";

// ================= AUTH =================
auth.onAuthStateChanged(async user=>{
  if(!user) return;
  currentUser = user;
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("authButtons").style.display="none";
  document.getElementById("userMenu").classList.remove("hidden");
  document.getElementById("userEmail").innerText=user.email;

  role = user.email==="admin@vendors.com"?"admin":"usuario";
  if(role==="admin") document.getElementById("adminTabBtn").classList.remove("hidden");

  await ensureUserDoc(user);
  setUpTabs();
  loadProducts();
  loadUserOrders();
  if(role==="admin") loadAdminOrders();
});

// ================= USERS =================
async function ensureUserDoc(user){
  const ref = db.collection("users").doc(user.uid);
  if(!(await ref.get()).exists){
    await ref.set({email:user.email,name:user.displayName||"",pais:"",residencia:"",role:role});
  }
}

// ================= LOGIN / REGISTER =================
function showLogin(){
  openModal(`<h3>Login</h3><input id="lEmail" placeholder="Email"><input id="lPass" type="password" placeholder="Contraseña"><button onclick="login()">Entrar</button><button onclick="resetPass()">Olvidé mi contraseña</button>`);
}
function showRegister(){
  openModal(`<h3>Registrar</h3><input id="rEmail" placeholder="Email"><input id="rPass" type="password" placeholder="Contraseña"><button onclick="register()">Registrar</button>`);
}
function login(){ auth.signInWithEmailAndPassword(lEmail.value,lPass.value).then(closeModal).catch(e=>alert(e.message)); }
function register(){ auth.createUserWithEmailAndPassword(rEmail.value,rPass.value).then(closeModal).catch(e=>alert(e.message)); }
function loginGoogle(){ auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e=>alert(e.message)); }
function logout(){ auth.signOut(); location.reload(); }
function resetPass(){ const email = prompt("Correo:"); if(email) auth.sendPasswordResetEmail(email); }

// ================= TABS =================
function setUpTabs(){
  document.querySelectorAll(".tab-btn").forEach(btn=>{
    btn.onclick=()=>{
      document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".tab-content").forEach(tab=>tab.classList.remove("active"));
      document.getElementById(btn.dataset.tab).classList.add("active");
    };
  });
}

// ================= MODAL =================
function openModal(html){ modal.classList.remove("hidden"); modalContent.innerHTML=html; }
function closeModal(){ modal.classList.add("hidden"); }

// ================= PRODUCTS =================
async function uploadProduct(){
  const name=pName.value.trim();
  const desc=pDesc.value.trim();
  const price=Number(pPrice.value);
  const file=pMedia.files[0];
  if(!name||!desc||!price) return alert("Completa todos los campos");

  let media="";
  if(file){
    const fd=new FormData();
    fd.append("file",file);
    fd.append("upload_preset",UPLOAD_PRESET);
    const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,{method:"POST",body:fd});
    media=(await r.json()).secure_url;
  }

  await db.collection("products").add({name,description:desc,price,media});
  showModalMessage("Producto subido");
}

function loadProducts(){
  db.collection("products").onSnapshot(s=>{
    productsList.innerHTML="";
    s.forEach(d=>{
      const p=d.data();
      productsList.innerHTML+=`
      <div class="bg-white p-2 rounded shadow">
        ${p.media?.includes("video")?`<video src="${p.media}" controls></video>`:`<img src="${p.media}">`}
        <h4 class="font-bold">${p.name}</h4>
        <p>${p.description}</p>
        <b>$${p.price}</b>
        <div class="flex gap-1 mt-2">
          <button onclick='addToCart(${JSON.stringify(p)})' class="bg-indigo-600 text-white p-1 rounded">Añadir</button>
          ${role==="admin"?`<button onclick="editProduct('${d.id}')" class="bg-gray-200 p-1 rounded">Editar</button>`:""}
        </div>
      </div>`;
    });
  });
}

// ================= CART =================
function addToCart(p){ cart.push(p); localStorage.setItem("cart",JSON.stringify(cart)); alert("Añadido al carrito"); }
function updateCart(){ renderCart(); }
function emptyCart(){ cart=[]; localStorage.removeItem("cart"); renderCart(); }
function renderCart(){ cartList.innerHTML=""; cart.forEach((c,i)=>{cartList.innerHTML+=`<div>${c.name} - $${c.price} <button onclick="cart.splice(${i},1); updateCart()">Eliminar</button></div>`}); }

// ================= PURCHASE =================
function openPurchaseForm(){
  if(cart.length===0) return alert("Carrito vacío");
  openModal(`<h3>Compra</h3><input id="buyerName" placeholder="Nombre"><input id="buyerPhone" placeholder="Teléfono"><input id="buyerAddr" placeholder="Dirección"><button onclick="submitOrder()">Enviar</button>`);
}
async function submitOrder(){
  const name=document.getElementById("buyerName").value;
  const phone=document.getElementById("buyerPhone").value;
  const addr=document.getElementById("buyerAddr").value;
  if(!name||!phone||!addr) return alert("Completa todos los campos");
  await db.collection("orders").add({userId:currentUser.uid,items:cart,name,phone,addr,status:"en_revision",createdAt:firebase.firestore.FieldValue.serverTimestamp()});
  cart=[]; localStorage.removeItem("cart"); closeModal(); renderCart(); alert("Pedido enviado");
}

// ================= ORDERS =================
function loadUserOrders(){
  db.collection("orders").where("userId","==",currentUser.uid).onSnapshot(s=>{
    userOrders.innerHTML="";
    s.forEach(d=>{
      const o=d.data();
      userOrders.innerHTML+=`
        <div class="bg-white p-2 rounded shadow">
          Pedido: ${d.id} | Estado: ${o.status}
          <button onclick="viewOrder('${d.id}',false)">Ver</button>
        </div>`;
    });
  });
}

function loadAdminOrders(){
  db.collection("orders").onSnapshot(s=>{
    adminOrders.innerHTML="";
    s.forEach(d=>{
      const o=d.data();
      adminOrders.innerHTML+=`
        <div class="bg-white p-2 rounded shadow">
          Pedido: ${d.id} | Estado: ${o.status}
          <button onclick="viewOrder('${d.id}',true)">Ver</button>
        </div>`;
    });
  });
}

async function viewOrder(id,isAdmin){
  const o = (await db.collection("orders").doc(id).get()).data();
  let buttons="";
  if(o.status==="en_revision"){
    if(isAdmin) buttons=`<button onclick="updateOrder('${id}','pago_confirmado')">Confirmar Pago</button><button onclick="cancelOrder('${id}','Cancelado por Admin')">Cancelar</button>`;
    else buttons=`<button onclick="cancelOrder('${id}','Cancelado por Usuario')">Cancelar</button>`;
  }
  openModal(`<pre>${JSON.stringify(o,null,2)}</pre>${buttons}`);
}

async function updateOrder(id,status){ await db.collection("orders").doc(id).update({status}); closeModal(); }
async function cancelOrder(id,motivo){ await db.collection("orders").doc(id).update({status:"cancelado",motivo}); closeModal(); }

// ================= UI =================
function showModalMessage(msg){ openModal(`<p>${msg}</p>`); setTimeout(closeModal,1500); }
