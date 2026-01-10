import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración de tu Firebase
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

// Configuración de tu Cloudinary
const CLOUD_NAME = "df79cjklp";
const UPLOAD_PRESET = "vendors_preset";

// Elementos de la Interfaz
const modal = document.getElementById("modal");
const btnOpen = document.getElementById("open-modal");
const btnClose = document.querySelector(".close-btn");
const productForm = document.getElementById("product-form");
const productList = document.getElementById("product-list");

// Manejo del Modal
btnOpen.onclick = () => modal.style.display = "block";
btnClose.onclick = () => modal.style.display = "none";
window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; }

// FUNCIÓN: Subir a Cloudinary y guardar en Firebase
productForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById("btn-save");
    
    const file = document.getElementById("media-file").files[0];
    const name = document.getElementById("product-name").value;
    const desc = document.getElementById("product-desc").value;
    const price = document.getElementById("product-price").value;

    try {
        btnSubmit.disabled = true;
        btnSubmit.innerText = "Subiendo archivo...";

        // 1. Preparar el envío a Cloudinary
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);

        // 2. Ejecutar la subida (Unsigned)
        const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
            method: "POST",
            body: formData
        });

        const cloudData = await cloudRes.json();
        if (!cloudRes.ok) throw new Error(cloudData.error.message);

        // 3. Guardar metadatos en Firebase Firestore
        // El administrador añade suministros y los usuarios pueden ver el stock
        await addDoc(collection(db, "productos"), {
            nombre: name,
            descripcion: desc,
            precio: parseFloat(price),
            mediaUrl: cloudData.secure_url,
            tipo: cloudData.resource_type, // 'image' o 'video'
            fecha: new Date()
        });

        alert("¡Producto publicado en el inventario de Vendors!");
        productForm.reset();
        modal.style.display = "none";

    } catch (error) {
        console.error("Error en la operación:", error);
        alert("Error al subir: " + error.message);
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = "Publicar en Stock";
    }
});

// FUNCIÓN: Escuchar el Stock en Tiempo Real
const q = query(collection(db, "productos"), orderBy("fecha", "desc"));
onSnapshot(q, (snapshot) => {
    productList.innerHTML = '';
    
    if (snapshot.empty) {
        productList.innerHTML = '<p>No hay productos en el stock actualmente.</p>';
        return;
    }

    snapshot.forEach((doc) => {
        const item = doc.data();
        const mediaElement = item.tipo === 'video' 
            ? `<video src="${item.mediaUrl}" controls></video>` 
            : `<img src="${item.mediaUrl}" alt="${item.nombre}" loading="lazy">`;

        productList.innerHTML += `
            <div class="product-card">
                ${mediaElement}
                <div class="card-content">
                    <h3>${item.nombre}</h3>
                    <p>${item.descripcion}</p>
                    <div class="price-tag">$${item.precio.toFixed(2)}</div>
                </div>
            </div>
        `;
    });
});