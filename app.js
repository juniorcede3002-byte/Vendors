import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, onSnapshot, addDoc, query, where, updateDoc, deleteDoc, orderBy } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBXYrQwpfcuAili1HvrmDGEWKjj_2j_lzY",
    authDomain: "proyectovendor.firebaseapp.com",
    projectId: "proyectovendor",
    storageBucket: "proyectovendor.firebasestorage.app",
    messagingSenderId: "1038115164902",
    appId: "1:1038115164902:web:3d72bd44f3e5da487c2127"
};

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/proyectovendor/image/upload";
const CLOUDINARY_PRESET = "vendors_preset";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentProduct = null;
let userData = null;

// --- NAVEGACIÓN ---
window.showSection = (id) => {
    ['shop', 'orders', 'admin'].forEach(s => document.getElementById(`section-${s}`).classList.add('hidden'));
    document.getElementById(`section-${id}`).classList.remove('hidden');
    lucide.createIcons();
};

const setView = (v) => {
    document.getElementById('view-auth').classList.toggle('active', v === 'auth');
    document.getElementById('view-app').classList.toggle('active', v === 'app');
    lucide.createIcons();
};

// --- FUNCIÓN CLOUDINARY ---
async function uploadImg(file) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", CLOUDINARY_PRESET);
    const res = await fetch(CLOUDINARY_URL, { method: "POST", body: fd });
    const data = await res.json();
    return data.secure_url;
}

// --- BOTÓN ENTRAR ---
document.getElementById('btn-login').onclick = async () => {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
        alert("Error: Verifica tus credenciales.");
    }
};

document.getElementById('btn-logout').onclick = () => signOut(auth);

// --- DETECTAR USUARIO ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        userData = snap.exists() ? snap.data() : { name: user.email, role: 'user' };
        
        document.getElementById('user-display-name').innerText = userData.name;
        document.getElementById('user-display-role').innerText = userData.role;

        if (userData.role === 'admin') {
            document.getElementById('nav-admin').classList.remove('hidden');
            loadAdminOrders();
        }
        
        loadShop();
        loadMyOrders();
        setView('app');
    } else {
        setView('auth');
    }
});

// --- TIENDA Y PAGOS ---
function loadShop() {
    onSnapshot(collection(db, "products"), snap => {
        const list = document.getElementById('product-list');
        list.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            list.innerHTML += `
                <div class="glass p-4 rounded-2xl">
                    <img src="${p.img}" class="w-full h-40 object-cover rounded-xl mb-4">
                    <h4 class="font-bold">${p.name}</h4>
                    <p class="text-indigo-400 font-black mb-4">$${p.price}</p>
                    <button onclick="openPay('${d.id}', '${p.name}', ${p.price})" class="w-full bg-indigo-600 py-2 rounded-lg text-xs font-bold">COMPRAR</button>
                    ${userData.role === 'admin' ? `<button onclick="deleteDoc(doc(db, 'products', '${d.id}'))" class="text-[10px] text-red-500 mt-2 underline">Eliminar</button>` : ''}
                </div>`;
        });
    });
}

window.openPay = (id, name, price) => {
    currentProduct = { id, name, price };
    document.getElementById('pay-info').innerText = `${name} ($${price})`;
    document.getElementById('modal-pay').classList.replace('hidden', 'flex');
};

window.closeModal = () => document.getElementById('modal-pay').classList.replace('flex', 'hidden');

document.getElementById('btn-submit-order').onclick = async () => {
    const file = document.getElementById('pay-file').files[0];
    if (!file) return alert("Sube el comprobante.");

    const url = await uploadImg(file);
    await addDoc(collection(db, "orders"), {
        uid: auth.currentUser.uid,
        userName: userData.name,
        productName: currentProduct.name,
        price: currentProduct.price,
        receipt: url,
        status: 'pendiente',
        date: Date.now()
    });
    alert("Pago enviado.");
    closeModal();
};

// --- VISTA ADMIN ---
document.getElementById('btn-save-product').onclick = async () => {
    const file = document.getElementById('p-file').files[0];
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    if (!file || !name) return alert("Faltan datos");

    const url = await uploadImg(file);
    await addDoc(collection(db, "products"), { name, price: parseFloat(price), img: url });
    alert("Artículo publicado");
};

function loadAdminOrders() {
    onSnapshot(query(collection(db, "orders"), orderBy("date", "desc")), snap => {
        const list = document.getElementById('admin-orders-list');
        list.innerHTML = "";
        snap.forEach(d => {
            const o = d.data();
            list.innerHTML += `
                <div class="p-4 bg-slate-900 rounded-xl border border-white/5">
                    <p class="text-[10px] font-bold text-indigo-400">${o.userName}</p>
                    <p class="text-sm font-bold">${o.productName} ($${o.price})</p>
                    <div class="flex gap-2 mt-3">
                        <a href="${o.receipt}" target="_blank" class="text-[10px] bg-slate-800 px-3 py-1 rounded">Ver Pago</a>
                        <button onclick="updateOrder('${d.id}', 'aprobado')" class="bg-emerald-600 text-[10px] px-3 py-1 rounded">Aprobar</button>
                    </div>
                </div>`;
        });
    });
}

window.updateOrder = async (id, status) => {
    await updateDoc(doc(db, "orders", id), { status });
};

function loadMyOrders() {
    onSnapshot(query(collection(db, "orders"), where("uid", "==", auth.currentUser.uid)), snap => {
        const list = document.getElementById('my-orders-list');
        list.innerHTML = "";
        snap.forEach(d => {
            const o = d.data();
            list.innerHTML += `<div class="glass p-4 rounded-xl flex justify-between">
                <span>${o.productName}</span>
                <span class="text-xs uppercase font-bold text-indigo-400">${o.status}</span>
            </div>`;
        });
    });
}