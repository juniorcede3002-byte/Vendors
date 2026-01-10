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

// --- ESTADO GLOBAL ---
let cart = [];
let selectedProduct = null;

// --- GESTIÓN DE MODALES ---
const showModal = (id) => document.getElementById(id).style.display = "flex";
const hideModal = (id) => document.getElementById(id).style.display = "none";

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.onclick = () => hideModal(btn.dataset.target);
});

document.getElementById("cart-btn").onclick = () => { renderCart(); showModal("cart-modal"); };
document.getElementById("view-orders-btn").onclick = () => showModal("user-orders-modal");
document.getElementById("admin-panel-btn").onclick = () => showModal("admin-orders-modal");
document.getElementById("open-upload-modal").onclick = () => showModal("upload-modal");

// --- LÓGICA DE PRODUCTOS (ADMIN) ---
document.getElementById("product-form").onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btn-publish");
    const file = document.getElementById("media-file").files[0];
    try {
        btn.disabled = true; btn.innerText = "Subiendo...";
        const formData = new FormData();
        formData.append("file", file); formData.append("upload_preset", UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: "POST", body: formData });
        const data = await res.json();

        await addDoc(collection(db, "productos"), {
            nombre: document.getElementById("p-name").value,
            descripcion: document.getElementById("p-desc").value,
            precio: parseFloat(document.getElementById("p-price").value),
            mediaUrl: data.secure_url,
            tipo: data.resource_type,
            fecha: new Date()
        });
        hideModal("upload-modal"); document.getElementById("product-form").reset();
    } catch (err) { alert(err.message); } finally { btn.disabled = false; btn.innerText = "Publicar"; }
};

// --- RENDERIZADO DEL FEED ---
onSnapshot(query(collection(db, "productos"), orderBy("fecha", "desc")), (snap) => {
    const feed = document.getElementById("main-feed");
    feed.innerHTML = "";
    snap.forEach(documento => {
        const p = documento.data();
        const id = documento.id;
        const media = p.tipo === "video" ? `<video src="${p.mediaUrl}"></video>` : `<img src="${p.mediaUrl}">`;
        
        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = `
            <div class="media-box">${media}</div>
            <div class="card-info">
                <h3>${p.nombre}</h3>
                <span class="price-tag">$${p.precio.toFixed(2)}</span>
                <button class="btn-danger-sm" onclick="event.stopPropagation(); deleteProduct('${id}')">Eliminar</button>
            </div>
        `;
        card.onclick = () => openDetails(p);
        feed.appendChild(card);
    });
});

window.deleteProduct = async (id) => { if(confirm("¿Eliminar producto?")) await deleteDoc(doc(db, "productos", id)); };

// --- DETALLES Y CARRITO ---
function openDetails(p) {
    selectedProduct = p;
    const box = document.getElementById("detail-media-box");
    box.innerHTML = p.tipo === "video" ? `<video src="${p.mediaUrl}" controls autoplay></video>` : `<img src="${p.mediaUrl}">`;
    document.getElementById("detail-name").innerText = p.nombre;
    document.getElementById("detail-description").innerText = p.descripcion;
    document.getElementById("detail-price").innerText = `$${p.precio.toFixed(2)}`;
    showModal("details-modal");
}

document.getElementById("add-from-detail").onclick = () => {
    cart.push(selectedProduct);
    updateCartCounter();
    hideModal("details-modal");
};

const updateCartCounter = () => document.getElementById("cart-count").innerText = cart.length;

function renderCart() {
    const list = document.getElementById("cart-items");
    let total = 0; list.innerHTML = "";
    cart.forEach((item, i) => {
        total += item.precio;
        list.innerHTML += `<div class="cart-item"><span>${item.nombre}</span> <strong>$${item.precio}</strong></div>`;
    });
    document.getElementById("cart-total").innerText = `$${total.toFixed(2)}`;
}

document.getElementById("go-to-checkout").onclick = () => {
    if(cart.length === 0) return alert("Carrito vacío");
    hideModal("cart-modal"); showModal("checkout-modal");
    document.getElementById("order-summary-list").innerHTML = `Resumen: ${cart.length} productos.`;
};

// --- LÓGICA DE PEDIDOS ---
document.getElementById("order-form").onsubmit = async (e) => {
    e.preventDefault();
    const locValue = document.getElementById("order-location").value;
    await addDoc(collection(db, "pedidos"), {
        items: cart,
        ubicacion: locValue,
        total: cart.reduce((a, b) => a + b.precio, 0),
        estado: "pendiente",
        fecha: new Date()
    });
    alert("Pedido enviado. Estado: PENDIENTE");
    cart = []; updateCartCounter(); hideModal("checkout-modal");
};

// --- PANEL USUARIO Y ADMIN ---
onSnapshot(query(collection(db, "pedidos"), orderBy("fecha", "desc")), (snap) => {
    const userList = document.getElementById("user-orders-list");
    const adminList = document.getElementById("admin-orders-list");
    userList.innerHTML = ""; adminList.innerHTML = "";

    snap.forEach(dSnap => {
        const o = dSnap.data();
        const id = dSnap.id;
        const html = `
            <div class="order-card">
                <strong>Pedido: ${o.items.map(i => i.nombre).join(", ")}</strong>
                <p>Ubicación: ${o.ubicacion}</p>
                <p>Total: $${o.total.toFixed(2)}</p>
                <span class="status-badge status-${o.estado}">${o.estado}</span>
            </div>
        `;
        userList.innerHTML += html;

        // Vista Admin con botones
        if(o.estado === "pendiente") {
            const adminCard = document.createElement("div");
            adminCard.className = "order-card";
            adminCard.innerHTML = html + `
                <div style="margin-top:10px">
                    <button class="btn-approve" onclick="updateStatus('${id}', 'aprobado')">Aprobar</button>
                    <button class="btn-reject" onclick="updateStatus('${id}', 'rechazado')">Rechazar</button>
                </div>
            `;
            adminList.appendChild(adminCard);
        } else {
            adminList.innerHTML += html;
        }
    });
});

window.updateStatus = async (id, nuevoEstado) => {
    await updateDoc(doc(db, "pedidos", id), { estado: nuevoEstado });
};