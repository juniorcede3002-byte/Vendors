import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBXYrQwpfcuAili1HvrmDGEWKjj_2j_lzY",
  authDomain: "proyectovendor.firebaseapp.com",
  projectId: "proyectovendor",
  storageBucket: "proyectovendor.firebasestorage.app",
  messagingSenderId: "1038115164902",
  appId: "1:1038115164902:web:3d72bd44f3e5da487c2127"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

const form = document.getElementById('product-form');
const productList = document.getElementById('product-list');

// --- FUNCIÓN: GUARDAR PRODUCTO ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    
    const file = document.getElementById('product-image').files[0];
    const name = document.getElementById('product-name').value;
    const desc = document.getElementById('product-desc').value;
    const price = document.getElementById('product-price').value;

    try {
        btn.innerText = "Subiendo...";
        btn.disabled = true;

        // 1. Subir imagen a Storage
        const storageRef = ref(storage, 'productos/' + Date.now() + "_" + file.name);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        // 2. Guardar datos en Firestore
        await addDoc(collection(db, "productos"), {
            nombre: name,
            descripcion: desc,
            precio: parseFloat(price),
            imagen: url,
            createdAt: new Date()
        });

        form.reset();
        alert("Producto agregado al stock");
    } catch (error) {
        console.error(error);
        alert("Error al subir: " + error.message);
    } finally {
        btn.innerText = "Guardar en Inventario";
        btn.disabled = false;
    }
});

// --- FUNCIÓN: LEER STOCK EN TIEMPO REAL ---
const q = query(collection(db, "productos"), orderBy("createdAt", "desc"));
onSnapshot(q, (snapshot) => {
    productList.innerHTML = '';
    snapshot.forEach((doc) => {
        const item = doc.data();
        productList.innerHTML += `
            <div class="card">
                <img src="${item.imagen}" alt="${item.nombre}">
                <div class="card-info">
                    <h3>${item.nombre}</h3>
                    <p>${item.descripcion}</p>
                    <span class="price">$${item.precio}</span>
                </div>
            </div>
        `;
    });
});
