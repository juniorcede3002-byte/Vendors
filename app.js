// 🔥 Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// 🔐 Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBXYrQwpfcuAili1HvrmDGEWKjj_2j_lzY",
  authDomain: "proyectovendor.firebaseapp.com",
  projectId: "proyectovendor"
};

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// UI refs
const emailInput = document.getElementById("auth-email");
const passInput = document.getElementById("auth-pass");
const nameInput = document.getElementById("auth-name");
const registerBox = document.getElementById("register-box");
const authBtn = document.getElementById("btn-auth-action");
const switchAuth = document.getElementById("switch-auth");

let isRegister = false;

// 🧭 VIEWS
window.showView = (id) => {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
};

// 🔁 Toggle register
window.toggleRegisterUI = (force = false) => {
  isRegister = force ? true : !isRegister;
  registerBox.classList.toggle("hidden", !isRegister);
  authBtn.textContent = isRegister ? "Registrarse" : "Iniciar sesión";
  switchAuth.textContent = isRegister
    ? "¿Ya tienes cuenta? Inicia sesión"
    : "¿No tienes cuenta? Regístrate";
};

// 🔑 Auth action
authBtn.onclick = async () => {
  const email = emailInput.value.trim();
  const pass = passInput.value.trim();
  const name = nameInput.value.trim();

  if (!email || !pass) return alert("Completa los campos");

  try {
    if (isRegister) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        await setDoc(doc(db, "users", cred.user.uid), {
          email,
          name,
          role: "user",
          created: Date.now()
        });
      } catch (err) {
        if (err.code === "auth/email-already-in-use") {
          alert("El correo ya existe, inicia sesión");
          toggleRegisterUI(false);
        } else throw err;
      }
    } else {
      await signInWithEmailAndPassword(auth, email, pass);
    }
  } catch (e) {
    alert(e.message);
  }
};

// 🔄 Auth state
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showView("view-landing");
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));

  if (!snap.exists()) {
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      role: "user",
      created: Date.now()
    });
    showView("view-user");
    return;
  }

  const role = snap.data().role;
  showView(role === "admin" ? "view-admin" : "view-user");
});

// 🚪 Logout
window.logout = async () => {
  await signOut(auth);
  showView("view-landing");
};
