import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
    apiKey: "AIzaSyBHba93C7aTMGwsN9H_Aglbnw5BdvtiORY",
    authDomain: "appfertilidad.firebaseapp.com",
    projectId: "appfertilidad",
    storageBucket: "appfertilidad.firebasestorage.app",
    messagingSenderId: "758457647436",
    appId: "1:758457647436:web:54f8df23e701c56335cfe9"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);