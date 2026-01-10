import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, addDoc, query, where, getDocs, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBXYrQwpfcuAili1HvrmDGEWKjj_2j_lzY",
    authDomain: "proyectovendor.firebaseapp.com",
    projectId: "proyectovendor"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let isRegister = false;

// --- NAVEGACIÓN ENTRE VISTAS ---
const setView = (viewId) => {
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    lucide.createIcons();
};

window.showSection = (sectionId) => {
    document.getElementById('section-shop').classList.toggle('hidden', sectionId !== 'shop');
    document.getElementById('section-admin').classList.toggle('hidden', sectionId !== 'admin');
};

// --- AUTENTICACIÓN ---
document.getElementById('toggle-auth').onclick = () => {
    isRegister = !isRegister;
    document.getElementById('register-only').classList.toggle('hidden', !isRegister);
    document.getElementById('btn-text').innerText = isRegister ? 'Crear Cuenta' : 'Iniciar Sesión';
    document.getElementById('toggle-auth').innerText = isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate aquí';
};

document.getElementById('btn-auth-action').onclick = async () => {
    const email = document.getElementById('auth-email').value.trim();
    const pass = document.getElementById('auth-pass').value.trim();
    const name = document.getElementById('auth-name').value.trim();

    if (!email || !pass) return alert("Por favor rellena los campos.");

    try {
        if (isRegister) {
            const res = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "users", res.user.uid), {
                uid: res.user.uid,
                name: name || email.split('@')[0],
                email,
                role: "user" // Rol por defecto (Solicitante)
            });
        } else {
            await signInWithEmailAndPassword(auth, email, pass);
        }
    } catch (err) { alert("Error: " + err.message); }
};

document.getElementById('btn-logout').onclick = () => signOut(auth);

// --- MONITOR DE ESTADO DEL USUARIO ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        currentUser = docSnap.exists() ? docSnap.data() : { name: user.email, role: 'user' };
        
        document.getElementById('display-name').innerText = currentUser.name;
        document.getElementById('display-role').innerText = currentUser.role;
        
        renderNavLinks();
        loadInventory();
        setView('view-app');
    } else {
        setView('view-auth');
    }
});

function renderNavLinks() {
    const nav = document.getElementById('nav-links');
    nav.classList.remove('hidden');
    let links = `<button onclick="showSection('shop')" class="hover:text-white">Tienda</button>`;
    if (currentUser.role === 'admin') {
        links += `<button onclick="showSection('admin')" class="text-orange-500 font-bold">Panel Admin</button>`;
    }
    nav.innerHTML = links;
}

// --- GESTIÓN DE INVENTARIO ---
document.getElementById('btn-save-product').onclick = async () => {
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const img = document.getElementById('p-img-url').value;

    if (!name || !price) return alert("Nombre y precio son obligatorios.");

    try {
        await addDoc(collection(db, "products"), {
            name,
            price: parseFloat(price),
            img: img || "https://via.placeholder.com/200",
            createdAt: Date.now()
        });
        alert("Producto añadido exitosamente.");
        document.getElementById('p-name').value = "";
        document.getElementById('p-price').value = "";
    } catch (e) { alert("Error al guardar: " + e.message); }
};

function loadInventory() {
    onSnapshot(collection(db, "products"), (snapshot) => {
        const list = document.getElementById('product-list');
        list.innerHTML = "";
        snapshot.forEach(docItem => {
            const p = docItem.data();
            const card = document.createElement('div');
            card.className = "product-card glass rounded-2xl overflow-hidden border border-white/5";
            card.innerHTML = `
                <div class="h-44 bg-slate-800 relative">
                    <img src="${p.img}" class="w-full h-full object-cover">
                    ${currentUser.role === 'admin' ? `
                        <button onclick="deleteProduct('${docItem.id}')" class="absolute top-2 right-2 bg-red-500 p-1.5 rounded-lg text-white">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    ` : ''}
                </div>
                <div class="p-5">
                    <h4 class="font-bold text-white truncate">${p.name}</h4>
                    <p class="text-indigo-400 font-black text-xl mt-1">$${p.price}</p>
                    <button onclick="alert('Solicitud enviada')" class="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 py-2 rounded-xl text-xs font-bold transition-all">
                        SOLICITAR
                    </button>
                </div>
            `;
            list.appendChild(card);
        });
        lucide.createIcons();
    });
}

// Función global para borrar
window.deleteProduct = async (id) => {
    if (confirm("¿Eliminar este suministro definitivamente?")) {
        await deleteDoc(doc(db, "products", id));
    }
};

// --- GESTIÓN DE ROLES ---
document.getElementById('btn-promote-user').onclick = async () => {
    const email = document.getElementById('admin-target-email').value.trim();
    if (!email) return;

    const q = query(collection(db, "users"), where("email", "==", email));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
        await updateDoc(doc(db, "users", snap.docs[0].id), { role: "admin" });
        alert(`Usuario ${email} ahora es Administrador.`);
    } else {
        alert("Usuario no encontrado.");
    }
};