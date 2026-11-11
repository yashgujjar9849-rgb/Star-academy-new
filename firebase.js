
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";

import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import {
  getStorage
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBScM5IyYb6GVxTqm5Fa68tf1nG7WknjzU",
  authDomain: "stars-academy-80826.firebaseapp.com",
  projectId: "stars-academy-80826",
  storageBucket: "stars-academy-80826.firebasestorage.app",
  messagingSenderId: "501947445304",
  appId: "1:501947445304:web:1795ea476b105873fef6cd",
  measurementId: "G-62D8KH347M"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const authReady = setPersistence(
  auth,
  browserLocalPersistence
);
 
