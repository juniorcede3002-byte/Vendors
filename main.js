import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, setDoc, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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
let isLogin = true;

// NAVEGACIÓN
window.showView = (id) => {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById(id).style.display = 'block';
};
window.openModal = (id) => document.getElementById(id).style.display = 'flex';
window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.toggleAuth = () => {
    isLogin = !isLogin;
    document.getElementById('auth-title').innerText = isLogin ? "Iniciar Sesión" : "Crear Cuenta";
};

// AUTENTICACIÓN
document.getElementById('form-auth').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;
    try {
        if(isLogin) await signInWithEmailAndPassword(auth, email, pass);
        else {
            const res = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "users_list", res.user.uid), { email, registeredAt: Date.now() });
        }
    } catch (err) { alert("Error: " + err.message); }
};

onAuthStateChanged(auth, user => {
    if(user) {
        const isAdmin = user.email === 'admin@vendors.com';
        document.getElementById('user-display-email').innerText = user.email;
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin ? 'block' : 'none');
        document.querySelectorAll('.user-only').forEach(el => el.style.display = isAdmin ? 'none' : 'block');
        showView('view-app');
        loadData(isAdmin);
    } else { showView('view-landing'); }
});

window.logout = () => signOut(auth);

// CARGAR DATOS
function loadData(isAdmin) {
    onSnapshot(query(collection(db, "products"), orderBy("date", "desc")), snap => {
        allProducts = snap.docs.map(d => ({id: d.id, ...d.data()}));
        renderGrid(allProducts, isAdmin);
    });

    if(isAdmin) {
        onSnapshot(collection(db, "orders"), snap => {
            let rev = 0;
            const list = document.getElementById('admin-orders-list');
            list.innerHTML = '';
            snap.forEach(d => {
                const o = d.data();
                if(o.status === 'Aprobado') rev += o.total;
                list.innerHTML += `
                    <div class="list-item">
                        <div><b>${o.customer}</b> - $${o.total.toFixed(2)}<br><small>${o.payment}</small></div>
                        <div>
                            <span class="status-pill status-${o.status.toLowerCase()}">${o.status}</span>
                            <button onclick="updateStatus('${d.id}', 'Aprobado')" style="color:green;margin-left:10px;"><i class="fas fa-check"></i></button>
                            <button onclick="deleteDocById('orders', '${d.id}')" style="color:red;margin-left:10px;"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>`;
            });
            document.getElementById('stat-revenue').innerText = `$${rev.toFixed(2)}`;
            document.getElementById('stat-orders').innerText = snap.size;
        });

        onSnapshot(collection(db, "users_list"), snap => {
            const uList = document.getElementById('admin-users-list');
            uList.innerHTML = '';
            snap.forEach(d => {
                uList.innerHTML += `<div class="list-item"><span>${d.data().email}</span><button onclick="deleteDocById('users_list', '${d.id}')" style="color:red">Eliminar</button></div>`;
            });
            document.getElementById('stat-users').innerText = snap.size;
        });
    } else {
        onSnapshot(query(collection(db, "orders"), where("userEmail", "==", auth.currentUser.email)), snap => {
            const list = document.getElementById('user-orders-list');
            list.innerHTML = snap.docs.map(d => `<div class="list-item"><span>Pedido #${d.id.slice(0,5)}</span><span class="status-pill status-${d.data().status.toLowerCase()}">${d.data().status}</span></div>`).join('');
        });
    }
}

// FUNCIONES DE CARRITO
window.addToCart = (id) => {
    cart.push(allProducts.find(x => x.id === id));
    updateCartUI();
};
function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;
    const sub = cart.reduce((a, b) => a + b.price, 0);
    const tax = sub * 0.07;
    document.getElementById('cart-subtotal').innerText = `$${sub.toFixed(2)}`;
    document.getElementById('cart-tax').innerText = `$${tax.toFixed(2)}`;
    document.getElementById('cart-total').innerText = `$${(sub + tax).toFixed(2)}`;
    document.getElementById('cart-items-list').innerHTML = cart.map((i, idx) => `<div class="list-item"><span>${i.name}</span><b>$${i.price}</b><i class="fas fa-times" onclick="removeFromCart(${idx})"></i></div>`).join('');
}
window.removeFromCart = (idx) => { cart.splice(idx, 1); updateCartUI(); };

// FINALIZAR COMPRA
document.getElementById('form-checkout').onsubmit = async (e) => {
    e.preventDefault();
    if(!cart.length) return alert("Carrito vacío");
    const order = {
        userEmail: auth.currentUser.email,
        customer: document.getElementById('check-name').value,
        address: document.getElementById('check-address').value,
        payment: document.getElementById('check-payment').value,
        items: cart.map(i => i.name),
        total: parseFloat(document.getElementById('cart-total').innerText.replace('$','')),
        status: 'Pendiente',
        date: Date.now()
    };
    await addDoc(collection(db, "orders"), order);
    alert("Pedido enviado.");
    cart = []; updateCartUI(); closeModal('modal-checkout'); closeModal('modal-cart');
};

// SUBIR PRODUCTO
document.getElementById('form-add-product').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-upload');
    btn.innerText = "Subiendo..."; btn.disabled = true;
    try {
        const file = document.getElementById('p-image').files[0];
        const fd = new FormData();
        fd.append("file", file);
        fd.append("upload_preset", UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: fd });
        const img = await res.json();
        await addDoc(collection(db, "products"), {
            name: document.getElementById('p-name').value,
            price: parseFloat(document.getElementById('p-price').value),
            image: img.secure_url,
            date: Date.now()
        });
        closeModal('modal-add-product');
        e.target.reset();
    } catch { alert("Error al subir"); } finally { btn.innerText = "Publicar"; btn.disabled = false; }
};

window.deleteDocById = async (col, id) => { if(confirm("¿Eliminar?")) await deleteDoc(doc(db, col, id)); };
window.updateStatus = async (id, s) => await updateDoc(doc(db, "orders", id), { status: s });

function renderGrid(list, isAdmin) {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = list.map(p => `
        <div class="card">
            <img src="${p.image}">
            <div class="card-body">
                <h3>${p.name}</h3>
                <p class="price">$${p.price.toFixed(2)}</p>
                ${isAdmin ? `<button onclick="deleteDocById('products', '${p.id}')" style="color:red">Eliminar</button>` 
                         : `<button class="btn-primary-full" onclick="addToCart('${p.id}')">Añadir</button>`}
            </div>
        </div>`).join('');
}

window.switchAdminTab = (tab) => {
    document.getElementById('sec-inventory').style.display = tab === 'inventory' ? 'block' : 'none';
    document.getElementById('sec-requests').style.display = tab === 'requests' ? 'block' : 'none';
    document.getElementById('sec-users').style.display = tab === 'users' ? 'block' : 'none';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
};