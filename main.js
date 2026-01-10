import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* FIREBASE */
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

/* CLOUDINARY */
const CLOUD_NAME = "df79cjklp";
const UPLOAD_PRESET = "vendors_preset";

let isLoginMode = true;

/* VISTAS */
window.showView = (id) => {
    document.querySelectorAll('.view-section').forEach(v => v.style.display = 'none');
    document.getElementById(id).style.display = (id === 'auth-screen') ? 'flex' : 'block';
};

/* AUTH */
window.toggleAuthMode = () => {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? "Ingresar" : "Registrarse";
};

document.getElementById('auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = auth-email.value;
    const pass = auth-pass.value;

    try {
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, pass);
        } else {
            const res = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "usuarios", res.user.uid), {
                email,
                rol: email === "admin@vendors.com" ? "admin" : "user"
            });
        }
    } catch (err) {
        alert(err.message);
    }
};

onAuthStateChanged(auth, async (user) => {
    if (!user) return showView('landing-page');

    const snap = await getDoc(doc(db, "usuarios", user.uid));
    const rol = user.email === "admin@vendors.com" ? "admin" : snap.data()?.rol || "user";

    document.body.className = `${rol}-mode`;
    display-name.innerText = user.email.split('@')[0];
    showView('app-screen');
    loadProducts();
});

window.logout = () => signOut(auth);

/* PRODUCTOS */
function loadProducts() {
    onSnapshot(query(collection(db, "productos"), orderBy("fecha", "desc")), snap => {
        product-grid.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            product-grid.innerHTML += `
                <div class="card">
                    <div class="card-media">
                        ${p.tipo === "video" 
                            ? `<video src="${p.mediaUrl}" muted loop></video>` 
                            : `<img src="${p.mediaUrl}">`}
                    </div>
                    <div class="card-info">
                        <h4>${p.nombre}</h4>
                        <p class="price">$${p.precio}</p>
                        <button class="user-only btn-primary-full" onclick="addToCart('${d.id}')">Comprar</button>
                    </div>
                </div>`;
        });
    });
}

window.addToCart = async (id) => {
    await addDoc(collection(db, "pedidos"), {
        productId: id,
        user: auth.currentUser.uid,
        estado: "pendiente",
        fecha: new Date()
    });
    alert("Pedido enviado");
};

/* ADMIN */
const form = document.getElementById('add-product-form');
if (form) {
    form.onsubmit = async (e) => {
        e.preventDefault();

        const file = item-file.files[0];
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", UPLOAD_PRESET);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
            method: "POST",
            body: data
        });

        const img = await res.json();

        await addDoc(collection(db, "productos"), {
            nombre: item-name.value,
            precio: Number(item-price.value),
            categoria: item-cat.value,
            mediaUrl: img.secure_url,
            tipo: img.resource_type,
            fecha: new Date()
        });

        closeModal('modal-add');
        form.reset();
    };
}

window.showModal = id => document.getElementById(id).style.display = "flex";
window.closeModal = id => document.getElementById(id).style.display = "none";
