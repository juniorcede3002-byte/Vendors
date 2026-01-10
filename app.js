import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, addDoc, query, where, updateDoc, deleteDoc, orderBy } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

const firebaseConfig = { /* TUS CREDENCIALES */ };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let selectedProduct = null;

// --- NAVEGACIÓN ---
const setView = (v) => {
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.getElementById(v).classList.add('active');
    lucide.createIcons();
};

window.showSection = (id) => {
    const sections = ['section-shop', 'section-orders', 'section-profile', 'section-admin'];
    sections.forEach(s => document.getElementById(s).classList.add('hidden'));
    document.getElementById(`section-${id}`).classList.remove('hidden');
    lucide.createIcons();
};

// --- AUTH ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        currentUser = snap.data();
        updateUI();
        loadShop();
        loadMyOrders();
        if (currentUser.role === 'admin') loadAdminOrders();
        setView('view-app');
    } else {
        setView('view-auth');
    }
});

function updateUI() {
    document.getElementById('display-name').innerText = currentUser.name;
    document.getElementById('display-role').innerText = currentUser.role;
    document.getElementById('profile-name').value = currentUser.name;
    document.getElementById('profile-email').value = currentUser.email;

    const nav = document.getElementById('nav-links');
    nav.classList.remove('hidden');
    if (currentUser.role === 'admin' && !document.getElementById('nav-admin')) {
        nav.innerHTML += `<button id="nav-admin" onclick="showSection('admin')" class="text-orange-500">Panel Admin</button>`;
    }
}

// --- GESTIÓN DE PRODUCTOS (ADMIN) ---
document.getElementById('btn-save-product').onclick = async () => {
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const img = document.getElementById('p-img').value;

    if (!name || !price) return alert("Datos requeridos");

    await addDoc(collection(db, "products"), { name, price: parseFloat(price), img: img || "https://via.placeholder.com/150" });
    alert("Producto publicado");
};

// --- COMPRAS (USUARIO) ---
window.openPayment = (id, name, price) => {
    selectedProduct = { id, name, price };
    document.getElementById('pay-product-name').innerText = `Producto: ${name} ($${price})`;
    document.getElementById('modal-payment').classList.replace('hidden', 'flex');
};

window.closeModal = () => document.getElementById('modal-payment').classList.replace('flex', 'hidden');

document.getElementById('btn-confirm-order').onclick = async () => {
    const method = document.getElementById('pay-method').value;
    const receipt = document.getElementById('pay-receipt').value;

    if (!receipt) return alert("Sube el comprobante (Link)");

    await addDoc(collection(db, "orders"), {
        userId: auth.currentUser.uid,
        userName: currentUser.name,
        productName: selectedProduct.name,
        price: selectedProduct.price,
        method,
        receipt,
        status: 'pendiente',
        timestamp: Date.now()
    });

    alert("Solicitud enviada. Espera aprobación del Admin.");
    closeModal();
};

// --- CARGA DE DATOS (REALTIME) ---
function loadShop() {
    onSnapshot(collection(db, "products"), snap => {
        const list = document.getElementById('product-list');
        list.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            list.innerHTML += `
                <div class="glass rounded-xl overflow-hidden p-4">
                    <img src="${p.img}" class="w-full h-32 object-cover rounded-lg mb-4">
                    <h4 class="font-bold">${p.name}</h4>
                    <p class="text-indigo-400 font-black">$${p.price}</p>
                    <button onclick="openPayment('${d.id}', '${p.name}', ${p.price})" class="w-full mt-3 bg-indigo-600 py-2 rounded-lg text-xs font-bold">COMPRAR</button>
                    ${currentUser.role === 'admin' ? `<button onclick="deleteDoc(doc(db, 'products', '${d.id}'))" class="text-red-500 text-[10px] mt-2 underline">Eliminar</button>` : ''}
                </div>`;
        });
    });
}

function loadMyOrders() {
    const q = query(collection(db, "orders"), where("userId", "==", auth.currentUser.uid), orderBy("timestamp", "desc"));
    onSnapshot(q, snap => {
        const container = document.getElementById('my-orders-list');
        container.innerHTML = snap.empty ? '<p class="text-slate-500">No tienes pedidos aún.</p>' : '';
        snap.forEach(d => {
            const o = d.data();
            container.innerHTML += `
                <div class="glass p-4 rounded-xl flex justify-between items-center">
                    <div>
                        <p class="font-bold">${o.productName}</p>
                        <p class="text-xs text-slate-400">${new Date(o.timestamp).toLocaleDateString()}</p>
                    </div>
                    <span class="status-${o.status} text-xs font-bold uppercase">${o.status}</span>
                </div>`;
        });
    });
}

function loadAdminOrders() {
    onSnapshot(query(collection(db, "orders"), orderBy("timestamp", "desc")), snap => {
        const container = document.getElementById('admin-orders-list');
        container.innerHTML = "";
        snap.forEach(d => {
            const o = d.data();
            container.innerHTML += `
                <div class="p-4 bg-slate-800/50 rounded-lg space-y-2 border border-white/5">
                    <div class="flex justify-between">
                        <span class="text-xs font-bold text-indigo-400">${o.userName}</span>
                        <span class="status-${o.status} text-[10px]">${o.status}</span>
                    </div>
                    <p class="text-sm font-bold">${o.productName} - $${o.price}</p>
                    <a href="${o.receipt}" target="_blank" class="text-xs text-blue-400 underline">Ver Comprobante</a>
                    ${o.status === 'pendiente' ? `
                        <div class="flex gap-2 mt-2">
                            <button onclick="updateOrder('${d.id}', 'aprobado')" class="bg-emerald-600 text-[10px] px-3 py-1 rounded">Aprobar</button>
                            <button onclick="updateOrder('${d.id}', 'rechazado')" class="bg-red-600 text-[10px] px-3 py-1 rounded">Rechazar</button>
                        </div>
                    ` : ''}
                </div>`;
        });
    });
}

window.updateOrder = async (id, status) => {
    await updateDoc(doc(db, "orders", id), { status });
};

// --- ACTUALIZAR PERFIL ---
document.getElementById('btn-update-profile').onclick = async () => {
    const newName = document.getElementById('profile-name').value;
    await updateDoc(doc(db, "users", auth.currentUser.uid), { name: newName });
    alert("Perfil actualizado");
};