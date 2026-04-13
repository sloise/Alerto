import { getAuth } from 'firebase/auth';
import { initializeApp } from "firebase/app";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDw2xetPJBsBMFrHcsk7VCE0912Ht9yZkA",
  authDomain: "alerto-app-85298.firebaseapp.com",
  projectId: "alerto-app-85298",
  storageBucket: "alerto-app-85298.firebasestorage.app",
  messagingSenderId: "374289377107",
  appId: "1:374289377107:web:2709c560559b954c0623a6"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);


