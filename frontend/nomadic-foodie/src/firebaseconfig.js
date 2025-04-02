// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyACsFHxAhFOYrkmTYhWDaC060FtXjVFTq4",
  authDomain: "nomadicfoodie-e9d9d.firebaseapp.com",
  projectId: "nomadicfoodie-e9d9d",
  storageBucket: "nomadicfoodie-e9d9d.firebasestorage.app",
  messagingSenderId: "317238843985",
  appId: "1:317238843985:web:8439b348e6088236727670",
  measurementId: "G-Y3S88WJPRJ"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);