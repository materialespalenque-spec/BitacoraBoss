// ============================================================
// CONFIGURACIÓN DE FIREBASE — Bitácora del Dueño
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyBLkswmygt9H_mrUeP2ov_s7q_cFlsMbWI",
  authDomain: "bitacora-dueno-mp.firebaseapp.com",
  projectId: "bitacora-dueno-mp",
  storageBucket: "bitacora-dueno-mp.firebasestorage.app",
  messagingSenderId: "681078025772",
  appId: "1:681078025772:web:04e983874840847dfe2b89",
  measurementId: "G-HTH3988LC8"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Persistencia offline: permite marcar tareas y capturar gastos sin señal,
// y se sincroniza solo cuando vuelve la conexión.
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
  console.warn("Persistencia offline no disponible:", err.code);
});
