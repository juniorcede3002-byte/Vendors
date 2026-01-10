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

let allProducts = [];
let cart = [];
let currentRole = '';
let currentFilter = 'todos';
let searchQuery = '';

// --- SISTEMA DE ROLES ---
window.selectRole = (role) => {
    currentRole = role;
    document.body.className = `${role}-mode`;
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
    initRealtime();
};

window.logout = () => location.reload();

// --- INICIALIZACIÓN DE DATOS ---
function initRealtime() {
    onSnapshot(query(collection(db, "productos"), orderBy("fecha", "desc")), (snap) => {
        allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderStock();
    });

    onSnapshot(query(collection(db, "pedidos"), orderBy("fecha", "desc")), (snap) => {
        renderOrdersList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
}

// --- RENDERIZADO DE STOCK ---
function renderStock() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';

    const filtered = allProducts.filter(p => {
        const matchesCat = currentFilter === 'todos' || p.categoria === currentFilter;
        const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesSearch;
    });

    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-media">${p.tipo === 'video' ? `<video src="${p.mediaUrl}"></video>` : `<img src="${p.mediaUrl}">`}</div>
            <div class="card-body">
                <h3>${p.nombre}</h3>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px">
                    <span class="price-hero" style="font-size:1.1rem">$${p.precio}</span>
                    <button class="admin-only btn-primary" style="background:var(--danger)" onclick="event.stopPropagation(); deleteProduct('${p.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        card.onclick = () => openProductDetail(p);
        grid.appendChild(card);
    });
}

// --- BUSQUEDA Y FILTROS ---
document.getElementById('main-search').oninput = (e) => {
    searchQuery = e.target.value;
    renderStock();
};

document.querySelectorAll('.chip').forEach(btn => {
    btn.onclick = () => {
        document.querySelector('.chip.active').classList.remove('active');
        btn.classList.add('active');
        currentFilter = btn.dataset.cat;
        renderStock();
    };
});

// --- DETALLES Y CARRITO ---
function openProductDetail(p) {
    const mediaContainer = document.getElementById('detail-media-container');
    mediaContainer.innerHTML = p.tipo === 'video' ? `<video src="${p.mediaUrl}" controls autoplay></video>` : `<img src="${p.mediaUrl}">`;
    document.getElementById('det-title').innerText = p.nombre;
    document.getElementById('det-desc').innerText = p.descripcion;
    document.getElementById('det-price').innerText = `$${p.precio}`;
    document.getElementById('det-cat').innerText = p.categoria;

    document.getElementById('add-to-cart-btn').onclick = () => {
        cart.push(p);
        document.getElementById('cart-badge').innerText = cart.length;
        closeModal('modal-detail');
    };
    showModal('modal-detail');
}

window.openCheckout = () => {
    if(cart.length === 0) return alert("Bolsa vacía");
    closeModal('modal-cart');
    showModal('modal-checkout');
};

document.getElementById('checkout-form').onsubmit = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "pedidos"), {
        items: cart,
        total: cart.reduce((acc, item) => acc + item.precio, 0),
        ubicacion: document.getElementById('ship-address').value,
        estado: 'pendiente',
        fecha: new Date()
    });
    alert("Solicitud enviada con éxito.");
    cart = []; document.getElementById('cart-badge').innerText = "0";
    closeModal('modal-checkout');
};

// --- GESTIÓN DE PEDIDOS ---
function renderOrdersList(pedidos) {
    const container = document.getElementById('orders-list');
    container.innerHTML = '';
    pedidos.forEach(o => {
        const item = document.createElement('div');
        item.className = 'card-body';
        item.style = "background:#f8fafc; margin-bottom:15px; border-radius:15px; border:1px solid #e2e8f0";
        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center">
                <strong>Items: ${o.items.map(i => i.nombre).join(', ')}</strong>
                <span style="padding:5px 10px; border-radius:20px; font-size:0.7rem; font-weight:800; background:${o.estado === 'aprobado' ? '#dcfce7' : '#fef3c7'}">
                    ${o.estado.toUpperCase()}
                </span>
            </div>
            <p style="font-size:0.8rem; color:gray; margin:5px 0">Ubicación: ${o.ubicacion} | Total: $${o.total}</p>
            <div class="admin-only" style="margin-top:10px">
                <button class="btn-primary" style="padding:5px 12px; font-size:0.7rem; background:var(--success)" onclick="updateStatus('${o.id}', 'aprobado')">Aprobar</button>
                <button class="btn-primary" style="padding:5px 12px; font-size:0.7rem; background:var(--danger)" onclick="updateStatus('${o.id}', 'rechazado')">Rechazar</button>
            </div>
        `;
        container.appendChild(item);
    });
}

window.updateStatus = async (id, nuevoEstado) => {
    await updateDoc(doc(db, "pedidos", id), { estado: nuevoEstado });
};

// --- SUBIDA (ADMIN) ---
document.getElementById('add-product-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-publish');
    btn.disabled = true; btn.innerText = "Subiendo...";

    try {
        const file = document.getElementById('p-file').files[0];
        const fData = new FormData();
        fData.append('file', file);
        fData.append('upload_preset', UPLOAD_PRESET);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: 'POST', body: fData });
        const cloud = await res.json();

        await addDoc(collection(db, "productos"), {
            nombre: document.getElementById('p-name').value,
            categoria: document.getElementById('p-cat').value,
            descripcion: document.getElementById('p-desc').value,
            precio: parseFloat(document.getElementById('p-price').value),
            mediaUrl: cloud.secure_url,
            tipo: cloud.resource_type,
            fecha: new Date()
        });
        closeModal('modal-add');
        document.getElementById('add-product-form').reset();
    } catch (e) { alert("Error al subir"); }
    finally { btn.disabled = false; btn.innerText = "Publicar"; }
};

window.deleteProduct = async (id) => { if(confirm("¿Eliminar suministro?")) await deleteDoc(doc(db, "productos", id)); };

// --- HELPERS UI ---
window.showModal = (id) => document.getElementById(id).style.display = 'flex';
window.closeModal = (id) => document.getElementById(id).style.display = 'none';

document.getElementById('cart-btn').onclick = () => {
    const list = document.getElementById('cart-list');
    let total = 0;
    list.innerHTML = cart.length ? '' : '<p>No hay productos seleccionados.</p>';
    cart.forEach(i => { total += i.precio; list.innerHTML += `<div style="padding:10px; border-bottom:1px solid #eee">${i.nombre} - $${i.precio}</div>`; });
    document.getElementById('cart-sum').innerText = `$${total.toFixed(2)}`;
    showModal('modal-cart');
};

document.getElementById('admin-orders-btn').onclick = () => showModal('modal-orders');
document.getElementById('view-my-orders').onclick = () => {
    document.getElementById('orders-title-text').innerText = "Mis Solicitudes";
    showModal('modal-orders');
};
document.getElementById('open-add-modal').onclick = () => showModal('modal-add');