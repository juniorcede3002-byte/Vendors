import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, addDoc, query, where, updateDoc, deleteDoc, orderBy } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// CREDENCIALES PROPORCIONADAS
const firebaseConfig = {
    apiKey: "AIzaSyBXYrQwpfcuAili1HvrmDGEWKjj_2j_lzY",
    authDomain: "proyectovendor.firebaseapp.com",
    projectId: "proyectovendor",
    storageBucket: "proyectovendor.firebasestorage.app",
    messagingSenderId: "1038115164902",
    appId: "1:1038115164902:web:3d72bd44f3e5da487c2127"
};

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/proyectovendor/image/upload";
const CLOUDINARY_PRESET = "vendors_preset"; // Tu preset configurado

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let userData = null;
let currentItem = null;

// --- NAVEGACIÓN ---
window.showSection = (id) => {
    ['shop', 'orders', 'profile', 'admin'].forEach(s => {
        const el = document.getElementById(`section-${s}`);
        if(el) el.classList.add('hidden');
    });
    document.getElementById(`section-${id}`).classList.remove('hidden');
    lucide.createIcons();
};

const setView = (v) => {
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.getElementById(v).classList.add('active');
    lucide.createIcons();
};

// --- CLOUDINARY UPLOAD ---
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_PRESET);
    const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
    const data = await res.json();
    return data.secure_url;
}

// --- AUTENTICACIÓN ---
document.getElementById('toggle-auth').onclick = () => {
    const rf = document.getElementById('register-fields');
    rf.classList.toggle('hidden');
    document.getElementById('btn-auth-action').innerText = rf.classList.contains('hidden') ? 'Entrar' : 'Registrarse';
};

document.getElementById('btn-auth-action').onclick = async () => {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    const name = document.getElementById('auth-name').value;
    const isRegister = !document.getElementById('register-fields').classList.contains('hidden');

    try {
        if(isRegister) {
            const res = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "users", res.user.uid), { uid: res.user.uid, name, email, role: 'user' });
        } else {
            await signInWithEmailAndPassword(auth, email, pass);
        }
    } catch (e) { alert("Error: " + e.message); }
};

document.getElementById('btn-logout').onclick = () => signOut(auth);

// --- MONITOR DE USUARIO ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        userData = snap.data();
        
        document.getElementById('user-name').innerText = userData.name;
        document.getElementById('user-role').innerText = userData.role;
        document.getElementById('profile-name-input').value = userData.name;

        if (userData.role === 'admin') {
            document.getElementById('nav-admin').classList.remove('hidden');
            loadAdminPanel();
        }

        loadCatalog();
        loadUserOrders();
        setView('view-app');
    } else {
        setView('view-auth');
    }
});

// --- TIENDA (COMPRAS) ---
function loadCatalog() {
    onSnapshot(collection(db, "products"), snap => {
        const list = document.getElementById('product-list');
        list.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            list.innerHTML += `
                <div class="glass p-4 rounded-2xl flex flex-col">
                    <img src="${p.img}" class="w-full h-40 object-cover rounded-xl mb-4">
                    <h4 class="font-bold text-white mb-1">${p.name}</h4>
                    <p class="text-indigo-400 font-black mb-4">$${p.price}</p>
                    <button onclick="openCheckout('${d.id}', '${p.name}', ${p.price})" class="w-full bg-indigo-600 hover:bg-indigo-500 py-2.5 rounded-xl text-xs font-bold transition-all">COMPRAR AHORA</button>
                    ${userData.role === 'admin' ? `<button onclick="deleteProduct('${d.id}')" class="text-red-500 text-[10px] mt-2 underline">Eliminar Artículo</button>` : ''}
                </div>`;
        });
    });
}

window.openCheckout = (id, name, price) => {
    currentItem = { id, name, price };
    document.getElementById('pay-item-name').innerText = `${name} - Total: $${price}`;
    document.getElementById('modal-pay').classList.replace('hidden', 'flex');
};

window.closeModal = () => document.getElementById('modal-pay').classList.replace('flex', 'hidden');

document.getElementById('btn-submit-order').onclick = async () => {
    const file = document.getElementById('pay-file').files[0];
    if(!file) return alert("Sube el comprobante de pago");

    try {
        const receiptUrl = await uploadToCloudinary(file);
        await addDoc(collection(db, "orders"), {
            uid: auth.currentUser.uid,
            userName: userData.name,
            productName: currentItem.name,
            price: currentItem.price,
            receipt: receiptUrl,
            method: document.getElementById('pay-method').value,
            status: 'pendiente',
            date: Date.now()
        });
        alert("Orden enviada con éxito.");
        closeModal();
    } catch (e) { alert("Error al subir comprobante"); }
};

// --- MIS PEDIDOS (SOLICITANTE) ---
function loadUserOrders() {
    const q = query(collection(db, "orders"), where("uid", "==", auth.currentUser.uid), orderBy("date", "desc"));
    onSnapshot(q, snap => {
        const container = document.getElementById('my-orders-list');
        container.innerHTML = snap.empty ? '<p class="text-slate-500 text-sm">No has realizado compras.</p>' : '';
        snap.forEach(d => {
            const o = d.data();
            container.innerHTML += `
                <div class="glass p-5 rounded-xl flex justify-between items-center border-l-4 border-indigo-500">
                    <div>
                        <p class="font-bold text-white text-sm">${o.productName}</p>
                        <p class="text-[10px] text-slate-500">Pedido el ${new Date(o.date).toLocaleDateString()}</p>
                    </div>
                    <span class="status-${o.status} text-[9px] font-black uppercase">${o.status}</span>
                </div>`;
        });
    });
}

// --- PANEL ADMIN ---
document.getElementById('btn-save-product').onclick = async () => {
    const name = document.getElementById('admin-p-name').value;
    const price = document.getElementById('admin-p-price').value;
    const file = document.getElementById('admin-p-file').files[0];

    if(!name || !price || !file) return alert("Faltan datos del artículo");

    const imgUrl = await uploadToCloudinary(file);
    await addDoc(collection(db, "products"), { name, price: parseFloat(price), img: imgUrl });
    alert("Artículo publicado en la tienda.");
};

function loadAdminPanel() {
    onSnapshot(query(collection(db, "orders"), orderBy("date", "desc")), snap => {
        const container = document.getElementById('admin-orders-list');
        container.innerHTML = "";
        snap.forEach(d => {
            const o = d.data();
            container.innerHTML += `
                <div class="p-4 bg-slate-900 rounded-xl border border-white/5 space-y-3">
                    <div class="flex justify-between">
                        <span class="text-xs font-bold text-indigo-400">${o.userName}</span>
                        <span class="status-${o.status} text-[9px]">${o.status.toUpperCase()}</span>
                    </div>
                    <p class="text-sm font-bold text-white">${o.productName} ($${o.price})</p>
                    <div class="flex gap-3">
                        <a href="${o.receipt}" target="_blank" class="text-[10px] bg-indigo-600/20 text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-500/30">Ver Pago</a>
                        ${o.status === 'pendiente' ? `
                            <button onclick="updateOrder('${d.id}', 'aprobado')" class="text-[10px] bg-emerald-600 px-3 py-1.5 rounded-lg">Aprobar</button>
                            <button onclick="updateOrder('${d.id}', 'rechazado')" class="text-[10px] bg-red-600 px-3 py-1.5 rounded-lg">Rechazar</button>
                        ` : ''}
                    </div>
                </div>`;
        });
    });
}

window.updateOrder = async (id, status) => {
    await updateDoc(doc(db, "orders", id), { status });
};

window.deleteProduct = async (id) => {
    if(confirm("¿Eliminar este artículo definitivamente?")) await deleteDoc(doc(db, "products", id));
};

// --- GESTIÓN DE PERFIL ---
document.getElementById('btn-update-profile').onclick = async () => {
    const name = document.getElementById('profile-name-input').value;
    if(name) {
        await updateDoc(doc(db, "users", auth.currentUser.uid), { name });
        alert("Nombre de perfil actualizado.");
    }
};