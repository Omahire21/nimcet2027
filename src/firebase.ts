import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAit0_ZH5UnNz7ENopTZb07s2hGEQtjsjo",
  authDomain: "nimcet2027-fd3f4.firebaseapp.com",
  projectId: "nimcet2027-fd3f4",
  storageBucket: "nimcet2027-fd3f4.firebasestorage.app",
  messagingSenderId: "773935535878",
  appId: "1:773935535878:web:c777d65f9a689333efb087",
  measurementId: "G-L5JZVZ4YQC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        return {
            name: user.displayName || "User",
            email: user.email || "",
            avatar: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=6366f1&color=fff`
        };
    } catch (error) {
        console.error("Auth error:", error);
        throw error;
    }
};

export const logoutUser = () => signOut(auth);
