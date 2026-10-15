import { initializeApp } from 'firebase/app';
import {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager
} from 'firebase/firestore';
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getAnalytics, Analytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyCS0K6ncPrKQ_3wqNC8uwUYzkjTx3N5Mvs",
    authDomain: "sitios-turisticos-tesis.firebaseapp.com",
    projectId: "sitios-turisticos-tesis",
    storageBucket: "sitios-turisticos-tesis.firebasestorage.app",
    messagingSenderId: "212388302936",
    appId: "1:212388302936:web:980cd75753ef95ff913a2d",
    measurementId: "G-WR2R0WGQXN"
};

// Inicialización de la aplicación Firebase
export const app = initializeApp(firebaseConfig);

// Inicialización de Firestore con caché persistente (IndexedDB) para Web y Capacitor
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

// Servicios de autenticación y almacenamiento
export const auth = getAuth(app);
export const storage = getStorage(app);

// Inicialización segura de Analytics tolerante a bloqueadores y entornos nativos
let analyticsInstance: Analytics | null = null;
if (typeof window !== "undefined") {
    try {
        analyticsInstance = getAnalytics(app);
    } catch {
        analyticsInstance = null;
    }
}

export const analytics = analyticsInstance;