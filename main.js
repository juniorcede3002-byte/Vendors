import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, getDoc, setDoc, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBXYrQwpfcuAili1HvrmDGEWKjj_2j_lzY",
    authDomain: "proyectovendor.firebaseapp.com",
    projectId: "proyectovendor"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const CLOUD_NAME = "df79cjklp";
const UPLOAD_PRESET = "vendors_preset";

let cart = [];
let allProducts = [];
let isLoginMode = true;

// --- VISTAS ---
window.showView = (id) => {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById(id).style.display = 'block';
};

window.openModal = (id) => document.getElementById(id).style.display = 'flex';
window.closeModal = (id) => document.getElementById(id).style.display = 'none';

window.toggleAuth = () => {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? "Iniciar Sesión" : "Registrarse";
};

// --- AUTH ---
document.getElementById('form-auth').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;
    try {
        if(isLoginMode) await signInWithEmailAndPassword(auth, email, pass);
        else {
            const res = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "users", res.user.uid), { email, role: 'user' });
        }
    } catch (err) { alert("Error: " + err.message); }
};

onAuthStateChanged(auth, async user => {
    if(user) {
        const isAdmin = user.email === 'admin@vendors.com';
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin ? 'block' : 'none');
        document.querySelectorAll('.user-only').forEach(el => el.style.display = isAdmin ? 'none' : 'block');
        showView('view-app');
        loadProducts();
        if(isAdmin) loadAdminData(); else loadUserOrders();
    } else {
        showView('view-landing');
    }
});

window.logout = () => signOut(auth);

// --- TIENDA ---
function loadProducts() {
    onSnapshot(query(collection(db, "productos"), orderBy("fecha", "desc")), snap => {
        allProducts = snap.docs.map(d => ({id: d.id, ...d.data()}));
        renderGrid(allProducts);
    });
}

function renderGrid(list) {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';
    const isAdmin = auth.currentUser?.email === 'admin@vendors.com';
    list.forEach(p => {
        grid.innerHTML += `
            <div class="card">
                ${isAdmin ? `<button onclick="deleteProd('${p.id}')" style="position:absolute;top:10;right:10;background:red;color:white;padding:5px;border-radius:5px;">X</button>` : ''}
                <img src="${p.imagen}">
                <div class="card-content">
                    <h3>${p.nombre}</h3>
                    <p class="price">$${p.precio.toFixed(2)}</p>
                    ${!isAdmin ? `<button class="btn-primary-full" onclick="addToCart('${p.id}')">Añadir a la bolsa</button>` : ''}
                </div>
            </div>`;
    });
}

window.addToCart = (id) => {
    const prod = allProducts.find(p => p.id === id);
    cart.push(prod);
    updateCartUI();
    alert("Agregado al carrito");
};

function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;
    let sub = cart.reduce((acc, curr) => acc + curr.precio, 0);
    let tax = sub * 0.07;
    document.getElementById('cart-subtotal').innerText = `$${sub.toFixed(2)}`;
    document.getElementById('cart-tax').innerText = `$${tax.toFixed(2)}`;
    document.getElementById('cart-total').innerText = `$${(sub + tax).toFixed(2)}`;
    
    const itemsDiv = document.getElementById('cart-items');
    itemsDiv.innerHTML = cart.map((item, i) => `
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;border-bottom:1px solid #eee;padding-bottom:5px;">
            <span>${item.nombre}</span>
            <b>$${item.precio}</b>
            <span onclick="removeFromCart(${i})" style="color:red;cursor:pointer;">&times;</span>
        </div>
    `).join('');
}

window.removeFromCart = (i) => { cart.splice(i, 1); updateCartUI(); };

// --- CHECKOUT ---
document.getElementById('form-checkout').onsubmit = async (e) => {
    e.preventDefault();
    const order = {
        userId: auth.currentUser.uid,
        email: auth.currentUser.email,
        cliente: document.getElementById('check-name').value,
        ubicacion: document.getElementById('check-address').value,
        items: cart.map(i => i.nombre),
        total: parseFloat(document.getElementById('cart-total').innerText.replace('$','')),
        metodo: document.getElementById('check-method').value,
        estado: 'Pendiente',
        fecha: Date.now()
    };
    await addDoc(collection(db, "orders"), order);
    alert("¡Pedido Realizado! Emanuel revisará tu pago pronto.");
    cart = []; updateCartUI(); closeModal('modal-checkout'); closeModal('modal-cart');
};

// --- ADMIN LOGIC ---
function loadAdminData() {
    onSnapshot(collection(db, "orders"), snap => {
        let revenue = 0;
        const list = document.getElementById('admin-orders-list');
        list.innerHTML = '';
        snap.forEach(d => {
            const o = d.data();
            if(o.estado === 'Aprobado') revenue += o.total;
            list.innerHTML += `
                <div class="info-box" style="background:white; color:black;">
                    <b>Cliente: ${o.cliente}</b> - $${o.total}<br>
                    <small>Ubicación: ${o.ubicacion}</small><br>
                    <small>Items: ${o.items.join(', ')}</small><br>
                    <button onclick="updateOrder('${d.id}', 'Aprobado')" style="background:green;color:white;padding:4px 8px;border-radius:5px;margin-top:5px;">Aprobar Pago</button>
                </div>`;
        });
        document.getElementById('stat-revenue').innerText = `$${revenue.toFixed(2)}`;
        document.getElementById('stat-orders').innerText = snap.size;
    });
}

document.getElementById('form-add-product').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-p-upload');
    btn.innerText = "Subiendo..."; btn.disabled = true;
    try {
        const file = document.getElementById('p-file').files[0];
        const fData = new FormData();
        fData.append('file', file);
        fData.append('upload_preset', UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fData });
        const img = await res.json();

        await addDoc(collection(db, "productos"), {
            nombre: document.getElementById('p-name').value,
            precio: parseFloat(document.getElementById('p-price').value),
            imagen: img.secure_url,
            fecha: Date.now()
        });
        alert("Producto Publicado");
        closeModal('modal-add-product');
    } catch { alert("Error al subir"); }
    finally { btn.innerText = "Subir Producto"; btn.disabled = false; }
};

window.deleteProd = async (id) => { if(confirm("¿Eliminar?")) await deleteDoc(doc(db, "productos", id)); };
window.updateOrder = async (id, status) => { await updateDoc(doc(db, "orders", id), { estado: status }); };
window.switchAdminTab = (tab) => {
    document.getElementById('inventory-section').style.display = tab === 'inventory' ? 'block' : 'none';
    document.getElementById('requests-section').style.display = tab === 'requests' ? 'block' : 'none';
};
