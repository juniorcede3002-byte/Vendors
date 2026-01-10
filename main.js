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

/* 🔥 FIREBASE CONFIG */
const app = initializeApp({
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID"
});

const db = getFirestore(app);
const auth = getAuth(app);

let loginMode = true;
let currentUser = null;

/* 👁️ VIEWS */
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
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;

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

/* 🛍️ PRODUCTS */
function loadProducts() {
  const ref = query(collection(db, "productos"), orderBy("precio"));

  onSnapshot(ref, snap => {
    document.getElementById("products").innerHTML = "";
    snap.forEach(d => {
      const p = d.data();
      document.getElementById("products").innerHTML += `
        <div class="card">
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
    date: Date.now()
  });
};

/* 📦 USER ORDERS */
function loadOrders() {
  onSnapshot(collection(db, "orders"), snap => {
    document.getElementById("orders").innerHTML = "";
    snap.forEach(d => {
      const o = d.data();
      if (o.user === currentUser.email) {
        document.getElementById("orders").innerHTML += `
          <div class="card">
            ${o.product}<br>
            Estado: <b>${o.status}</b>
          </div>
        `;
      }
    });
  });
}

/* 👑 ADMIN */
function loadAdminOrders() {
  onSnapshot(collection(db, "orders"), snap => {
    document.getElementById("admin-orders").innerHTML = "";
    snap.forEach(d => {
      const o = d.data();
      document.getElementById("admin-orders").innerHTML += `
        <div class="card">
          <b>${o.user}</b><br>
          ${o.product} - $${o.price}<br>
          Estado: ${o.status}<br><br>
          <button onclick="updateStatus('${d.id}','Aprobado')">Aprobar</button>
          <button onclick="updateStatus('${d.id}','Rechazado')">Rechazar</button>
        </div>
      `;
    });
  });
}

window.updateStatus = async (id, status) => {
  await updateDoc(doc(db, "orders", id), { status });
};
