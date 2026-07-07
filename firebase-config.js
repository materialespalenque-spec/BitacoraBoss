// ============================================================
// CONFIGURACIÓN DE FIREBASE — Bitácora del Dueño
// ============================================================
// 1. Ve a https://console.firebase.google.com
// 2. Crea un proyecto nuevo (ej. "bitacora-dueno-mp")
// 3. Dentro del proyecto: Configuración del proyecto > General
//    > "Tus apps" > agrega una app Web (</>) > copia el objeto config
// 4. Pega esos valores aquí abajo, reemplazando los "TU_..."
// 5. En el menú lateral: Build > Firestore Database > Crear base de datos
//    (modo producción, región cercana, ej. us-central o southamerica-east1)
// ============================================================
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBLkswmygt9H_mrUeP2ov_s7q_cFlsMbWI",
  authDomain: "bitacora-dueno-mp.firebaseapp.com",
  projectId: "bitacora-dueno-mp",
  storageBucket: "bitacora-dueno-mp.firebasestorage.app",
  messagingSenderId: "681078025772",
  appId: "1:681078025772:web:04e983874840847dfe2b89",
  measurementId: "G-HTH3988LC8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);