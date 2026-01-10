import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, getDoc, getDocs, setDoc, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, updateEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBXYrQwpfcuAili1HvrmDGEWKjj_2j_lzY",
    authDomain: "proyectovendor.firebaseapp.com",
    projectId: "proyectovendor"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Cloudinary
const CLOUD_NAME = "df79cjklp";
const UPLOAD_PRESET = "vendors_preset";

let cart = [];
let allProducts = [];
let isLoginMode = true;

// --- NAVEGACIÓN ---
window.showView = (id) => {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById(id).style.display = 'block';
};

window.showModal = (id) => document.getElementById(id).style.display = 'flex';
window.closeModal = (id) => document.getElementById(id).style.display = 'none';

window.toggleAuth = () => {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? "Bienvenido" : "Crea tu Cuenta";
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
            await setDoc(doc(db, "users", res.user.uid), { email, role: 'user', name: email.split('@')[0] });
        }
    } catch (err) { alert("Error: " + err.message); }
};

onAuthStateChanged(auth, async user => {
    if(user) {
        const uSnap = await getDoc(doc(db, "users", user.uid));
        const role = (user.email === 'admin@vendors.com') ? 'admin' : (uSnap.exists() ? uSnap.data().role : 'user');
        
        if(role === 'admin') {
            showView('view-admin');
            initAdmin();
        } else {
            showView('view-user');
            initUser();
        }
    } else {
        showView('view-landing');
    }
});

window.logout = () => signOut(auth);

// --- LÓGICA DE TIENDA (USUARIO) ---
function initUser() {
    onSnapshot(query(collection(db, "products"), orderBy("date", "desc")), snap => {
        allProducts = snap.docs.map(d => ({id: d.id, ...d.data()}));
        renderProducts(allProducts);
    });
    loadUserOrders();
}

function renderProducts(list) {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';
    list.forEach(p => {
        grid.innerHTML += `
            <div class="p-card">
                <img src="${p.image}">
                <div class="p-info">
                    <h3>${p.name}</h3>
                    <p style="font-size:0.8rem; color:#64748b">${p.desc}</p>
                    <p class="p-price">$${p.price.toFixed(2)}</p>
                    <button class="btn-block" onclick="addToCart('${p.id}')">Añadir al Carrito</button>
                </div>
            </div>`;
    });
}

window.addToCart = (id) => {
    const item = allProducts.find(p => p.id === id);
    cart.push(item);
    updateCartUI();
};

function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;
    const list = document.getElementById('cart-items');
    list.innerHTML = '';
    let subtotal = 0;
    cart.forEach((item, index) => {
        subtotal += item.price;
        list.innerHTML += `<div class="order-item"><span>${item.name}</span> <b>$${item.price}</b> <i class="fas fa-trash text-red" onclick="removeFromCart(${index})"></i></div>`;
    });
    const tax = subtotal * 0.07;
    document.getElementById('cart-subtotal').innerText = `$${subtotal.toFixed(2)}`;
    document.getElementById('cart-tax').innerText = `$${tax.toFixed(2)}`;
    document.getElementById('cart-total').innerText = `$${(subtotal + tax).toFixed(2)}`;
}

window.removeFromCart = (index) => {
    cart.splice(index, 1);
    updateCartUI();
};

window.togglePaymentInfo = () => {
    const method = document.getElementById('check-payment').value;
    const note = document.getElementById('payment-instructions');
    if(method === 'yappy') note.innerText = "Envía el total al 6937-6895 (Emanuel Cedeño). Adjunta captura en el chat de entrega.";
    else if(method === 'ach') note.innerText = "Banco General, Cuenta de Ahorros: 04-72-98-123456-0. Nombre: Emanuel Cedeño.";
    else note.innerText = "El pago se realizará en efectivo al momento de recibir los suministros.";
};

document.getElementById('form-checkout').onsubmit = async (e) => {
    e.preventDefault();
    if(cart.length === 0) return alert("Carrito vacío");

    const orderData = {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        customer: document.getElementById('check-name').value,
        address: document.getElementById('check-address').value,
        phone: document.getElementById('check-phone').value,
        payment: document.getElementById('check-payment').value,
        items: cart.map(i => i.name),
        total: parseFloat(document.getElementById('cart-total').innerText.replace('$','')),
        status: 'Pendiente',
        date: Date.now()
    };

    await addDoc(collection(db, "orders"), orderData);
    alert("Pedido enviado con éxito");
    cart = [];
    updateCartUI();
    closeModal('modal-checkout');
    closeModal('modal-cart');
};

function loadUserOrders() {
    const q = query(collection(db, "orders"), where("userId", "==", auth.currentUser.uid), orderBy("date", "desc"));
    onSnapshot(q, snap => {
        const div = document.getElementById('user-orders');
        div.innerHTML = '';
        snap.forEach(d => {
            const o = d.data();
            div.innerHTML += `
                <div class="order-item">
                    <div><b>Pedido #${d.id.slice(0,5)}</b><br><small>${o.items.join(', ')}</small></div>
                    <div class="status-badge ${o.status === 'Pendiente' ? 'pending' : 'approved'}">${o.status}</div>
                </div>`;
        });
    });
}

// --- ADMIN ---
function initAdmin() {
    onSnapshot(collection(db, "products"), snap => {
        const list = document.getElementById('admin-product-list');
        list.innerHTML = '';
        snap.forEach(d => {
            const p = d.data();
            list.innerHTML += `
                <div class="p-card">
                    <img src="${p.image}">
                    <div class="p-info">
                        <h4>${p.name}</h4>
                        <button class="btn-block text-red" onclick="deleteProd('${d.id}')">Eliminar</button>
                    </div>
                </div>`;
        });
    });

    onSnapshot(collection(db, "orders"), snap => {
        const list = document.getElementById('admin-requests-list');
        let revenue = 0;
        let pendingCount = 0;
        list.innerHTML = '';
        snap.forEach(d => {
            const o = d.data();
            if(o.status === 'Aprobado') revenue += o.total;
            else pendingCount++;

            list.innerHTML += `
                <div class="order-item">
                    <div>
                        <b>Cliente: ${o.customer}</b> (${o.phone})<br>
                        <small>Pago: ${o.payment} | Total: $${o.total}</small><br>
                        <p>Dirección: ${o.address}</p>
                    </div>
                    <div>
                        <button onclick="updateOrderStatus('${d.id}', 'Aprobado')" class="btn-success">Confirmar</button>
                        <button onclick="updateOrderStatus('${d.id}', 'Rechazado')" class="text-red">X</button>
                    </div>
                </div>`;
        });
        document.getElementById('stat-revenue').innerText = `$${revenue.toFixed(2)}`;
        document.getElementById('stat-pending').innerText = pendingCount;
    });

    getDocs(collection(db, "users")).then(snap => {
        document.getElementById('stat-users').innerText = snap.size;
        const uList = document.getElementById('admin-users-list');
        uList.innerHTML = '';
        snap.forEach(d => {
            const u = d.data();
            uList.innerHTML += `<div class="order-item">${u.email} <button onclick="deleteUser('${d.id}')" class="text-red">Eliminar</button></div>`;
        });
    });
}

document.getElementById('form-add-product').onsubmit = async (e) => {
    e.preventDefault();
    const file = document.getElementById('prod-file').files[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
    const imgData = await res.json();

    await addDoc(collection(db, "products"), {
        name: document.getElementById('prod-name').value,
        desc: document.getElementById('prod-desc').value,
        price: parseFloat(document.getElementById('prod-price').value),
        category: document.getElementById('prod-cat').value,
        image: imgData.secure_url,
        date: Date.now()
    });
    alert("Producto subido");
    closeModal('modal-add-product');
};

window.deleteProd = async (id) => { if(confirm("¿Eliminar?")) await deleteDoc(doc(db, "products", id)); };
window.updateOrderStatus = async (id, status) => { await updateDoc(doc(db, "orders", id), { status }); };

window.switchTab = (id) => {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).style.display = 'block';
    event.currentTarget.classList.add('active');
};
