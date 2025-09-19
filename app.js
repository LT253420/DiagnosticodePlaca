// ==================== Firebase (ESM) ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

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

// ==================== 2º factor: configuración ====================
const PASSWORD_HASH = "7a92c8be74878e8ee870f84cc90dcf431a4104dc2d93426a56eb96008699ff52";

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
function show(id, display = "flex") { const el = document.getElementById(id); if (el) el.style.display = display; }
function hide(id) { const el = document.getElementById(id); if (el) el.style.display = "none"; }
function isSecondFactorOk() { return sessionStorage.getItem("secondFactorOk") === "1"; }
function setSecondFactorOk(v) { sessionStorage.setItem("secondFactorOk", v ? "1" : "0"); }

// ==================== Login / Logout (globales) ====================
window.login = () =>
  signInWithPopup(auth, provider)
    .then(() => {
      // tras login, mostrar GATE de contraseña
      setSecondFactorOk(false);
      hide("loginContainer");
      show("passwordGate", "flex");
      hide("appContent");
      requestAnimationFrame(() => document.getElementById("passwordGate")?.classList.add("hud-appear"));
    })
    .catch(err => alert("Error al iniciar sesión: " + err.message));

window.logout = () => signOut(auth);

// ==================== 2º factor: verificación con feedback y redirección ====================
// Timer global para no apilar redirecciones
let redirectTimer = null;

window.verifyPassword = async () => {
  const input = document.getElementById("pwdInput");
  const error = document.getElementById("pwdError");
  if (!input) return;

  // Si había un temporizador previo, lo limpio
  if (redirectTimer) {
    clearInterval(redirectTimer.interval);
    clearTimeout(redirectTimer.timeout);
    redirectTimer = null;
  }

  const typed = input.value.trim();
  const typedHash = await sha256Hex(typed);

  if (typedHash === PASSWORD_HASH) {
    // OK → limpiar estados de error si los hubiera
    input.classList.remove("error", "shake");
    if (error) { error.style.display = "none"; error.textContent = ""; }

    // Mostrar app
    setSecondFactorOk(true);
    hide("passwordGate");
    show("appContent", "flex");
    show("logoutBtn", "inline-block");
  } else {
    // Incorrecta → feedback visual + cuenta regresiva + redirección a los 5s
    if (error) {
      error.style.display = "block";
      error.textContent = "❌ Contraseña incorrecta. Redirigiendo en 5…";
    }
    input.classList.add("error", "shake");
    setTimeout(() => input.classList.remove("shake"), 400);

    let seconds = 5;
    redirectTimer = {
      interval: setInterval(() => {
        seconds -= 1;
        if (error && seconds >= 0) {
          error.textContent = `❌ Contraseña incorrecta. Redirigiendo en ${seconds}…`;
        }
        if (seconds <= 0) {
          clearInterval(redirectTimer.interval);
        }
      }, 1000),
      timeout: setTimeout(async () => {
        setSecondFactorOk(false);
        try { await signOut(auth); } catch (_) {}
        location.replace("https://www.google.com/");
      }, 5000)
    };
  }
};

// ==================== Estado Auth ====================
onAuthStateChanged(auth, user => {
  const emailText = document.getElementById("emailText");
  const logoutBtn = document.getElementById("logoutBtn");

  if (user) {
    emailText.textContent = user.email || "";
    logoutBtn.style.display = "inline-block";

    if (isSecondFactorOk()) {
      // ya pasó la contraseña en esta sesión
      hide("loginContainer");
      hide("passwordGate");
      show("appContent", "flex");
      document.getElementById("appContent")?.classList.add("hud-appear");
    } else {
      // mostrar gate de contraseña
      hide("loginContainer");
      show("passwordGate", "flex");
      hide("appContent");
      requestAnimationFrame(() => document.getElementById("passwordGate")?.classList.add("hud-appear"));
    }
  } else {
    // no autenticado
    setSecondFactorOk(false);
    show("loginContainer", "flex");
    hide("passwordGate");
    hide("appContent");
    logoutBtn.style.display = "none";
    emailText.textContent = "";
  }
});

// ==================== Datos (globales) ====================
window.respuestasPorFalla = { /* === tu objeto grande tal cual lo tenías === */ 
      "No enciende": [
        ["Revisar batería", "Medir batería para saber si funciona."],
        ["Botón de encendido", "Verificar si el botón funciona correctamente."],
        ["Placa base", "Posible falla de alimentación o cortocircuito."]
      ]
    };


// ==================== UI helpers (globalizar) ====================
window.ocultarTodo = () => {
  ["mainMenu", "usoMenu", "fallasMenu", "respuestas", "contactoMenu"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  const resp = document.getElementById("respuestas");
  if (resp) resp.innerHTML = "";
};

window.showResponse = (falla) => {
  window.ocultarTodo();
  const respuestas = document.getElementById("respuestas");
  respuestas.style.display = "flex";
  void respuestas.offsetWidth;
  respuestas.classList.add("hud-appear");
  respuestas.innerHTML = `<button onclick="volverA('fallas')">← Volver</button><h2>${falla}</h2>`;

  if (window.respuestasPorFalla[falla]) {
    window.respuestasPorFalla[falla].forEach(([titulo, descripcion]) => {
      const btn = document.createElement("button");
      btn.textContent = titulo;
      btn.onclick = () => {
        respuestas.querySelectorAll(".response-box.dynamic").forEach(e => e.remove());
        const box = document.createElement("div");
        box.className = "response-box hud-appear dynamic";
        box.innerHTML = `➡ ${descripcion}`;
        respuestas.appendChild(box);
      };
      respuestas.appendChild(btn);
    });
  }
};

window.mostrarComoUsar = () => {
  window.ocultarTodo();
  const uso = document.getElementById("usoMenu");
  uso.style.display = "flex";
  requestAnimationFrame(() => uso.classList.add("hud-appear"));
};

window.mostrarFallas = () => {
  window.ocultarTodo();
  const fallas = document.getElementById("fallasMenu");
  fallas.style.display = "flex";
  requestAnimationFrame(() => fallas.classList.add("hud-appear"));
};

window.mostrarContacto = () => {
  window.ocultarTodo();
  const contacto = document.getElementById("contactoMenu");
  contacto.style.display = "flex";
  requestAnimationFrame(() => contacto.classList.add("hud-appear"));
};

window.volverA = (seccion) => {
  window.ocultarTodo();
  const destino = seccion === "main" ? "mainMenu" : "fallasMenu";
  const menu = document.getElementById(destino);
  menu.style.display = "flex";
  requestAnimationFrame(() => menu.classList.add("hud-appear"));
};

window.toggleTheme = () => document.body.classList.toggle("light-mode");
window.goToHome = () => { window.volverA("main"); document.getElementById("mainMenu").style.display = "flex"; };

// ==================== Preloader ====================
const preloader = document.getElementById("preloader");
const fill = document.getElementById("progressFill");
const percentText = document.getElementById("percentage");
const smoothProgress = [1, 5, 10, 20, 35, 50, 65, 80, 90, 100];
let index = 0;

window.onload = () => setTimeout(updateProgress, 200);
function updateProgress() {
  if (index < smoothProgress.length) {
    const value = smoothProgress[index];
    if (fill) fill.style.width = value + "%";
    if (percentText) percentText.textContent = value + "%";
    index++;
    setTimeout(updateProgress, 100);
  } else {
    percentText?.classList.add("flash");
    fill?.classList.add("flash");
    setTimeout(() => {
      if (preloader) preloader.style.display = "none";
      const appContent = document.getElementById("appContent");
      appContent?.classList.add("hud-appear");
    }, 500);
  }
}

// ==================== Restricciones ====================
document.addEventListener("contextmenu", e => e.preventDefault());

// ==================== Limpieza de error al tipear (2FA) ====================
document.getElementById("pwdInput")?.addEventListener("input", () => {
  const input = document.getElementById("pwdInput");
  const error = document.getElementById("pwdError");
  input?.classList.remove("error", "shake");
  if (error) { error.style.display = "none"; error.textContent = ""; }
});


// ==================== ÁRBOL: Fallas en placa (CÁMARA) ====================
// Estructura declarativa (fácil de extender)
const placaTreeData = {
  title: "La cámara no funciona",
  step: "Paso a seguir: medir señales de referencia",
  options: [
    {
      label: "Correcta medición de señales de referencia",
      next: {
        title: "Medición de alimentación",
        step: "Paso a seguir: Medir 1.8V, 1.2V, 2.8V",
        options: [
          {
            label: "Correcta medición de alimentación",
            next: {
              title: "Medición de control",
              step: "Paso a seguir: Medir líneas SDA, SCL, RST, CLK (ideal osciloscopio; si no, medir voltaje con multímetro).",
              solution:
                "Estas líneas de comunicación (SDA, SCL, RST, CLK, etc.) se miden con osciloscopio. Si no tenés, podés verificar tensiones con multímetro como orientación."
            }
          },
          {
            label: "Incorrecta medición de alimentación",
            solution:
              "Verificar fuente de alimentación (PMIC/LDO). Recordá medir la señal de control (EN/ENABLE) del LDO. Según el equipo, puede alimentarla un LDO dedicado, un PMIC de cámaras o el PMIC principal."
          }
        ]
      }
    },
    {
      label: "Incorrecta medición de señales de referencia",
      solution:
        "Si el valor está OL (abierto/muy alto), el problema suele ser resistor, filtro EMI, bobina o IC. Si está en 0 (corto/muy bajo), el responsable suele ser un condensador o IC."
    }
  ]
};

// ==================== Render del árbol ====================
let placaStack = []; // historial para "Atrás"

function placaNodoActual() {
  // último de la pila o raíz
  return placaStack.length ? placaStack[placaStack.length - 1] : placaTreeData;
}

function renderPlacaNodo(nodo) {
  const cont = document.getElementById("placaTree");
  if (!cont) return;
  cont.innerHTML = "";

  // Título (H2) + Paso
  const h2 = document.createElement("h2");
  h2.textContent = nodo.title || "Fallas en placa";
  h2.className = "hud-appear";
  h2.style.marginTop = "0";
  cont.appendChild(h2);

  if (nodo.step) {
    const p = document.createElement("div");
    p.className = "response-box hud-appear";
    p.textContent = nodo.step;
    cont.appendChild(p);
  }

  // Si hay solución final, mostramos caja y terminamos
  if (nodo.solution) {
    const sol = document.createElement("div");
    sol.className = "response-box hud-appear";
    sol.innerHTML = `➡ ${nodo.solution}`;
    cont.appendChild(sol);
    return;
  }

  // Mostrar opciones como botones
  if (Array.isArray(nodo.options)) {
    nodo.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.textContent = opt.label;
      btn.onclick = () => {
        if (opt.next) {
          placaStack.push(opt.next);
          renderPlacaNodo(opt.next);
        } else if (opt.solution) {
          // “Hoja” con solución
          const leaf = { title: nodo.title, step: nodo.step, solution: opt.solution };
          placaStack.push(leaf);
          renderPlacaNodo(leaf);
        }
      };
      cont.appendChild(btn);
    });
  }
}

// ==================== UI helpers para este módulo ====================
window.mostrarFallasPlaca = () => {
  // Reutilizamos tu helper si existe
  if (typeof window.ocultarTodo === "function") window.ocultarTodo();
  const sec = document.getElementById("placaMenu");
  if (sec) {
    sec.style.display = "flex";
    sec.classList.add("hud-appear");
  }
  // reset de navegación y render raíz
  placaStack = [];
  renderPlacaNodo(placaTreeData);
};

window.placaAtras = () => {
  if (!placaStack.length) {
    // volver al menú de fallas si querés
    if (typeof window.mostrarFallas === "function") {
      window.mostrarFallas();
    } else {
      // o al main
      if (typeof window.volverA === "function") window.volverA("main");
    }
    // ocultar sección
    const sec = document.getElementById("placaMenu");
    if (sec) sec.style.display = "none";
    return;
  }
  placaStack.pop();
  renderPlacaNodo(placaNodoActual());
};

window.placaReiniciar = () => {
  placaStack = [];
  renderPlacaNodo(placaTreeData);
};
