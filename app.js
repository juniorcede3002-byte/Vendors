/* ================= FIREBASE ================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* FIREBASE CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSyBXYrQwpfcuAili1HvrmDGEWKjj_2j_lzY",
  authDomain: "proyectovendor.firebaseapp.com",
  projectId: "proyectovendor"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* CLOUDINARY CONFIG */
const CLOUD_NAME = "df79cjklp";
const UPLOAD_PRESET = "vendors_preset";

/* ================= DOM ================= */
const $ = id => document.getElementById(id);
const sections = ["landing", "auth", "store", "admin"];

const show = id => {
  sections.forEach(s => $(s).classList.add("hidden"));
  $(id).classList.remove("hidden");
};

/* ================= AUTH ================= */
$("goAuth").onclick = () => show("auth");

$("login").onclick = () =>
  signInWithEmailAndPassword(auth, email.value, password.value);

$("register").onclick = () =>
  createUserWithEmailAndPassword(auth, email.value, password.value);

$("logout").onclick = () => signOut(auth);
$("logoutAdmin").onclick = () => signOut(auth);

/* ================= STORE ================= */
async function loadProducts() {
  products.innerHTML = "";
  const snap = await getDocs(collection(db, "products"));

  snap.forEach(d => {
    const p = d.data();
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <img src="${p.img}">
      <h3>${p.name}</h3>
      <p>$${p.price}</p>
      <button>Comprar</button>
    `;

    div.querySelector("button").onclick = () => buy(p);
    products.appendChild(div);
  });
}

async function buy(p) {
  await addDoc(collection(db, "orders"), {
    user: auth.currentUser.email,
    product: p.name,
    price: p.price,
    status: "pendiente",
    date: Date.now()
  });
  alert("Compra enviada");
}

/* ================= ADMIN ================= */
$("addProduct").onclick = async () => {
  const file = pImg.files[0];
  if (!file) return alert("Selecciona una imagen");

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: form }
  );

  const data = await res.json();

  await addDoc(collection(db, "products"), {
    name: pName.value,
    price: Number(pPrice.value),
    img: data.secure_url
  });

  alert("Producto agregado");
};

onSnapshot(collection(db, "orders"), snap => {
  orders.innerHTML = "";
  snap.forEach(d => {
    const o = d.data();
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <p>${o.user} - ${o.product} - ${o.status}</p>
      <button>Aprobar</button>
      <button>Rechazar</button>
    `;

    div.children[1].onclick = () =>
      updateDoc(doc(db, "orders", d.id), { status: "aprobado" });

    div.children[2].onclick = () =>
      updateDoc(doc(db, "orders", d.id), { status: "rechazado" });

    orders.appendChild(div);
  });
});

/* ================= SESSION ================= */
onAuthStateChanged(auth, user => {
  if (!user) return show("landing");

  if (user.email === "admin@vendors.com") {
    show("admin");
  } else {
    show("store");
    loadProducts();
  }
});
