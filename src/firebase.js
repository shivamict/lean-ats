import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDakwjo9gk-zi5GX8cAGNX1AuKRo2Z1_yY",
  authDomain: "lean-ats.firebaseapp.com",
  projectId: "lean-ats",
  storageBucket: "lean-ats.firebasestorage.app",
  messagingSenderId: "488044109503",
  appId: "1:488044109503:web:5f36a18827b88c799f300a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, provider, db, storage };