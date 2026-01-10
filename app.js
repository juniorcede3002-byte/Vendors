import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBXYrQwpfcuAili1HvrmDGEWKjj_2j_lzY",
    authDomain: "proyectovendor.firebaseapp.com",
    projectId: "proyectovendor"
};

// Cloudinary Config (Unsigned preset)
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/demo/image/upload";
const CLOUDINARY_PRESET = "ml_default"; 

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let userData = null;
let isRegister = false;

// --- ELEMENTOS UI ---
const authBtn = document.getElementById('btn-auth-action');
const toggleAuthText = document.getElementById('toggle-auth');
const regFields = document.getElementById('reg-fields');

// --- AUTENTICACIÓN ---
window.toggleAuth = () => {
    isRegister = !isRegister;
    regFields.classList.toggle('hidden', !isRegister);
    authBtn.innerText = isRegister ? 'Registrarse' : 'Entrar';
    toggleAuthText.innerText = isRegister ? '¿Ya tienes cuenta? Entra' : '¿No tienes cuenta? Regístrate';
};
toggleAuthText.onclick = window.toggleAuth;

authBtn.onclick = async () => {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    const name = document.getElementById('auth-name').value;

    try {
        if (isRegister) {
            const res = await createUserWithEmailAndPassword(auth, email, pass);
            const role = email.includes('admin') ? 'admin' : 'user';
            await setDoc(doc(db, "users", res.user.uid), { name, email, role });
        } else {
            await signInWithEmailAndPassword(auth, email, pass);
        }
    } catch (e) { alert(e.message); }
};

document.getElementById('btn-logout').onclick = () => signOut(auth);

// --- ESTADO DE SESIÓN ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        userData = snap.exists() ? snap.data() : { name: user.email, role: 'user' };
        
        document.getElementById('display-name').innerText = userData.name;
        document.getElementById('display-role').innerText = userData.role;
        
        if (userData.role === 'admin') document.getElementById('admin-panel').classList.remove('hidden');
        
        showView('view-app');
        loadProducts();
    } else {
        showView('view-auth');
    }
});

function showView(id) {
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// --- LOGICA DE PRODUCTOS (Admin) ---
document.getElementById('btn-save-product').onclick = async () => {
    const name = document.getElementById('p-name').value;
    const stock = parseInt(document.getElementById('p-stock').value);
    const file = document.getElementById('p-file').files[0];
    const btn = document.getElementById('btn-save-product');

    if (!name || isNaN(stock)) return alert("Datos incompletos");

    btn.disabled = true;
    btn.innerText = "Subiendo...";

    let imageUrl = "";
    if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_PRESET);
        const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const data = await res.json();
        imageUrl = data.secure_url;
    }

    await addDoc(collection(db, "products"), { name, stock, img: imageUrl });
    alert("Producto guardado");
    btn.disabled = false;
    btn.innerText = "Guardar Producto";
};

// --- CARGAR PRODUCTOS (Realtime) ---
function loadProducts() {
    onSnapshot(collection(db, "products"), (snap) => {
        const list = document.getElementById('product-list');
        list.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            const card = document.createElement('div');
            card.className = "card product-card";
            card.innerHTML = `
                <img src="${p.img || 'https://via.placeholder.com/150'}">
                <h4>${p.name}</h4>
                <p>Stock: ${p.stock}</p>
                ${userData.role === 'admin' 
                    ? `<button onclick="deleteProduct('${d.id}')" class="btn-danger" style="font-size:10px">Eliminar</button>` 
                    : `<button onclick="requestOrder('${d.id}', '${p.name}', ${p.stock})" class="btn-primary">Pedir</button>`}
            `;
            list.appendChild(card);
        });
    });
}

// Funciones globales para botones dinámicos
window.deleteProduct = (id) => deleteDoc(doc(db, "products", id));
window.requestOrder = async (id, name, stock) => {
    const qty = prompt(`¿Cuántos ${name} deseas solicitar?`, "1");
    if (qty && parseInt(qty) <= stock) {
        await addDoc(collection(db, "orders"), {
            product: name,
            qty: parseInt(qty),
            user: userData.name,
            status: "pending",
            date: Date.now()
        });
        alert("Solicitud enviada");
    } else alert("Cantidad no válida o insuficiente stock");
};