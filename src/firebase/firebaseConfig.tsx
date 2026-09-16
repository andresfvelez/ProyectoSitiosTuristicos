import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager
} from 'firebase/firestore';
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getAnalytics, logEvent } from "firebase/analytics";
const firebaseConfig = {
    apiKey: "AIzaSyCS0K6ncPrKQ_3wqNC8uwUYzkjTx3N5Mvs",
    authDomain: "sitios-turisticos-tesis.firebaseapp.com",
    projectId: "sitios-turisticos-tesis",
    storageBucket: "sitios-turisticos-tesis.firebasestorage.app",
    messagingSenderId: "212388302936",
    appId: "1:212388302936:web:980cd75753ef95ff913a2d",
    measurementId: "G-WR2R0WGQXN"
};

export  const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager() // Evita conflictos si el usuario abre la app en varias pestañas
    })
});
export const auth = getAuth(app)
export const storage = getStorage(app);


export const analytics = getAnalytics(app);
