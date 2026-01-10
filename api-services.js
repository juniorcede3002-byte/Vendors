import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// TU CONFIGURACIÓN DE FIREBASE
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

// CONFIGURACIÓN DE CLOUDINARY (Para las imágenes de los productos)
const CLOUD_NAME = "df79cjklp";
const UPLOAD_PRESET = "vendors_preset";

let isLoginMode = true;

// --- GESTIÓN DE SESIÓN ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const uSnap = await getDoc(doc(db, "usuarios", user.uid));
        const rol = (user.email === 'admin@vendors.com') ? 'admin' : (uSnap.exists() ? uSnap.data().rol : 'user');
        
        document.body.className = `${rol}-mode`;
        document.getElementById('display-name').innerText = user.email.split('@')[0];
        
        showView('app-screen');
        loadProducts(); // Cargar items de la BD
    } else {
        showView('landing-page');
    }
});

// --- FUNCIÓN PARA SUBIR ITEMS (ADMIN) ---
// Esta es la conexión que te faltaba para "Items e Imágenes"
const addProductForm = document.getElementById('add-product-form');
if(addProductForm) {
    addProductForm.onsubmit = async (e) => {
        e.preventDefault();
        const file = document.getElementById('item-file').files[0];
        const name = document.getElementById('item-name').value;
        const price = document.getElementById('item-price').value;
        const cat = document.getElementById('item-cat').value;

        if(!file) return alert("Selecciona una imagen");

        try {
            // 1. Subir imagen a Cloudinary
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', UPLOAD_PRESET);

            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            // 2. Guardar referencia en Firebase Firestore
            await addDoc(collection(db, "productos"), {
                nombre: name,
                precio: parseFloat(price),
                categoria: cat,
                mediaUrl: data.secure_url,
                tipo: data.resource_type, // image o video
                fecha: new Date()
            });

            alert("Producto publicado con éxito");
            closeModal('modal-add');
            e.target.reset();
        } catch (err) {
            console.error(err);
            alert("Error al conectar con el servidor de imágenes");
        }
    };
}

// --- CARGAR PRODUCTOS EN LA TIENDA ---
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
                        <p class="category">${p.categoria}</p>
                        <p class="price">$${p.precio}</p>
                        <button class="user-only btn-buy" onclick="addToCart('${d.id}')">Comprar ahora</button>
                    </div>
                </div>`;
        });
    });
}

// --- AUTH Y NAVEGACIÓN ---
document.getElementById('auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;

    try {
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, pass);
        } else {
            const res = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "usuarios", res.user.uid), {
                email, rol: (email === 'admin@vendors.com') ? 'admin' : 'user', fecha: new Date()
            });
        }
    } catch (err) { alert(err.message); }
};

window.showView = (id) => {
    document.querySelectorAll('.view-section').forEach(v => v.style.display = 'none');
    document.getElementById(id).style.display = (id === 'auth-screen' || id === 'landing-page') ? 'flex' : 'block';
};

window.logout = () => signOut(auth);
window.showModal = (id) => document.getElementById(id).style.display = 'flex';
window.closeModal = (id) => document.getElementById(id).style.display = 'none';