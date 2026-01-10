import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBXYrQwpfcuAili1HvrmDGEWKjj_2j_lzY",
    authDomain: "proyectovendor.firebaseapp.com",
    projectId: "proyectovendor",
    storageBucket: "proyectovendor.firebasestorage.app",
    messagingSenderId: "1038115164902",
    appId: "1:1038115164902:web:3d72bd44f3e5da487c2127"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// CLOUDINARY
const CLOUD_NAME = "df79cjklp";
const UPLOAD_PRESET = "vendors_preset";

let isLoginMode = true;

// --- GESTIÓN DE VISTAS ---
window.showView = (id) => {
    document.querySelectorAll('.view-section').forEach(v => v.style.display = 'none');
    document.getElementById(id).style.display = (id === 'app-screen') ? 'block' : 'flex';
};

// --- AUTH (EMAIL/PASS) ---
window.toggleAuthMode = () => {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? "Ingresar" : "Registrarse";
};

document.getElementById('auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;

    if(pass.length < 6) return alert("Contraseña muy corta");

    try {
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, pass);
        } else {
            const res = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "usuarios", res.user.uid), {
                email, rol: (email === 'admin@vendors.com') ? 'admin' : 'user', nombre: email.split('@')[0]
            });
        }
    } catch (err) { alert("Error: " + err.message); }
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const snap = await getDoc(doc(db, "usuarios", user.uid));
        const rol = (user.email === 'admin@vendors.com') ? 'admin' : (snap.exists() ? snap.data().rol : 'user');
        document.body.className = `${rol}-mode`;
        document.getElementById('display-name').innerText = user.email.split('@')[0];
        showView('app-screen');
        loadProducts();
    } else {
        showView('landing-page');
    }
});

window.logout = () => signOut(auth);

// --- PRODUCTOS E IMÁGENES ---
const addForm = document.getElementById('add-product-form');
addForm.onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-upload-item');
    btn.innerText = "Subiendo..."; btn.disabled = true;

    try {
        const file = document.getElementById('item-file').files[0];
        const fData = new FormData();
        fData.append('file', file);
        fData.append('upload_preset', UPLOAD_PRESET);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: 'POST', body: fData });
        const data = await res.json();

        await addDoc(collection(db, "productos"), {
            nombre: document.getElementById('item-name').value,
            precio: parseFloat(document.getElementById('item-price').value),
            categoria: document.getElementById('item-cat').value,
            mediaUrl: data.secure_url,
            tipo: data.resource_type,
            fecha: new Date()
        });

        alert("Producto Publicado");
        closeModal('modal-add');
        e.target.reset();
    } catch (err) { alert("Error al subir"); }
    finally { btn.innerText = "Publicar Item"; btn.disabled = false; }
};

function loadProducts() {
    onSnapshot(query(collection(db, "productos"), orderBy("fecha", "desc")), (snap) => {
        const grid = document.getElementById('product-grid');
        grid.innerHTML = '';
        snap.forEach(d => {
            const p = d.data();
            grid.innerHTML += `
                <div class="card">
                    <div class="card-media">
                        ${p.tipo === 'video' ? `<video src="${p.mediaUrl}" muted loop onmouseover="this.play()"></video>` : `<img src="${p.mediaUrl}">`}
                    </div>
                    <div class="card-info">
                        <h4>${p.nombre}</h4>
                        <p class="price">$${p.precio}</p>
                        <button class="user-only btn-primary-full" onclick="alert('Pedido enviado')">Comprar</button>
                    </div>
                </div>`;
        });
    });
}

// MODALES
window.showModal = (id) => document.getElementById(id).style.display = 'flex';
window.closeModal = (id) => document.getElementById(id).style.display = 'none';