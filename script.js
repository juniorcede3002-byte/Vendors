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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Manejo del Modal
const modal = document.getElementById("modal");
const btnOpen = document.getElementById("open-modal");
const spanClose = document.querySelector(".close");

btnOpen.onclick = () => modal.style.display = "block";
spanClose.onclick = () => modal.style.display = "none";
window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; };

// Subida de datos
const form = document.getElementById('product-form');
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    const file = document.getElementById('media-file').files[0];
    const desc = document.getElementById('product-desc').value;

    try {
        btn.innerText = "Subiendo...";
        btn.disabled = true;

        const isVideo = file.type.includes('video');
        const storageRef = ref(storage, `content/${Date.now()}_${file.name}`);
        
        // 1. Subir a Storage
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);

        // 2. Guardar en Firestore
        await addDoc(collection(db, "productos"), {
            descripcion: desc,
            mediaUrl: url,
            tipo: isVideo ? 'video' : 'foto',
            timestamp: new Date()
        });

        form.reset();
        modal.style.display = "none";
        alert("Publicado con éxito");
    } catch (error) {
        console.error(error);
        alert("Error al subir archivo");
    } finally {
        btn.innerText = "Publicar en Inventario";
        btn.disabled = false;
    }
});

// Cargar inventario en tiempo real
const q = query(collection(db, "productos"), orderBy("timestamp", "desc"));
onSnapshot(q, (snapshot) => {
    const feed = document.getElementById('feed');
    feed.innerHTML = '';
    snapshot.forEach((doc) => {
        const p = doc.data();
        const mediaTag = p.tipo === 'video' 
            ? `<video src="${p.mediaUrl}" controls></video>` 
            : `<img src="${p.mediaUrl}">`;
        
        feed.innerHTML += `
            <div class="product-card">
                ${mediaTag}
                <div class="info">
                    <p>${p.descripcion}</p>
                </div>
            </div>
        `;
    });
});
