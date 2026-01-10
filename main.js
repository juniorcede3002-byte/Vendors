import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

// --- GESTIÓN DE VISTAS ---
window.showView = (id) => {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById(id).style.display = 'block';
};
window.openModal = (id) => document.getElementById(id).style.display = 'flex';
window.closeModal = (id) => document.getElementById(id).style.display = 'none';

// --- AUTENTICACIÓN ---
let isLogin = true;
window.toggleAuth = () => {
    isLogin = !isLogin;
    document.getElementById('auth-title').innerText = isLogin ? "Identificación" : "Registro Nuevo";
};

document.getElementById('form-auth').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;
    try {
        if(isLogin) await signInWithEmailAndPassword(auth, email, pass);
        else {
            const res = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "customers", res.user.uid), { email, date: Date.now() });
        }
    } catch (err) { alert(err.message); }
};

onAuthStateChanged(auth, user => {
    const infoBox = document.getElementById('user-info-box');
    const loginBtn = document.getElementById('btn-login');
    if(user) {
        infoBox.style.display = 'flex'; loginBtn.style.display = 'none';
        document.getElementById('user-tag').innerText = user.email;
        if(user.email === 'admin@vendors.com') {
            showView('view-admin');
            initAdminDashboard();
        } else { showView('view-store'); }
    } else {
        infoBox.style.display = 'none'; loginBtn.style.display = 'block';
        showView('view-store');
    }
    loadStore();
});

window.logout = () => signOut(auth);

// --- TIENDA ---
function loadStore() {
    onSnapshot(query(collection(db, "products"), orderBy("date", "desc")), snap => {
        const grid = document.getElementById('product-grid');
        grid.innerHTML = snap.docs.map(d => {
            const p = d.data();
            return `<div class="card">
                <img src="${p.image}">
                <div class="card-body">
                    <h3>${p.name}</h3>
                    <p class="price">$${p.price.toFixed(2)}</p>
                    <button class="btn-primary-full" onclick="alert('Inicia sesión para comprar')">Comprar</button>
                </div>
            </div>`;
        }).join('');
    });
}

// --- PERFIL ADMIN (DASHBOARD Y LISTAS) ---
function initAdminDashboard() {
    // 1. Estadísticas Inteligentes
    onSnapshot(collection(db, "sales"), snap => {
        let revenue = 0;
        snap.forEach(d => { if(d.data().status === 'Aprobado') revenue += d.data().total; });
        document.getElementById('dash-revenue').innerText = `$${revenue.toFixed(2)}`;
        document.getElementById('dash-orders').innerText = snap.size;
        switchAdminTab('orders'); // Cargar tabla por defecto
    });

    onSnapshot(collection(db, "customers"), snap => {
        document.getElementById('dash-users').innerText = snap.size;
    });
}

window.switchAdminTab = (tab) => {
    const container = document.getElementById('admin-table-container');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    if(tab === 'orders') {
        onSnapshot(collection(db, "sales"), snap => {
            let html = `<table class="admin-table"><thead><tr><th>Cliente</th><th>Total</th><th>Estado</th><th>Acción</th></tr></thead><tbody>`;
            snap.forEach(d => {
                const s = d.data();
                html += `<tr><td>${s.customerEmail}</td><td>$${s.total}</td><td><span class="status-pill status-${s.status.toLowerCase()}">${s.status}</span></td>
                <td><button onclick="approveSale('${d.id}')">✅</button> <button class="btn-del" onclick="deleteDocById('sales','${d.id}')">🗑️</button></td></tr>`;
            });
            container.innerHTML = html + `</tbody></table>`;
        });
    } else if(tab === 'users') {
        onSnapshot(collection(db, "customers"), snap => {
            let html = `<table class="admin-table"><thead><tr><th>Email</th><th>Registro</th><th>Acción</th></tr></thead><tbody>`;
            snap.forEach(d => {
                html += `<tr><td>${d.data().email}</td><td>${new Date(d.data().date).toLocaleDateString()}</td>
                <td><button class="btn-del" onclick="deleteDocById('customers','${d.id}')">Eliminar Cliente</button></td></tr>`;
            });
            container.innerHTML = html + `</tbody></table>`;
        });
    } else if(tab === 'products') {
        onSnapshot(collection(db, "products"), snap => {
            let html = `<table class="admin-table"><thead><tr><th>Imagen</th><th>Nombre</th><th>Precio</th><th>Acción</th></tr></thead><tbody>`;
            snap.forEach(d => {
                html += `<tr><td><img src="${d.data().image}" width="50"></td><td>${d.data().name}</td><td>$${d.data().price}</td>
                <td><button class="btn-del" onclick="deleteDocById('products','${d.id}')">Eliminar</button></td></tr>`;
            });
            container.innerHTML = html + `</tbody></table>`;
        });
    }
};

// --- ACCIONES CRUD ---
document.getElementById('form-product').onsubmit = async (e) => {
    e.preventDefault();
    const file = document.getElementById('p-img').files[0];
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
    closeModal('modal-add');
};

window.deleteDocById = async (col, id) => { if(confirm("¿Eliminar permanentemente?")) await deleteDoc(doc(db, col, id)); };
window.approveSale = async (id) => { await updateDoc(doc(db, "sales", id), { status: 'Aprobado' }); };