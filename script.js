import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const CLOUD_NAME = "df79cjklp";
const UPLOAD_PRESET = "vendors_preset";

// --- ESTADO LOCAL ---
let allProducts = [];
let cart = [];
let role = '';
let filterCat = 'todos';
let searchTxt = '';

// --- SISTEMA DE LOGS Y ROLES ---
window.selectRole = (selected) => {
    role = selected;
    document.body.className = `${selected}-mode`;
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
    initApp();
};

window.logout = () => {
    location.reload();
};

// --- INICIALIZACIÓN ---
function initApp() {
    onSnapshot(query(collection(db, "productos"), orderBy("fecha", "desc")), (snap) => {
        allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderFeed();
    });

    onSnapshot(query(collection(db, "pedidos"), orderBy("fecha", "desc")), (snap) => {
        renderOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
}

// --- RENDERIZADO ---
function renderFeed() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';

    const filtered = allProducts.filter(p => {
        const matchesCat = filterCat === 'todos' || p.categoria === filterCat;
        const matchesSearch = p.nombre.toLowerCase().includes(searchTxt.toLowerCase());
        return matchesCat && matchesSearch;
    });

    filtered.forEach(p => {
        const el = document.createElement('div');
        el.className = 'card';
        el.innerHTML = `
            <div class="card-media">${p.tipo === 'video' ? `<video src="${p.mediaUrl}"></video>` : `<img src="${p.mediaUrl}">`}</div>
            <div class="card-body">
                <h3>${p.nombre}</h3>
                <div style="display:flex; justify-content:space-between; align-items:center">
                    <span class="price-hero" style="font-size:1.2rem">$${p.precio}</span>
                    <button class="admin-only btn-secondary" onclick="event.stopPropagation(); deleteProd('${p.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        el.onclick = () => showDetail(p);
        grid.appendChild(el);
    });
}

// --- BUSCADOR Y CATEGORÍAS ---
document.getElementById('main-search').oninput = (e) => {
    searchTxt = e.target.value;
    renderFeed();
};

document.querySelectorAll('.chip').forEach(c => {
    c.onclick = () => {
        document.querySelector('.chip.active').classList.remove('active');
        c.classList.add('active');
        filterCat = c.dataset.cat;
        renderFeed();
    };
});

// --- FUNCIONALIDAD PRODUCTOS ---
window.showDetail = (p) => {
    const container = document.getElementById('detail-media-container');
    container.innerHTML = p.tipo === 'video' ? `<video src="${p.mediaUrl}" controls autoplay></video>` : `<img src="${p.mediaUrl}">`;
    document.getElementById('det-title').innerText = p.nombre;
    document.getElementById('det-desc').innerText = p.descripcion;
    document.getElementById('det-price').innerText = `$${p.precio}`;
    document.getElementById('det-cat').innerText = p.categoria;
    
    document.getElementById('add-to-cart-btn').onclick = () => {
        cart.push(p);
        updateCart();
        closeModal('modal-detail');
    };
    showModal('modal-detail');
};

function updateCart() {
    document.getElementById('cart-badge').innerText = cart.length;
}

window.deleteProd = async (id) => {
    if(confirm("¿Eliminar del inventario?")) await deleteDoc(doc(db, "productos", id));
};

// --- PEDIDOS Y GESTIÓN ---
document.getElementById('checkout-form').onsubmit = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "pedidos"), {
        items: cart,
        total: cart.reduce((a, b) => a + b.precio, 0),
        direccion: document.getElementById('ship-address').value,
        estado: 'pendiente',
        fecha: new Date()
    });
    alert("Solicitud enviada correctamente.");
    cart = []; updateCart(); closeModal('modal-checkout');
};

function renderOrders(pedidos) {
    const list = document.getElementById('orders-list');
    list.innerHTML = '';
    pedidos.forEach(o => {
        const card = document.createElement('div');
        card.className = 'card-body';
        card.style = 'background:#f1f5f9; margin-bottom:10px; border-radius:10px';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between">
                <strong>Pedido: ${o.items.map(i => i.nombre).join(', ')}</strong>
                <span class="status-badge status-${o.estado}">${o.estado}</span>
            </div>
            <p style="font-size:0.8rem">Ubicación: ${o.direccion}</p>
            <div class="admin-only" style="margin-top:10px">
                <button class="btn-primary" onclick="updateStatus('${o.id}', 'aprobado')" style="padding:5px 10px; font-size:0.7rem">Aprobar</button>
                <button class="btn-secondary" onclick="updateStatus('${o.id}', 'rechazado')" style="padding:5px 10px; font-size:0.7rem">Rechazar</button>
            </div>
        `;
        list.appendChild(card);
    });
}

window.updateStatus = async (id, status) => {
    await updateDoc(doc(db, "pedidos", id), { estado: status });
};

// --- SUBIDA DE ARCHIVOS (ADMIN) ---
document.getElementById('add-product-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-publish');
    btn.disabled = true; btn.innerText = "Subiendo multimedia...";

    const file = document.getElementById('p-file').files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: 'POST', body: formData });
        const data = await res.json();

        await addDoc(collection(db, "productos"), {
            nombre: document.getElementById('p-name').value,
            categoria: document.getElementById('p-cat').value,
            descripcion: document.getElementById('p-desc').value,
            precio: parseFloat(document.getElementById('p-price').value),
            mediaUrl: data.secure_url,
            tipo: data.resource_type,
            fecha: new Date()
        });
        closeModal('modal-add');
        document.getElementById('add-product-form').reset();
    } catch (err) { alert(err.message); } finally { btn.disabled = false; btn.innerText = "Publicar"; }
};

// --- HELPERS MODALES ---
window.showModal = (id) => document.getElementById(id).style.display = 'flex';
window.closeModal = (id) => document.getElementById(id).style.display = 'none';

document.getElementById('cart-btn').onclick = () => {
    const list = document.getElementById('cart-list');
    list.innerHTML = cart.length ? '' : 'Bolsa vacía';
    let total = 0;
    cart.forEach(i => { total += i.precio; list.innerHTML += `<div style="padding:10px; border-bottom:1px solid #eee">${i.nombre} - $${i.precio}</div>`; });
    document.getElementById('cart-sum').innerText = `$${total.toFixed(2)}`;
    showModal('modal-cart');
};

window.openCheckout = () => { if(cart.length) { closeModal('modal-cart'); showModal('modal-checkout'); } };
document.getElementById('admin-orders-btn').onclick = () => showModal('modal-orders');
document.getElementById('view-my-orders').onclick = () => {
    document.getElementById('orders-title-text').innerText = "Estado de mis Solicitudes";
    showModal('modal-orders');
};
document.getElementById('open-add-modal').onclick = () => showModal('modal-add');