import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  query, orderBy, updateDoc, doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* 🔥 FIREBASE */
const firebaseConfig = {
  apiKey: "AIzaSyBXYrQwpfcuAili1HvrmDGEWKjj_2j_lzY",
  authDomain: "proyectovendor.firebaseapp.com",
  projectId: "proyectovendor"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* ☁️ CLOUDINARY */
const CLOUD_NAME = "df79cjklp";
const UPLOAD_PRESET = "vendors_preset";

let loginMode = true;
let currentUser = null;

/* 👁️ VISTAS */
window.showView = (id) => {
  document.querySelectorAll(".view").forEach(v => v.style.display = "none");
  document.getElementById(id).style.display = "block";
};

showView("landing");

/* 🔐 AUTH */
window.toggleAuth = () => {
  loginMode = !loginMode;
  document.getElementById("auth-title").innerText =
    loginMode ? "Iniciar Sesión" : "Crear Cuenta";
};

document.getElementById("auth-form").onsubmit = async (e) => {
  e.preventDefault();
  const email = emailInput.value;
  const pass = passwordInput.value;

  try {
    if (loginMode) {
      await signInWithEmailAndPassword(auth, email, pass);
    } else {
      await createUserWithEmailAndPassword(auth, email, pass);
    }
  } catch (err) {
    alert(err.message);
  }
};

onAuthStateChanged(auth, user => {
  if (!user) return showView("landing");

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

/* 🧑‍💼 ADMIN – SUBIR PRODUCTO */
const productForm = document.getElementById("product-form");
if (productForm) {
  productForm.onsubmit = async (e) => {
    e.preventDefault();

    const file = document.getElementById("product-image").files[0];
    const name = document.getElementById("product-name").value;
    const price = parseFloat(document.getElementById("product-price").value);

    if (!file) return alert("Selecciona una imagen");

    try {
      /* ☁️ SUBIR A CLOUDINARY */
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", UPLOAD_PRESET);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: data }
      );

      const img = await res.json();

      /* 🔥 GUARDAR EN FIRESTORE */
      await addDoc(collection(db, "productos"), {
        nombre: name,
        precio: price,
        imagen: img.secure_url,
        fecha: Date.now()
      });

      alert("Producto publicado");
      productForm.reset();

    } catch {
      alert("Error subiendo imagen");
    }
  };
}

/* 🛍️ PRODUCTOS */
function loadProducts() {
  const ref = query(collection(db, "productos"), orderBy("fecha", "desc"));
  onSnapshot(ref, snap => {
    products.innerHTML = "";
    snap.forEach(d => {
      const p = d.data();
      products.innerHTML += `
        <div class="card">
          <img src="${p.imagen}">
          <h4>${p.nombre}</h4>
          <p>$${p.precio}</p>
          <button onclick="buy('${p.nombre}', ${p.precio})">Comprar</button>
        </div>
      `;
    });
  });
}

window.buy = async (product, price) => {
  await addDoc(collection(db, "orders"), {
    user: currentUser.email,
    product,
    price,
    status: "Pendiente",
    fecha: Date.now()
  });
};

/* 📦 PEDIDOS */
function loadOrders() {
  onSnapshot(collection(db, "orders"), snap => {
    orders.innerHTML = "";
    snap.forEach(d => {
      const o = d.data();
      if (o.user === currentUser.email) {
        orders.innerHTML += `
          <div class="card">${o.product} - ${o.status}</div>
        `;
      }
    });
  });
}

/* 👑 ADMIN */
function loadAdminOrders() {
  onSnapshot(collection(db, "orders"), snap => {
    adminOrders.innerHTML = "";
    snap.forEach(d => {
      const o = d.data();
      adminOrders.innerHTML += `
        <div class="card">
          ${o.user} – ${o.product}<br>
          <button onclick="updateStatus('${d.id}','Aprobado')">Aprobar</button>
          <button onclick="updateStatus('${d.id}','Rechazado')">Rechazar</button>
        </div>
      `;
    });
  });
}

window.updateStatus = async (id, status) =>
  updateDoc(doc(db, "orders", id), { status });
