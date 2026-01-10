import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

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
const db = getFirestore(app);

let currentRole = 'user';
let selectedProduct = null;

// --- SISTEMA DE ENTRADA POR ROL ---
window.enterAs = (role) => {
    currentRole = role;
    document.getElementById('display-role').innerText = role;
    document.getElementById('display-name').innerText = role === 'admin' ? 'Administrador' : 'Cliente Invitado';
    
    if (role === 'admin') {
        document.getElementById('nav-admin').classList.remove('hidden');
        loadAdminOrders();
        showSection('admin');
    } else {
        document.getElementById('nav-admin').classList.add('hidden');
        showSection('shop');
    }
    
    document.getElementById('view-auth').classList.remove('active');
    document.getElementById('view-app').classList.add('active');
    loadProducts();
    loadMyOrders();
    lucide.createIcons();
};

window.showSection = (id) => {
    ['shop', 'orders', 'admin'].forEach(s => document.getElementById(`section-${s}`).classList.add('hidden'));
    document.getElementById(`section-${id}`).classList.remove('hidden');
    lucide.createIcons();
};

// --- CLOUDINARY UPLOAD ---
async function uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_PRESET);
    const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
    const data = await res.json();
    return data.secure_url;
}

// --- LOGICA DE PRODUCTOS ---
function loadProducts() {
    onSnapshot(collection(db, "products"), snap => {
        const list = document.getElementById('product-list');
        list.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            list.innerHTML += `
                <div class="glass p-4 rounded-2xl hover:border-white/20 transition-all">
                    <img src="${p.img}" class="w-full h-44 object-cover rounded-xl mb-4">
                    <h4 class="font-bold text-white">${p.name}</h4>
                    <p class="text-indigo-400 font-black text-xl mb-4">$${p.price}</p>
                    <button onclick="openPay('${d.id}', '${p.name}', ${p.price})" class="w-full bg-indigo-600 py-3 rounded-xl text-xs font-bold tracking-widest uppercase">Comprar</button>
                    ${currentRole === 'admin' ? `<button onclick="deleteProduct('${d.id}')" class="text-[10px] text-red-500 mt-2 block w-full underline">Eliminar de Tienda</button>` : ''}
                </div>`;
        });
    });
}

// --- ACCIONES ADMIN ---
document.getElementById('btn-save-product').onclick = async () => {
    const file = document.getElementById('p-file').files[0];
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;

    if(!file || !name) return alert("Completa los datos y la imagen");

    const imgUrl = await uploadFile(file);
    await addDoc(collection(db, "products"), { name, price: parseFloat(price), img: imgUrl });
    alert("Artículo publicado con éxito");
};

function loadAdminOrders() {
    onSnapshot(query(collection(db, "orders"), orderBy("date", "desc")), snap => {
        const list = document.getElementById('admin-orders-list');
        list.innerHTML = "";
        snap.forEach(d => {
            const o = d.data();
            list.innerHTML += `
                <div class="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                    <div class="flex justify-between items-center">
                        <span class="text-[10px] font-black uppercase text-indigo-400">Cliente: ${o.user}</span>
                        <span class="status-${o.status} text-[9px] font-bold">${o.status.toUpperCase()}</span>
                    </div>
                    <p class="font-bold text-sm">${o.product} - $${o.price}</p>
                    <div class="flex gap-2">
                        <a href="${o.receipt}" target="_blank" class="bg-slate-800 text-[10px] px-4 py-2 rounded-lg">Ver Comprobante</a>
                        ${o.status === 'pendiente' ? `
                            <button onclick="approveOrder('${d.id}')" class="bg-emerald-600 text-[10px] px-4 py-2 rounded-lg font-bold">Aprobar</button>
                        ` : ''}
                    </div>
                </div>`;
        });
    });
}

// --- ACCIONES USUARIO ---
window.openPay = (id, name, price) => {
    selectedProduct = { id, name, price };
    document.getElementById('pay-info').innerText = `${name} ($${price})`;
    document.getElementById('modal-pay').classList.replace('hidden', 'flex');
};

window.closeModal = () => document.getElementById('modal-pay').classList.replace('flex', 'hidden');

document.getElementById('btn-submit-order').onclick = async () => {
    const file = document.getElementById('pay-file').files[0];
    if(!file) return alert("Sube el comprobante");

    const url = await uploadFile(file);
    await addDoc(collection(db, "orders"), {
        user: currentRole === 'admin' ? 'Admin_Test' : 'Invitado_1',
        product: selectedProduct.name,
        price: selectedProduct.price,
        receipt: url,
        status: 'pendiente',
        date: Date.now()
    });
    alert("Pago enviado. Revisa 'Mis Compras' para ver el estado.");
    closeModal();
};

function loadMyOrders() {
    onSnapshot(collection(db, "orders"), snap => {
        const list = document.getElementById('my-orders-list');
        list.innerHTML = "";
        snap.forEach(d => {
            const o = d.data();
            list.innerHTML += `
                <div class="glass p-4 rounded-xl flex justify-between items-center border-l-4 border-indigo-500">
                    <span class="text-sm font-bold">${o.product}</span>
                    <span class="status-${o.status} text-[9px] font-black uppercase">${o.status}</span>
                </div>`;
        });
    });
}

// Global functions
window.approveOrder = async (id) => await updateDoc(doc(db, "orders", id), { status: 'aprobado' });
window.deleteProduct = async (id) => await deleteDoc(doc(db, "products", id));