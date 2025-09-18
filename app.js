// ==================== Firebase (ESM) ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBt6OlcaDWbhx-ldI4l0a4kDPu8U1dm48c",
  authDomain: "login-de-lista-de-fallas.firebaseapp.com",
  projectId: "login-de-lista-de-fallas",
  storageBucket: "login-de-lista-de-fallas.firebasestorage.app",
  messagingSenderId: "632649294661",
  appId: "1:632649294661:web:9c6daa894931936c87142c"
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
      ],
      "No tiene sonido": [
        ["Altavoz", "Probar el parlante con otro equipo."],
        ["Conectores", "Verificar si están sulfatados o desconectados."],
        ["Placa base", "Fallo en circuito de audio."]
      ],
      "No puedo hacer llamadas": [
        ["Estado del IMEI", "Verificar si el equipo fue dado de baja."],
        ["Chip", "Probar con otro chip o limpiar la bandeja."],
        ["Señal", "Revisar si toma señal correctamente."]
      ],
      "El teléfono se calienta": [
        ["Batería", "Puede estar defectuosa o vieja."],
        ["Apps en segundo plano", "Cerrar procesos que usen muchos recursos."],
        ["Mantenimiento", "Limpiar placa, cambiar pasta térmica."]
      ],

      "Mi celular se apaga solo": [
        ["Boton de encendido", "Puede estar en corto o dañado"],
        ["Batería", "Conector de batería dañado o batería en mal estado"],
        ["Placa Madre", "Cortocircuito o placa dañada"]
      ],
      
      "Mi celular se reinicia solo": [
        ["Boton de encendido", "Puede estar en corto o dañado"],
        ["Batería", "Conector de batería dañado o batería en mal estado"],
        ["Sulfato / suciedad", "Daños o fallas producidos por sulfato o suciedad"],
        ["Placa Madre", "Cortocircuito o placa dañada"]
      ],
      
      "La pantalla no prende pero el celular funciona": [
        ["Módulo / display / pantalla", "Puede tener la pantalla dañada"],
        ["Conector del Módulo / display / pantalla", "Conector de módulo dañado, mal conectado o desconectado"],
        ["Placa Madre", "daños internos en la placa"]
      ],
        
      
      "La pantalla queda en blanco / tiene interferencia": [
        ["Módulo / display / pantalla", "Puede estar en corto o dañado"],
        ["Batería", "Conector de batería dañado o batería en mal estado"],
        ["Sulfato / suciedad", "Daños o fallas producidos por sulfato o suciedad"],
        ["Placa Madre", "Cortocircuito o placa dañada"]
      ],
        
      
      "La pantalla parpadea": [
        ["Boton de encendido", "Puede tener la pantalla dañada"],
        ["Fallas de Software", "Fallas en el sistema que producen ese error"],
        ["Sulfato / suciedad", "Daños o fallas producidos por sulfato o suciedad"],
        ["Placa Madre", "Daños internos en la placa"]
      ],
          
      
      "Mi celular se apaga cuando llaman": [
        ["Antena coaxial", "Puede estar en corto o dañada"],
        ["Software", "Fallas en el sistema que producen ese error"],
        ["Sulfato / suciedad", "Daños o fallas producidos por sulfato o suciedad"],
        ["Placa Madre", "Cortocircuito o placa dañada"]
      ],
          
      
      "La pantalla se apaga cuando escucho un audio o me llaman": [
        ["Sensores", "Pueden estar en corto o dañado"],
        ["Mal cambio de pantalla", "Una pantalla o módulo mal Colocado puede tapar los sensores y generar esos errores"],
        ["Sulfato / suciedad", "Daños o fallas producidos por sulfato o suciedad"],
        ["Placa Madre", "Cortocircuito o placa dañada"]
      ],
          
      
      "Manchas de liquido negro, suciedad o burbujas": [
        ["Fallas de pantalla (módulo)", "Puede estar mal trabajada, sucia, mal colocada. Requiere cambio de módulo."]
      ],
          
      
      "No escucho cuando me hablan ni puedo escuchar los audios": [
        ["Speakers / parlantes", "Pueden estar dañados, desconectados o faltantes."],
        ["Sulfato / suciedad", "Daños o fallas producidos por sulfato o suciedad"],
        ["Placa Madre", "Cortocircuito o placa dañada en módulo de audio"]
      ],
          
      
      "No escuchan mi voz en llamada ni audios": [
        ["Micrófono / micrófonos", "Pueden estar dañados, desconectados o faltantes."],
        ["Sulfato / suciedad", "Daños o fallas producidos por presencia de sulfato o suciedad"],
        ["Placa Madre", "Cortocircuito o placa dañada en módulo de audio"]
      ],
          
      
      "No puedo desbloquear el celular (patrón, Contraseña o huella)": [
        ["Sensores de huella", "Pueden estar dañado, desconectado o faltante."],
        ["Fallas en táctil", "Una pantalla o módulo de mala calidad, dañado o golpeado puede generar fallas en táctil evitando que se pueda desbloquear el equipo."],
        ["Equipo Tildado", "Reinicio requerido. Posible falla de memoria o de sistema (falla temporal)."],
        ["Sulfato / suciedad", "Daños o fallas producidos por sulfato o suciedad"],
        ["Placa Madre", "Cortocircuito o placa dañada en componentes relacionados al táctil o inicio del equipo"]
      ],

      
      "No carga la batería": [
        ["Batería", "Fallas en batería dañada o mal conectada"],
        ["Pin / puerto de carga", "Un pin o puerto de carga dañado, sucio o mal trabajado puede generar que el equipo no cargue."],
        ["Sulfato / suciedad", "Daños o fallas producidos por sulfato o suciedad en el pin o zonas relacionadas a la carga."],
        ["Placa Madre", "Cortocircuito o placa dañada en sector de carga."]
      ],

      
      "El celular no mantiene carga / se desgasta la batería": [
        ["Batería", "Batería dañada o desgastada."],
        ["Cargador no indicado", "Cargador de mala calidad / no original o dañado. Se recomienda probar con otro cargador"],
        ["Sulfato / suciedad", "Daños o fallas producidos por presencia de sulfato o suciedad. Generando que se consuma energía cuando no debería."],
        ["Placa madre", "Fallas,Cortocircuito o fuga en Placa. Fallas en circuito de carga."]
        ],

      
      "Mi celular no es reconocido por la PC": [
      ["Pin / puerto de carga", "Pin o puerto de carga dañado,sucio o faltante."],
      ["Puerto USB de la PC", "Puerto USB de la PC dañado,sucio o faltante."],
      ["Cable USB", "Un cable USB dañado, sin conexión de datos o que solo sirve para cargar pueden afectar."],
      ["Drivers en PC no instalados", "Controladores del dispositivo de la computadora no instalados, que evitan conectar el equipo."],
      ["Placa madre", "Fallas en placa. Revisar Circuito de conexión de datos."]
    ],
    "La camara no funciona (la app se cierra o no saca fotos)": [
      ["Cámara", "Cámara desconectada, dañada o faltante. Cambio de cámara recomendado."],
      ["Conectores", "Conectores FPC de placa o de cámara dañados."],
      ["Sulfato / suciedad", "Daños o fallas producidos por presencia de sulfato o suciedad."],
      ["Placa Madre", "Falla, cortocircuito o fuga en placa. Revisar Circuito de funcionamiento de cámaras."],
      ["SoftWare", "Problemas en software dañado o en mal funcionamiento. Se recomienda formateo o Flasheo."]
    ],
    "La memoria esta llena (sin archivos, ni apps instaladas)": [
      ["Problemas en software", "Posible virus almacenado en el sistema. Se recomienda formateo o en casos graves, flasheo."],
      ["Archivos Residuales", "El equipo acumula datos innecesarios, que no fueron eliminados. Generando un espacio importante ocupado. Se recomienda formateo."]
    ],
    "El celular está lento y se calienta": [
      ["Placa Madre", "Falla, cortocircuito o fuga en placa. Revisar Circuito de encendido y funcionamiento."],
      ["Sulfato / suciedad", "Daños o fallas producidos por presencia de sulfato o suciedad."],
      ["Sobrecarga en memorias", "Sobrecarga de archivos y datos en memoria RAM o memoria ROM. Se recomienda limpieza."],
      ["Software", "Sistema operativo dañado o con fallas. Se recomienda formateo o flasheo."],
      ["Antiguedad", "El equipo es demasiado viejo, tiene un mal uso o desgaste notable en sus componentes internos. Generando sobrecalentamientos."]
    ],
    "Solo llamadas de emergencia": [
      ["Bandeja PortaSIM", "Bandeja dañada, sucia o faltante."],
      ["Sulfato / suciedad", "Daños o fallas producidos por presencia de sulfato o suciedad."],
      ["SIM / Chip", "Un chip / SIM dañado o dado de baja dan problemas de conectividad."],
      ["Antenas Coaxiales / Flex", "Antenas dañadas, desconectadas o faltantes."],
      ["Placa Madre", "Falla, cortocircuito o fuga en placa. Revisar Circuito de RF."],
      ["Equipo Importado", "El equipo proviene fuera del país y no está liberado. Requiere Código de liberación."],
      ["SoftWare", "Problemas en software dañado o en mal funcionamiento. Se recomienda formateo o Flasheo."],
      ["IMEI", "IMEI en blacklist. Reportado como equipo con robo, hurto o extravío."]
    ],
    "Wifi No se activa": [
      ["Antenas Coaxiales / flex", "Antenas dañadas, desconectadas o faltantes."],
      ["Sulfato / suciedad", "Daños o fallas producidos por presencia de sulfato o suciedad."],
      ["Placa Madre", "Falla, cortocircuito o fuga en placa. Revisar Circuito de Conectividad WIFI."],
      ["SoftWare", "Problemas en software dañado o en mal funcionamiento. Se recomienda formateo o Flasheo."]
    ],
    "No detecta Teclas o Botones": [
      ["Botones / flex", "Botones o flex desconectados, sulfatados, dañados o faltantes."],
      ["Touch / táctil", "Táctil o touch mal conectado, sucios, dañados o faltantes. Se recomienda cambio de módulo."],
      ["Módulo de imagen", "Módulo dañado, mal conectado, sucio o faltante. Se recomienda cambio de módulo."]
    ],
    "Vibra al conectar batería / solo vibra": [
      ["Módulo de imagen", "Módulo dañado, mal conectado, sucio o faltante. Se recomienda cambio de módulo."],
      ["Sulfato / suciedad", "Daños o fallas producidos por presencia de sulfato o suciedad."],
      ["Conectores", "Conectores FPC de placa o del módulo dañados."],
      ["Placa Madre", "Falla, cortocircuito o fuga en placa. Revisar Circuito de Encendido."]
    ],
    "No lee la memoría extraíble (MicroSD)": [
      ["Bandeja PortaSD (portasim)", "Bandeja dañada, sucia o faltante."],
      ["Memoria SD", "Memoria dañada, con virus o en un formato inadecuado. Se recomienda formatear memoria o reemplazarla."],
      ["Sulfato / suciedad", "Daños o fallas producidos por presencia de sulfato o suciedad."],
      ["Placa Madre", "Falla, cortocircuito o fuga en placa. Revisar Circuito de lectora de SD."]
    ],
    "Auricular (cable) Funciona A veces": [
      ["Conector", "Conector Jack de 3.5mm dañado, sucio o faltante."],
      ["Sulfato / suciedad", "Daños o fallas producidos por presencia de sulfato o suciedad. Puede ser interno o en el conector."],
      ["Placa Madre", "Falla, cortocircuito o fuga en placa. Revisar Circuito de conexión del jack."]
    ],
    "Auricular (inalámbrico / bluetooth) Funciona A veces": [
      ["Auricular", "El auricular está dañado."],
      ["SoftWare", "Problemas en software dañado o en mal funcionamiento. Se recomienda restablecimiento de configuración, formateo o flasheo."],
      ["Sulfato / suciedad", "Daños o fallas producidos por presencia de sulfato o suciedad."],
      ["Placa Madre", "Falla, cortocircuito o fuga en placa. Revisar Circuito de conexión de conectividad Bluetooth."]
    ],
    "Ingrese código de Desbloqueo al insertar SIM": [
      ["Equipo Importado", "El equipo proviene fuera del país y no está liberado. Requiere Código de liberación."],
      ["Equipo NO liberado", "Necesita liberación por código para utilizar SIMs de otras empresas."]
    ],
    "El Equipo tiene patrón, Clave de usuario o Cuenta de google": [
      ["No se acuerda la contraseña", "En la cuenta de Google, activar la recuperación de cuenta a través de datos de usuario."],
      ["Equipo cuestionable", "Equipo de procedencia ilegítima. Se recomienda rechazar."],
      ["Software", "Se debe eliminar toda la información del equipo para eliminar con ella la contraseña. Formateo requerido. Es probable que la cuenta de Google (y su bloqueo FRP) se mantengan."]
    ],
    "el celular Calienta Junto a la batería": [
      ["Batería", "Batería dañada o desgastada. Se recomienda cambio de batería."],
      ["SoftWare", "Problemas en software dañado o en mal funcionamiento. Se recomienda formateo o Flasheo."],
      ["Placa Madre", "Falla, cortocircuito o fuga en placa. Revisar Circuito de encendido y funcionamiento."]
    ],
    "La pantalla hace rayas como de interferencia, lluvia o lineas de colores": [
      ["Módulo de imagen", "Módulo dañado, mal conectado, sucio o faltante. Se recomienda cambio de módulo."],
      ["Conectores", "Conectores FPC de placa o del módulo dañados, sucios o desconectados."],
      ["Sulfato / suciedad", "Daños o fallas producidos por presencia de sulfato o suciedad."],
      ["Placa Madre", "Falla, cortocircuito o fuga en placa. Revisar Circuito de imagen."]
    ],
    "Solo se escucha el sonido cuando lo acerco a la oreja": [
      ["Parlantes", "Parlante altavoz dañado, mal conectado, sucio, desconectado o faltante. Se recomienda pruebas con otros parlantes."],
      ["Conectores", "Conectores de presión de placa o del parlante dañados, sucios o desconectados."],
      ["Sulfato / suciedad", "Daños o fallas producidos por presencia de sulfato o suciedad."],
      ["Placa Madre", "Falla, cortocircuito o fuga en placa. Revisar Circuito de Audio."]
    ],
    "Solo se se escucha el sonido en altavoz (en llamada o en audios)": [
      ["Parlantes", "Parlante auricular dañado, mal conectado, sucio, desconectado o faltante. Se recomienda pruebas con otros parlantes."],
      ["Conectores", "Conectores de presión de placa o del parlante dañados, sucios o desconectados."],
      ["Sulfato / suciedad", "Daños o fallas producidos por presencia de sulfato o suciedad."],
      ["Placa Madre", "Falla, cortocircuito o fuga en placa. Revisar Circuito de Audio."]
    ],
    "Aparece un triángulo amarillo al encender o cargar (depende del ícono)": [
      ["Sulfato / suciedad", "Daños o fallas producidos por presencia de sulfato o suciedad."],
      ["Placa Madre", "Falla, cortocircuito o fuga en placa. Revisar Circuito de carga, encendido o termistores."]
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
