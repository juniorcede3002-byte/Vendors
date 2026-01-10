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

// Referencias Modales
const upModal = document.getElementById("upload-modal");
const detModal = document.getElementById("details-modal");
const productList = document.getElementById("product-list");

// Abrir/Cerrar
document.getElementById("open-upload-modal").onclick = () => upModal.style.display = "flex";
document.querySelector(".close-modal").onclick = () => upModal.style.display = "none";
document.querySelector(".close-details").onclick = () => detModal.style.display = "none";

// SUBIR PRODUCTO
document.getElementById("product-form").onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btn-save");
    const file = document.getElementById("media-file").files[0];
    const name = document.getElementById("product-name").value;
    const desc = document.getElementById("product-desc").value;
    const price = document.getElementById("product-price").value;

    try {
        btn.disabled = true;
        btn.innerText = "Subiendo...";

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);

        const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: "POST", body: formData });
        const cloudData = await cloudRes.json();

        await addDoc(collection(db, "productos"), {
            nombre: name,
            descripcion: desc,
            precio: parseFloat(price),
            mediaUrl: cloudData.secure_url,
            tipo: cloudData.resource_type,
            fecha: new Date()
        });

        upModal.style.display = "none";
        document.getElementById("product-form").reset();
    } catch (err) { alert("Error: " + err.message); }
    finally { btn.disabled = false; btn.innerText = "Publicar"; }
};

// MOSTRAR PRODUCTOS Y MANEJAR CLICS
onSnapshot(query(collection(db, "productos"), orderBy("fecha", "desc")), (snap) => {
    productList.innerHTML = "";
    snap.forEach((documento) => {
        const p = documento.data();
        const id = documento.id;
        const media = p.tipo === "video" ? `<video src="${p.mediaUrl}"></video>` : `<img src="${p.mediaUrl}">`;

        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = `
            <div class="media-container">${media}</div>
            <div class="card-body">
                <h3>${p.nombre}</h3>
                <span class="price">$${p.precio.toFixed(2)}</span>
            </div>
            <div class="admin-actions">
                <button class="btn-delete" data-id="${id}">Eliminar</button>
            </div>
        `;

        // Evento para ver detalles
        card.onclick = (e) => {
            if(e.target.classList.contains('btn-delete')) return;
            showDetails(p);
        };

        // Evento para eliminar (Solo Admin)
        card.querySelector(".btn-delete").onclick = async (e) => {
            e.stopPropagation();
            if(confirm("¿Eliminar este producto?")) {
                await deleteDoc(doc(db, "productos", id));
            }
        };

        productList.appendChild(card);
    });
});

// FUNCIÓN VER DETALLES
function showDetails(p) {
    const mediaContainer = document.getElementById("detail-media");
    mediaContainer.innerHTML = p.tipo === "video" ? `<video src="${p.mediaUrl}" controls autoplay></video>` : `<img src="${p.mediaUrl}">`;
    document.getElementById("detail-title").innerText = p.nombre;
    document.getElementById("detail-description").innerText = p.descripcion;
    document.getElementById("detail-price").innerText = `$${p.precio.toFixed(2)}`;
    
    // Acción de Compra (Solicitante)
    document.getElementById("btn-buy").onclick = () => {
        alert(`Solicitud enviada para: ${p.nombre}. El administrador revisará tu pedido.`);
    };

    detModal.style.display = "flex";
}

// Cerrar modales al hacer clic fuera
window.onclick = (e) => {
    if (e.target == upModal) upModal.style.display = "none";
    if (e.target == detModal) detModal.style.display = "none";
};