import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// TODO: Replace with your Firebase project configuration
// You can get this from the Firebase Console -> Project Settings -> General -> Your apps
const firebaseConfig = {
    apiKey: "AIzaSyCQk8FAwozz34jdqoW6wxFqeneaOtA_AP4",
    authDomain: "word-wolf-1432f.firebaseapp.com",
    databaseURL: "https://word-wolf-1432f-default-rtdb.firebaseio.com",
    projectId: "word-wolf-1432f",
    storageBucket: "word-wolf-1432f.firebasestorage.app",
    messagingSenderId: "777084245986",
    appId: "1:777084245986:web:a6976ec8ee22a110dbcbbb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);
