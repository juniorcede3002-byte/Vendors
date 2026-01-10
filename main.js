import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  query, orderBy, updateDoc, doc, where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBXYrQwpfcuAili1HvrmDGEWKjj_2j_lzY",
  authDomain: "proyectovendor.firebaseapp.com",
  projectId: "proyectovendor"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const CLOUD_NAME = "df79cjklp";
const UPLOAD_PRESET = "vendors_preset";

let loginMode = true;
let currentUser = null;

// ELEMENTOS UI
const productsGrid = document.getElementById("products");
const ordersDiv = document.getElementById("orders");
const adminOrdersDiv = document.getElementById("admin-orders");

window.showView = (id) => {
  document.querySelectorAll(".view").forEach(v => v.style.display = "none");
  document.getElementById(id).style.display = "block";
};

window.toggleAuth = () => {
  loginMode = !loginMode;
  document.getElementById("auth-title").innerText = loginMode ? "Iniciar Sesión" : "Crear Cuenta";
};

// --- AUTENTICACIÓN ---
document.getElementById("auth-form").onsubmit = async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;

  try {
    if (loginMode) {
      await signInWithEmailAndPassword(auth, email, pass);
    } else {
      await createUserWithEmailAndPassword(auth, email, pass);
    }
  } catch (err) { alert("Error: " + err.message); }
};

onAuthStateChanged(auth, user => {
  if (!user) {
    showView("landing");
    return;
  }
  currentUser = user;
  document.getElementById("user-name").innerText = user.email;

  if (user.email === "admin@vendors.com") {
    showView("admin");
    loadAdminOrders();
  } else {
    showView("shop");
    loadProducts();
    loadOrders();
  }
});

window.logout = () => signOut(auth);

// --- ADMIN: SUBIR ---
const productForm = document.getElementById("product-form");
if (productForm) {
  productForm.onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btn-upload");
    const file = document.getElementById("product-image").files[0];
    const name = document.getElementById("product-name").value;
    const price = parseFloat(document.getElementById("product-price").value);
    const cat = document.getElementById("product-cat").value;

    btn.innerText = "Subiendo..."; btn.disabled = true;

    try {
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", UPLOAD_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: data });
      const img = await res.json();

      await addDoc(collection(db, "productos"), {
        nombre: name, precio: price, categoria: cat, imagen: img.secure_url, fecha: Date.now()
      });

      alert("¡Producto publicado!");
      productForm.reset();
    } catch { alert("Error al subir"); }
    finally { btn.innerText = "Publicar Producto"; btn.disabled = false; }
  };
}

// --- TIENDA: PRODUCTOS ---
function loadProducts() {
  const q = query(collection(db, "productos"), orderBy("fecha", "desc"));
  onSnapshot(q, snap => {
    productsGrid.innerHTML = "";
    snap.forEach(d => {
      const p = d.data();
      productsGrid.innerHTML += `
        <div class="card">
          <img src="${p.imagen}">
          <span class="status-tag aprobado">${p.categoria}</span>
          <h4>${p.nombre}</h4>
          <p>$${p.price || p.precio}</p>
          <button class="btn-primary" onclick="buy('${p.nombre}', ${p.precio})">Comprar ahora</button>
        </div>`;
    });
  });
}

window.buy = async (product, price) => {
  await addDoc(collection(db, "orders"), {
    user: currentUser.email, product, price, status: "Pendiente", fecha: Date.now()
  });
  alert("Pedido enviado para aprobación");
};

// --- PEDIDOS CLIENTE ---
function loadOrders() {
  const q = query(collection(db, "orders"), where("user", "==", currentUser.email));
  onSnapshot(q, snap => {
    ordersDiv.innerHTML = "";
    snap.forEach(d => {
      const o = d.data();
      ordersDiv.innerHTML += `
        <div class="card" style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
          <span>${o.product}</span>
          <span class="status-tag ${o.status.toLowerCase()}">${o.status}</span>
        </div>`;
    });
  });
}

// --- ADMIN: GESTIÓN ---
function loadAdminOrders() {
  onSnapshot(query(collection(db, "orders"), orderBy("fecha", "desc")), snap => {
    adminOrdersDiv.innerHTML = "";
    snap.forEach(d => {
      const o = d.data();
      adminOrdersDiv.innerHTML += `
        <div class="card">
          <p><strong>Usuario:</strong> ${o.user}</p>
          <p><strong>Producto:</strong> ${o.product}</p>
          <div style="margin-top:10px; display:flex; gap:10px;">
            <button onclick="updateStatus('${d.id}','Aprobado')" style="background:#10b981">Aprobar</button>
            <button onclick="updateStatus('${d.id}','Rechazado')" style="background:#ef4444">Rechazar</button>
          </div>
        </div>`;
    });
  });
}

window.updateStatus = async (id, status) => updateDoc(doc(db, "orders", id), { status });