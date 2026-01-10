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

// ESTADO GLOBAL
let products = [];
let cart = [];
let currentRole = 'user';
let currentCategory = 'todos';
let searchTerm = '';

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    initRealtimeData();
    setupEventListeners();
});

// --- ROLES ---
window.setRole = (role) => {
    currentRole = role;
    document.body.className = `role-${role}`;
    document.getElementById('current-role-text').innerText = role === 'admin' ? 'Admin' : 'Usuario';
    closeAllModals();
};

// --- ESCUCHA DE DATOS ---
function initRealtimeData() {
    // Escuchar Productos
    onSnapshot(query(collection(db, "productos"), orderBy("fecha", "desc")), (snap) => {
        products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderGrid();
    });

    // Escuchar Pedidos
    onSnapshot(query(collection(db, "pedidos"), orderBy("fecha", "desc")), (snap) => {
        const pedidos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderOrders(pedidos);
    });
}

// --- RENDERIZADO INTELIGENTE (BÚSQUEDA Y FILTRO) ---
function renderGrid() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = "";

    const filtered = products.filter(p => {
        const matchesCat = currentCategory === 'todos' || p.categoria === currentCategory;
        const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCat && matchesSearch;
    });

    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-media">
                ${p.tipo === 'video' ? `<video src="${p.mediaUrl}"></video>` : `<img src="${p.mediaUrl}">`}
            </div>
            <div class="card-body">
                <h3>${p.nombre}</h3>
                <div style="display:flex; justify-content:space-between; align-items:center">
                    <span class="price">$${p.precio.toFixed(2)}</span>
                    <div class="admin-only">
                        <button class="btn-danger-sm" onclick="event.stopPropagation(); deleteProd('${p.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        card.onclick = () => openDetail(p);
        grid.appendChild(card);
    });
}

// --- BUSCADOR Y FILTROS ---
function setupEventListeners() {
    // Buscador
    document.getElementById('search-input').oninput = (e) => {
        searchTerm = e.target.value;
        renderGrid();
    };

    // Filtros
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.onclick = () => {
            document.querySelector('.filter-chip.active').classList.remove('active');
            chip.classList.add('active');
            currentCategory = chip.dataset.category;
            renderGrid();
        };
    });

    // Modales disparadores
    document.getElementById('profile-trigger').onclick = () => showModal('modal-role');
    document.getElementById('cart-trigger').onclick = () => { renderCart(); showModal('modal-cart'); };
    document.getElementById('btn-open-upload').onclick = () => showModal('modal-upload');
    document.getElementById('btn-open-admin-orders').onclick = () => showModal('modal-orders');
    document.getElementById('view-orders-btn')?.addEventListener('click', () => showModal('modal-orders'));

    // Cerrar modales
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => closeAllModals();
    });
}

// --- FUNCIONES CORE ---
async function deleteProd(id) {
    if(confirm("¿Eliminar del stock?")) await deleteDoc(doc(db, "productos", id));
}

function openDetail(p) {
    const box = document.getElementById('detail-media');
    box.innerHTML = p.tipo === 'video' ? `<video src="${p.mediaUrl}" controls autoplay></video>` : `<img src="${p.mediaUrl}">`;
    document.getElementById('detail-title').innerText = p.nombre;
    document.getElementById('detail-desc').innerText = p.descripcion;
    document.getElementById('detail-price').innerText = `$${p.precio.toFixed(2)}`;
    document.getElementById('detail-cat').innerText = p.categoria;
    
    document.getElementById('btn-add-to-cart').onclick = () => {
        cart.push(p);
        updateCartCount();
        closeAllModals();
    };
    showModal('modal-detail');
}

// --- GESTIÓN DE CARRITO Y CHECKOUT ---
function updateCartCount() {
    document.getElementById('cart-count').innerText = cart.length;
}

function renderCart() {
    const list = document.getElementById('cart-items-list');
    let total = 0;
    list.innerHTML = cart.length ? "" : "<p>Bolsa vacía</p>";
    cart.forEach((item, i) => {
        total += item.precio;
        list.innerHTML += `
            <div class="cart-item">
                <div><strong>${item.nombre}</strong><br><small>$${item.precio}</small></div>
                <button onclick="removeFromCart(${i})" class="btn-remove">Quitar</button>
            </div>
        `;
    });
    document.getElementById('cart-total-amount').innerText = `$${total.toFixed(2)}`;
}

window.removeFromCart = (i) => { cart.splice(i,1); renderCart(); updateCartCount(); };

document.getElementById('btn-checkout').onclick = () => {
    if(!cart.length) return;
    hideModal('modal-cart');
    showModal('modal-checkout');
};

document.getElementById('checkout-form').onsubmit = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "pedidos"), {
        productos: cart,
        total: cart.reduce((a,b) => a + b.precio, 0),
        ubicacion: document.getElementById('check-location').value,
        estado: 'pendiente',
        fecha: new Date(),
        rol: currentRole
    });
    alert("Pedido enviado. Pendiente de aprobación.");
    cart = []; updateCartCount(); closeAllModals();
};

// --- GESTIÓN DE PEDIDOS (ADMIN) ---
function renderOrders(pedidos) {
    const container = document.getElementById('orders-container');
    container.innerHTML = "";
    pedidos.forEach(o => {
        const card = document.createElement('div');
        card.className = 'order-card';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between">
                <strong>Pedido: ${o.productos.map(p => p.nombre).join(', ')}</strong>
                <span class="status-badge status-${o.estado}">${o.estado}</span>
            </div>
            <p>Ubicación: ${o.ubicacion}</p>
            <div class="admin-only" style="margin-top:10px">
                <button class="btn-approve" onclick="changeStatus('${o.id}', 'aprobado')">Aprobar</button>
                <button class="btn-reject" onclick="changeStatus('${o.id}', 'rechazado')">Rechazar</button>
            </div>
        `;
        container.appendChild(card);
    });
}

window.changeStatus = async (id, status) => {
    await updateDoc(doc(db, "pedidos", id), { estado: status });
};

// --- SUBIDA (ADMIN) ---
document.getElementById('upload-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-publish');
    btn.disabled = true; btn.innerText = "Subiendo...";
    
    const file = document.getElementById('up-file').files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: "POST", body: formData });
        const cloud = await res.json();

        await addDoc(collection(db, "productos"), {
            nombre: document.getElementById('up-name').value,
            categoria: document.getElementById('up-cat').value,
            descripcion: document.getElementById('up-desc').value,
            precio: parseFloat(document.getElementById('up-price').value),
            mediaUrl: cloud.secure_url,
            tipo: cloud.resource_type,
            fecha: new Date()
        });
        closeAllModals();
        document.getElementById('upload-form').reset();
    } catch (err) { alert(err.message); }
    finally { btn.disabled = false; btn.innerText = "Publicar"; }
};

// --- HELPERS MODALES ---
function showModal(id) { document.getElementById(id).style.display = 'flex'; }
function hideModal(id) { document.getElementById(id).style.display = 'none'; }
function closeAllModals() { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); }
function closeAllModals() { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); }