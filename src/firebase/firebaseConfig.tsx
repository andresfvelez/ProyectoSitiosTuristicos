import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
const firebaseConfig = {
    apiKey: "AIzaSyCS0K6ncPrKQ_3wqNC8uwUYzkjTx3N5Mvs",
    authDomain: "sitios-turisticos-tesis.firebaseapp.com",
    projectId: "sitios-turisticos-tesis",
    storageBucket: "sitios-turisticos-tesis.firebasestorage.app",
    messagingSenderId: "212388302936",
    appId: "1:212388302936:web:980cd75753ef95ff913a2d"
};

export  const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app)
export const storage = getStorage(app);
