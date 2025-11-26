import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  setPersistence, 
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Set persistence to SESSION - clears auth on browser close and doesn't persist across page reloads
setPersistence(auth, browserSessionPersistence).catch((error) => {
  console.error("Error setting persistence:", error);
});

export const googleProvider = new GoogleAuthProvider();
// Force account selection on every sign-in
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export async function signInWithGoogle() {
  try {
    console.log("Starting Google sign-in with popup...");
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Sign-in successful:", result.user.uid);
    return result;
  } catch (error) {
    console.error("Sign-in error:", error);
    throw error;
  }
}

export async function signUpWithEmail(email: string, password: string, displayName?: string) {
  try {
    console.log("Starting email/password sign-up...");
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update display name if provided
    if (displayName && result.user) {
      await updateProfile(result.user, { displayName });
    }
    
    console.log("Sign-up successful:", result.user.uid);
    return result;
  } catch (error) {
    console.error("Sign-up error:", error);
    throw error;
  }
}

export async function signInWithEmail(email: string, password: string) {
  try {
    console.log("Starting email/password sign-in...");
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log("Sign-in successful:", result.user.uid);
    return result;
  } catch (error) {
    console.error("Sign-in error:", error);
    throw error;
  }
}

export async function signOut() {
  console.log("Signing out from Firebase...");
  await firebaseSignOut(auth);
  console.log("Firebase sign-out complete");
}
