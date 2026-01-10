/* =========================
   FIREBASE CONFIG
========================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBXYrQwpfcuAili1HvrmDGEWKjj_2j_lzY",
  authDomain: "proyectovendor.firebaseapp.com",
  projectId: "proyectovendor"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const appId = "vendors-pro-system-v2";

/* =========================
   VARIABLES GLOBALES
========================= */
let currentUserData = null;
let isRegisterMode = false;
let activeListeners = [];

/* =========================
   NAVEGACIÓN DE VISTAS
========================= */
window.navigateTo = (view) => {
  document.querySelectorAll(".view-section")
    .forEach(v => v.classList.remove("active"));

  const target = document.getElementById(`view-${view}`);
  if (target) target.classList.add("active");

  const modal = document.getElementById("modal-container");
  if (modal) modal.classList.add("hidden");
};

/* =========================
   AUTENTICACIÓN
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUserData = null;
    navigateTo("landing");
    return;
  }

  const profileRef = doc(
    db,
    "artifacts",
    appId,
    "users",
    user.uid,
    "settings",
    "profile"
  );

  const snap = await getDoc(profileRef);

  if (snap.exists()) {
    currentUserData = snap.data();
  } else {
    currentUserData = {
      uid: user.uid,
      email: user.email,
      name: localStorage.getItem("tmp_name") || user.email.split("@")[0],
      role: user.email.includes("admin") ? "admin" : "applicant",
      joined: Date.now()
    };
    await setDoc(profileRef, currentUserData);
  }

  buildSidebar();
  navigateTo("app");
});

/* =========================
   LOGIN / REGISTER
========================= */
document.getElementById("btn-auth-action").onclick = async () => {
  const email = document.getElementById("auth-email").value;
  const pass = document.getElementById("auth-pass").value;
  const name = document.getElementById("auth-name").value;

  try {
    if (isRegisterMode) {
      localStorage.setItem("tmp_name", name);
      await createUserWithEmailAndPassword(auth, email, pass);
    } else {
      await signInWithEmailAndPassword(auth, email, pass);
    }
  } catch (e) {
    alert(e.message);
  }
};

document.getElementById("btn-switch-auth").onclick = () => {
  isRegisterMode = !isRegisterMode;
  document.getElementById("register-fields").classList.toggle("hidden");
  document.getElementById("btn-auth-action").innerText =
    isRegisterMode ? "REGISTRARSE" : "INICIAR SESIÓN";
};

document.getElementById("btn-logout").onclick = () => signOut(auth);

/* =========================
   SIDEBAR
========================= */
function buildSidebar() {
  const nav = document.getElementById("sidebar-nav");
  const isAdmin = currentUserData.role === "admin";

  document.getElementById("user-display-name").innerText = currentUserData.name;
  document.getElementById("user-role-tag").innerText =
    isAdmin ? "Administrador" : "Solicitante";
  document.getElementById("user-avatar").innerText =
    currentUserData.name[0].toUpperCase();

  const menu = isAdmin
    ? [
        { id: "dash", label: "Dashboard", icon: "fa-chart-line" },
        { id: "stock", label: "Inventario", icon: "fa-boxes-stacked" },
        { id: "orders", label: "Solicitudes", icon: "fa-clipboard-check" }
      ]
    : [
        { id: "shop", label: "Catálogo", icon: "fa-store" },
        { id: "my-req", label: "Mis pedidos", icon: "fa-clock-rotate-left" }
      ];

  nav.innerHTML = menu
    .map(
      m => `
    <button id="tab-${m.id}" onclick="loadTab('${m.id}')" 
      class="w-full flex gap-3 px-5 py-4 rounded-xl font-bold text-sm text-slate-400">
      <i class="fas ${m.icon}"></i> ${m.label}
    </button>`
    )
    .join("");

  loadTab(isAdmin ? "dash" : "shop");
}

/* =========================
   TABS
========================= */
window.loadTab = (tab) => {
  activeListeners.forEach(unsub => unsub());
  activeListeners = [];

  document.querySelectorAll("#sidebar-nav button")
    .forEach(b => b.classList.remove("bg-sky-500","text-slate-950"));

  const btn = document.getElementById(`tab-${tab}`);
  if (btn) btn.classList.add("bg-sky-500","text-slate-950");

  const area = document.getElementById("app-dynamic-view");

  if (tab === "dash") viewDashboard();
  if (tab === "stock") viewInventory();
  if (tab === "orders") viewAdminOrders();
  if (tab === "shop") viewCatalog();
  if (tab === "my-req") viewUserRequests();
};

/* =========================
   VISTAS
========================= */
function viewDashboard() {
  document.getElementById("app-dynamic-view").innerHTML = `
    <h2 class="text-4xl font-black mb-6">Dashboard</h2>
    <p class="text-slate-400">Panel general del sistema</p>
  `;
}

function viewInventory() {
  document.getElementById("app-dynamic-view").innerHTML = `
    <h2 class="text-4xl font-black mb-6">Inventario</h2>
    <div id="inventory-list" class="grid gap-4"></div>
  `;

  activeListeners.push(
    onSnapshot(
      collection(db, "artifacts", appId, "public", "data", "inventory"),
      snap => {
        const list = document.getElementById("inventory-list");
        list.innerHTML = snap.docs.map(d => {
          const p = d.data();
          return `
            <div class="glass p-6 rounded-xl flex justify-between">
              <div>
                <h4 class="font-black">${p.name}</h4>
                <p class="text-xs text-slate-400">Stock: ${p.qty}</p>
              </div>
              <button onclick="deleteProduct('${d.id}')" class="text-red-500">
                <i class="fas fa-trash"></i>
              </button>
            </div>`;
        }).join("");
      }
    )
  );
}

function viewAdminOrders() {
  document.getElementById("app-dynamic-view").innerHTML =
    `<h2 class="text-4xl font-black mb-6">Solicitudes</h2>`;
}

function viewCatalog() {
  document.getElementById("app-dynamic-view").innerHTML =
    `<h2 class="text-4xl font-black mb-6">Catálogo</h2>`;
}

function viewUserRequests() {
  document.getElementById("app-dynamic-view").innerHTML =
    `<h2 class="text-4xl font-black mb-6">Mis pedidos</h2>`;
}

/* =========================
   ACCIONES
========================= */
window.deleteProduct = async (id) => {
  if (confirm("¿Eliminar producto?")) {
    await deleteDoc(
      doc(db, "artifacts", appId, "public", "data", "inventory", id)
    );
  }
};
