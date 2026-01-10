import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, onSnapshot, query, orderBy, doc, setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* FIREBASE */
const app = initializeApp({
  apiKey: "AIzaSyBXYrQwpfcuAili1HvrmDGEWKjj_2j_lzY",
  authDomain: "proyectovendor.firebaseapp.com",
  projectId: "proyectovendor"
});

const db = getFirestore(app);
const auth = getAuth(app);

let loginMode = true;

/* VISTAS */
window.showView = (id) => {
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
  document.getElementById(id).style.display = 'block';
};

/* TOGGLE LOGIN / REGISTER */
window.toggleAuth = () => {
  loginMode = !loginMode;
  document.getElementById('auth-title').innerText =
    loginMode ? "Iniciar Sesión" : "Registrarse";
};

/* AUTH FORM */
document.getElementById('auth-form').onsubmit = async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const pass = document.getElementById('password').value;

  try {
    if (loginMode) {
      await signInWithEmailAndPassword(auth, email, pass);
    } else {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      await setDoc(doc(db, "usuarios", res.user.uid), {
        email,
        rol: "user"
      });
    }
  } catch (err) {
    alert(err.message);
  }
};

/* SESIÓN */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    showView('landing');
    return;
  }

  document.getElementById('user-name').innerText =
    user.email.split('@')[0];

  showView('shop');
  loadProducts();
});

window.logout = () => signOut(auth);

/* PRODUCTOS */
function loadProducts() {
  const ref = query(collection(db, "productos"), orderBy("fecha", "desc"));

  onSnapshot(ref, snap => {
    const container = document.getElementById('products');
    container.innerHTML = "";

    snap.forEach(d => renderProduct(d.data()));
  });
}

function renderProduct(p) {
  const cat = document.getElementById('filter-cat').value;
  const price = document.getElementById('filter-price').value;

  if (cat !== "all" && p.categoria !== cat) return;
  if (price === "low" && p.precio > 50) return;
  if (price === "high" && p.precio <= 50) return;

  document.getElementById('products').innerHTML += `
    <div class="card">
      <img src="${p.mediaUrl}">
      <h4>${p.nombre}</h4>
      <p>$${p.precio}</p>
      <button class="btn" onclick="buy()">Comprar</button>
    </div>
  `;
}

window.buy = () => alert("Pedido enviado");

/* FILTROS */
document.getElementById('filter-cat').onchange = loadProducts;
document.getElementById('filter-price').onchange = loadProducts;
