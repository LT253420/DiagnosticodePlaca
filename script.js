import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD29DiaYJ1s3GeOSJKquL2jElp8NVoXAII",
  authDomain: "login-de-diagnostico-de-placa.firebaseapp.com",
  projectId: "login-de-diagnostico-de-placa",
  storageBucket: "login-de-diagnostico-de-placa.firebasestorage.app",
  messagingSenderId: "248604555689",
  appId: "1:248604555689:web:f0f0f226bd8cd377dd6cb8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const provider = new GoogleAuthProvider();

// Funciones públicas
window.login = () => signInWithPopup(auth, provider).catch(error => alert("Error al iniciar sesión: " + error.message));
window.logout = () => signOut(auth);

// Listener de sesión
onAuthStateChanged(auth, user => {
  const loginContainer = document.getElementById("loginContainer");
  const appContent = document.getElementById("appContent");
  const emailText = document.getElementById("emailText");
  const logoutBtn = document.getElementById("logoutBtn");

  if (user) {
    loginContainer.style.display = "none";
    appContent.style.display = "flex";
    emailText.textContent = user.email;
    logoutBtn.style.display = "inline-block";
  } else {
    loginContainer.style.display = "flex";
    appContent.style.display = "none";
    emailText.textContent = "";
    logoutBtn.style.display = "none";
  }
});

// Funciones de navegación
window.mostrarComoUsar = () => toggleMenus("usoMenu");
window.mostrarFallas = () => toggleMenus("fallasMenu");
window.mostrarContacto = () => toggleMenus("contactoMenu");
window.volverA = () => toggleMenus("mainMenu");
window.goToHome = () => toggleMenus("mainMenu");

function toggleMenus(activeId) {
  const sections = ["mainMenu", "usoMenu", "fallasMenu", "contactoMenu", "respuestas"];
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === activeId ? "flex" : "none";
  });
}

// Mostrar respuestas
window.showResponse = (id) => {
  const allContainers = document.querySelectorAll(".button-container");
  allContainers.forEach(c => c.style.display = "none");
  const selected = document.getElementById(id);
  if (selected) selected.style.display = "flex";
};

// Modo claro/oscuro
window.toggleTheme = () => {
  document.body.classList.toggle("light-theme");
};
