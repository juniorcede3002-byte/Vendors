import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, getDoc, setDoc, updateDoc, deleteDoc, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const CLOUD_NAME = "df79cjklp";
const UPLOAD_PRESET = "vendors_preset";

let currentUser = null;
let cart = [];

// --- NAVEGACIÓN ---
window.showView = (id) => {
    document.querySelectorAll('.view-section').forEach(v => v.style.display = 'none');
    document.getElementById(id).style.display = id === 'auth-screen' ? 'flex' : 'block';
};

// --- AUTH Y ROLES ---
document.getElementById('login-google').onclick = () => signInWithPopup(auth, provider);
window.logout = () => signOut(auth).then(() => location.reload());

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userRef = doc(db, "usuarios", user.uid);
        const snap = await getDoc(userRef);
        let uData;

        if (!snap.exists()) {
            uData = { nombre: user.displayName, email: user.email, rol: 'user', direccion: '' };
            await setDoc(userRef, uData);
        } else {
            uData = snap.data();
        }

        document.body.className = `${uData.rol}-mode`;
        document.getElementById('user-avatar').src = user.photoURL;
        document.getElementById('user-name-display').innerText = uData.nombre;
        document.getElementById('prof-name-input').value = uData.nombre;
        document.getElementById('prof-addr-input').value = uData.direccion || '';
        
        showView('app-screen');
        initRealtimeData();
    } else {
        showView('landing-page');
    }
});

// --- CARGA DE DATOS REALTIME ---
function initRealtimeData() {
    // 1. Productos
    onSnapshot(query(collection(db, "productos"), orderBy("fecha", "desc")), (snap) => {
        const grid = document.getElementById('product-grid');
        grid.innerHTML = '';
        snap.forEach(d => {
            const p = d.data();
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-img-container">
                    ${p.tipo === 'video' ? `<video src="${p.mediaUrl}" muted loop onmouseover="this.play()" onmouseout="this.pause()"></video>` : `<img src="${p.mediaUrl}">`}
                </div>
                <div style="padding:15px">
                    <small style="color:var(--pri); font-weight:bold">${p.categoria.toUpperCase()}</small>
                    <h4 style="margin:5px 0">${p.nombre}</h4>
                    <p style="font-weight:800; font-size:1.2rem">$${p.precio}</p>
                    <button class="user-only btn-save" onclick="addToCart('${d.id}', '${p.nombre}', ${p.precio})">Agregar a Bolsa</button>
                    <button class="admin-only btn-save" style="background:#ef4444" onclick="deleteProd('${d.id}')">Eliminar</button>
                </div>
            `;
            grid.appendChild(card);
        });
    });

    // 2. Pedidos (Historial Usuario y Admin)
    onSnapshot(query(collection(db, "pedidos"), orderBy("fecha", "desc")), (snap) => {
        const adminList = document.getElementById('admin-orders-list');
        const userList = document.getElementById('user-history-list');
        adminList.innerHTML = ''; userList.innerHTML = '';

        snap.forEach(d => {
            const o = d.data();
            const itemHTML = `
                <div class="history-item">
                    <div style="display:flex; justify-content:space-between">
                        <strong>${o.items.map(i => i.nombre).join(', ')}</strong>
                        <span style="color:var(--pri)">$${o.total}</span>
                    </div>
                    <p style="font-size:0.8rem; margin:5px 0">Estado: <b>${o.estado.toUpperCase()}</b> | Solicita: ${o.userName}</p>
                    ${o.estado === 'pendiente' ? `
                        <div class="admin-only" style="display:flex; gap:10px; margin-top:10px">
                            <button class="btn-save" style="background:#10b981" onclick="updateStatus('${d.id}', 'aprobado')">Aprobar</button>
                            <button class="btn-save" style="background:#ef4444" onclick="updateStatus('${d.id}', 'rechazado')">Rechazar</button>
                        </div>
                    ` : ''}
                </div>
            `;
            if (o.userId === currentUser.uid) userList.innerHTML += itemHTML;
            adminList.innerHTML += itemHTML;
        });
    });
}

// --- FUNCIONES DE PRODUCTOS (ADMIN) ---
document.getElementById('add-item-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-upload');
    btn.disabled = true; btn.innerText = "Subiendo...";

    try {
        const file = document.getElementById('item-file').files[0];
        const fData = new FormData();
        fData.append('file', file);
        fData.append('upload_preset', UPLOAD_PRESET);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: 'POST', body: fData });
        const data = await res.json();

        await addDoc(collection(db, "productos"), {
            nombre: document.getElementById('item-name').value,
            categoria: document.getElementById('item-cat').value,
            precio: parseFloat(document.getElementById('item-price').value),
            mediaUrl: data.secure_url,
            tipo: data.resource_type,
            fecha: new Date()
        });
        closeModal('modal-add-product');
        e.target.reset();
    } catch (err) { alert("Error al subir"); }
    finally { btn.disabled = false; btn.innerText = "Publicar Suministro"; }
};

window.deleteProd = async (id) => { if(confirm("¿Eliminar suministro?")) await deleteDoc(doc(db, "productos", id)); };

// --- CARRITO Y PEDIDOS (USER) ---
window.addToCart = (id, nombre, precio) => {
    cart.push({ id, nombre, precio });
    document.getElementById('cart-count').innerText = cart.length;
    alert(`${nombre} añadido`);
};

window.processOrder = async () => {
    if(!cart.length) return;
    await addDoc(collection(db, "pedidos"), {
        userId: currentUser.uid,
        userName: currentUser.displayName,
        items: cart,
        total: cart.reduce((a, b) => a + b.precio, 0),
        estado: 'pendiente',
        fecha: new Date()
    });
    alert("Pedido enviado para aprobación.");
    cart = []; document.getElementById('cart-count').innerText = "0";
    closeModal('modal-cart');
};

window.updateStatus = async (id, status) => { await updateDoc(doc(db, "pedidos", id), { estado: status }); };

// --- PERFIL ---
document.getElementById('profile-edit-form').onsubmit = async (e) => {
    e.preventDefault();
    await setDoc(doc(db, "usuarios", currentUser.uid), {
        nombre: document.getElementById('prof-name-input').value,
        direccion: document.getElementById('prof-addr-input').value
    }, { merge: true });
    alert("Perfil actualizado.");
};

// --- HELPERS UI ---
window.showModal = (id) => {
    if(id === 'modal-cart') {
        const list = document.getElementById('cart-items-list');
        list.innerHTML = cart.map(i => `<div style="padding:10px; border-bottom:1px solid #eee">${i.nombre} - $${i.precio}</div>`).join('');
        document.getElementById('cart-total-sum').innerText = `$${cart.reduce((a,b)=>a+b.precio,0)}`;
    }
    document.getElementById(id).style.display = 'flex';
};
window.closeModal = (id) => document.getElementById(id).style.display = 'none';

document.getElementById('btn-cart').onclick = () => showModal('modal-cart');
document.getElementById('btn-admin-panel').onclick = () => showModal('modal-admin-orders');
document.getElementById('btn-add-stock').onclick = () => showModal('modal-add-product');