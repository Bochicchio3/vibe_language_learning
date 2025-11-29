import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyB12iWKLtQnrGwH62HfSB5Lb3h6aAdIP2Y",
    authDomain: "vibe-language-learning.firebaseapp.com",
    projectId: "vibe-language-learning",
    storageBucket: "vibe-language-learning.firebasestorage.app",
    messagingSenderId: "902980237738",
    appId: "1:902980237738:web:c80288efef81521a2393d3",
    measurementId: "G-8FY4SD6PZJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Re-enable Long Polling as WebSockets seem blocked
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
