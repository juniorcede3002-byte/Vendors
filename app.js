import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// 1. TUS DATOS DE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyBXYrQwpfcuAili1HvrmDGEWKjj_2j_lzY",
    authDomain: "proyectovendor.firebaseapp.com",
    projectId: "proyectovendor",
    storageBucket: "proyectovendor.firebasestorage.app",
    messagingSenderId: "1038115164902",
    appId: "1:1038115164902:web:3d72bd44f3e5da487c2127"
};

// 2. TUS DATOS DE CLOUDINARY
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/proyectovendor/image/upload";
const CLOUDINARY_PRESET = "vendors_preset";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// FUNCIÓN PARA SUBIR LA IMAGEN
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_PRESET);

    const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
    const data = await res.json();
    return data.secure_url;
}

// GUARDAR PRODUCTO AL HACER CLICK
document.getElementById('btn-save').onclick = async () => {
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const file = document.getElementById('p-file').files[0];

    if (!name || !price || !file) return alert("Por favor, llena todos los campos.");

    try {
        const btn = document.getElementById('btn-save');
        btn.innerText = "SUBIENDO...";
        btn.disabled = true;

        const imageUrl = await uploadToCloudinary(file);

        await addDoc(collection(db, "products"), {
            name: name,
            price: parseFloat(price),
            img: imageUrl,
            date: Date.now()
        });

        alert("¡Producto subido!");
        document.getElementById('p-name').value = "";
        document.getElementById('p-price').value = "";
        document.getElementById('p-file').value = "";
        btn.innerText = "PUBLICAR PRODUCTO";
        btn.disabled = false;

    } catch (error) {
        console.error(error);
        alert("Hubo un error al subir.");
    }
};

// MOSTRAR PRODUCTOS EN TIEMPO REAL
onSnapshot(collection(db, "products"), (snap) => {
    const list = document.getElementById('product-list');
    list.innerHTML = "";
    snap.forEach((d) => {
        const p = d.data();
        list.innerHTML += `
            <div class="product-card bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-lg">
                <img src="${p.img}" class="w-full h-48 object-cover">
                <div class="p-4">
                    <h3 class="font-bold text-lg text-white mb-1">${p.name}</h3>
                    <p class="text-indigo-400 font-black text-xl mb-4">$${p.price}</p>
                    <button onclick="deleteItem('${d.id}')" class="text-xs text-red-500 hover:text-red-400 underline">Eliminar producto</button>
                </div>
            </div>
        `;
    });
});

// ELIMINAR PRODUCTO
window.deleteItem = async (id) => {
    if(confirm("¿Eliminar este producto?")) {
        await deleteDoc(doc(db, "products", id));
    }
};