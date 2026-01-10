import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// ESTADO DE LA APP
let cart = [];

// ELEMENTOS UI
const cartModal = document.getElementById("cart-modal");
const checkoutModal = document.getElementById("checkout-modal");
const ordersModal = document.getElementById("orders-modal");
const uploadModal = document.getElementById("upload-modal");

// GESTIÓN DE MODALES
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.onclick = () => document.getElementById(btn.dataset.target).style.display = "none";
});

document.getElementById("cart-btn").onclick = () => { renderCart(); cartModal.style.display = "block"; };
document.getElementById("view-orders-btn").onclick = () => ordersModal.style.display = "block";
document.getElementById("open-upload-modal").onclick = () => uploadModal.style.display = "block";

// --- FUNCIONES DEL CARRITO ---
function addToCart(product) {
    cart.push(product);
    updateCartUI();
}

function updateCartUI() {
    document.getElementById("cart-count").innerText = cart.length;
}

function renderCart() {
    const container = document.getElementById("cart-items");
    let total = 0;
    container.innerHTML = "";
    
    cart.forEach((item, index) => {
        total += item.precio;
        container.innerHTML += `
            <div class="cart-item">
                <span>${item.nombre} - $${item.precio.toFixed(2)}</span>
                <button class="btn-remove" onclick="window.removeFromCart(${index})"><i class="fas fa-trash"></i></button>
            </div>
        `;
    });
    document.getElementById("cart-total").innerText = `$${total.toFixed(2)}`;
}

window.removeFromCart = (index) => {
    cart.splice(index, 1);
    renderCart();
    updateCartUI();
};

// --- FLUJO DE COMPRA ---
document.getElementById("checkout-btn").onclick = () => {
    if(cart.length === 0) return alert("El carrito está vacío");
    cartModal.style.display = "none";
    checkoutModal.style.display = "block";
    
    const summary = document.getElementById("order-summary");
    summary.innerHTML = `<p><strong>Productos a confirmar:</strong> ${cart.map(i => i.nombre).join(", ")}</p>`;
};

document.getElementById("order-form").onsubmit = async (e) => {
    e.preventDefault();
    const location = document.getElementById("order-location").value;
    const total = cart.reduce((acc, item) => acc + item.precio, 0);

    try {
        await addDoc(collection(db, "pedidos"), {
            productos: cart,
            ubicacion: location,
            total: total,
            estado: "pendiente",
            fecha: new Date(),
            usuario: "Usuario Invitado" // Aquí iría el nombre del login después
        });

        alert("Pedido enviado. Estado: PENDIENTE. Espera la aprobación del administrador.");
        cart = [];
        updateCartUI();
        checkoutModal.style.display = "none";
        document.getElementById("order-form").reset();
    } catch (err) {
        alert("Error al procesar pedido: " + err.message);
    }
};

// --- RENDERIZADO DE PRODUCTOS (VISTA PRINCIPAL) ---
onSnapshot(query(collection(db, "productos"), orderBy("fecha", "desc")), (snap) => {
    const list = document.getElementById("product-list");
    list.innerHTML = "";
    snap.forEach(doc => {
        const p = doc.data();
        const media = p.tipo === "video" ? `<video src="${p.mediaUrl}"></video>` : `<img src="${p.mediaUrl}">`;
        
        const el = document.createElement("div");
        el.className = "product-card";
        el.innerHTML = `
            <div class="media-container">${media}</div>
            <div class="card-body">
                <h3>${p.nombre}</h3>
                <p style="font-size:0.8rem; color:#666">${p.descripcion.substring(0,50)}...</p>
                <strong>$${p.precio.toFixed(2)}</strong>
                <button class="btn-add-cart">Añadir al Carrito</button>
            </div>
        `;
        el.querySelector(".btn-add-cart").onclick = () => addToCart(p);
        list.appendChild(el);
    });
});

// --- RENDERIZADO DE PEDIDOS (ESTADO PARA USUARIO) ---
onSnapshot(query(collection(db, "pedidos"), orderBy("fecha", "desc")), (snap) => {
    const container = document.getElementById("orders-list");
    container.innerHTML = "";
    snap.forEach(docSnap => {
        const o = docSnap.data();
        container.innerHTML += `
            <div class="order-card">
                <div style="display:flex; justify-content:space-between">
                    <strong>Pedido #${docSnap.id.substring(0,5)}</strong>
                    <span class="status-badge status-${o.estado}">${o.estado}</span>
                </div>
                <p style="font-size:0.9rem; margin:5px 0">Ubicación: ${o.ubicacion}</p>
                <small>Total: $${o.total.toFixed(2)}</small>
            </div>
        `;
    });
});

// (Lógica de subir producto del Admin se mantiene igual que la anterior)
document.getElementById("product-form").onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btn-save");
    const file = document.getElementById("media-file").files[0];
    const name = document.getElementById("product-name").value;
    const desc = document.getElementById("product-desc").value;
    const price = document.getElementById("product-price").value;

    try {
        btn.disabled = true; btn.innerText = "Subiendo...";
        const formData = new FormData();
        formData.append("file", file); formData.append("upload_preset", UPLOAD_PRESET);
        const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: "POST", body: formData });
        const cloudData = await cloudRes.json();

        await addDoc(collection(db, "productos"), {
            nombre: name, descripcion: desc, precio: parseFloat(price),
            mediaUrl: cloudData.secure_url, tipo: cloudData.resource_type, fecha: new Date()
        });
        uploadModal.style.display = "none";
        document.getElementById("product-form").reset();
    } catch (err) { alert(err.message); } finally { btn.disabled = false; btn.innerText = "Publicar"; }
};