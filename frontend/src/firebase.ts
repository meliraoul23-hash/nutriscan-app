// Firebase Configuration for NutriScan
import { initializeApp } from 'firebase/app';
import { 
  initializeAuth,
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  updateProfile,
  sendPasswordResetEmail,
  getReactNativePersistence,
  User
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC51bbLpyAW7io2S7dbqf_utXrk6FbcFdk",
  authDomain: "nutriscan-48590.firebaseapp.com",
  projectId: "nutriscan-48590",
  storageBucket: "nutriscan-48590.firebasestorage.app",
  messagingSenderId: "343097974542",
  appId: "1:343097974542:web:0e1ef130bef80b03b7415f",
  measurementId: "G-1JHME9Z79E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with proper persistence for React Native
let auth;
if (Platform.OS === 'web') {
  // For web, use default auth
  auth = getAuth(app);
} else {
  // For mobile (iOS/Android), use AsyncStorage for persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

const googleProvider = new GoogleAuthProvider();

// Auth functions
export const firebaseLogin = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    let message = 'Connexion échouée';
    if (error.code === 'auth/user-not-found') {
      message = 'Aucun compte trouvé avec cet email';
    } else if (error.code === 'auth/wrong-password') {
      message = 'Mot de passe incorrect';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Email invalide';
    } else if (error.code === 'auth/invalid-credential') {
      message = 'Email ou mot de passe incorrect';
    }
    return { user: null, error: message };
  }
};

export const firebaseRegister = async (email: string, password: string, name: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Update profile with display name
    await updateProfile(userCredential.user, { displayName: name });
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    let message = 'Inscription échouée';
    if (error.code === 'auth/email-already-in-use') {
      message = 'Cet email est déjà utilisé';
    } else if (error.code === 'auth/weak-password') {
      message = 'Le mot de passe doit contenir au moins 6 caractères';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Email invalide';
    }
    return { user: null, error: message };
  }
};

export const firebaseLogout = async () => {
  try {
    await signOut(auth);
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: 'Erreur lors de la déconnexion' };
  }
};

export const firebaseGoogleLogin = async () => {
  try {
    // Always use web method for now (works in browser and Expo web)
    console.log('[Google Auth] Starting login with redirect method...');
    
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
    // Store that we're attempting redirect
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('google_auth_redirect', 'pending');
      }
    } catch (e) {
      console.log('[Google Auth] Could not save redirect state');
    }
    
    await signInWithRedirect(auth, googleProvider);
    
    // This won't be reached immediately as page redirects
    return { user: null, error: null };
  } catch (error: any) {
    console.log('[Google Auth] Error:', error.code, error.message);
    let message = 'Connexion Google echouee';
    if (error.code === 'auth/popup-closed-by-user') {
      message = 'Connexion annulee';
    } else if (error.code === 'auth/popup-blocked') {
      message = 'Popup bloquee. Essayez de nouveau.';
    } else if (error.code === 'auth/cancelled-popup-request') {
      message = 'Connexion annulee';
    } else if (error.code === 'auth/unauthorized-domain') {
      message = 'Domaine non autorise dans Firebase. Contactez l\'administrateur.';
    } else if (error.code === 'auth/operation-not-allowed') {
      message = 'La connexion Google n\'est pas activee dans Firebase';
    } else if (error.message) {
      message = error.message;
    }
    return { user: null, error: message };
  }
};

// Check for redirect result on page load
export const checkGoogleRedirectResult = async () => {
  try {
    // Check if we have a pending redirect
    let pendingRedirect = null;
    try {
      pendingRedirect = await AsyncStorage.getItem('google_auth_redirect');
    } catch (e) {
      if (typeof localStorage !== 'undefined') {
        pendingRedirect = localStorage.getItem('google_auth_redirect');
      }
    }
    
    console.log('[Google Auth] Checking redirect result, pending:', pendingRedirect);
    
    // Always check for redirect result (Firebase handles the state)
    const result = await getRedirectResult(auth);
    
    // Clear the pending flag
    try {
      await AsyncStorage.removeItem('google_auth_redirect');
    } catch (e) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('google_auth_redirect');
      }
    }
    
    if (result?.user) {
      console.log('[Google Auth] Redirect success:', result.user.email);
      return { user: result.user, error: null };
    }
    
    console.log('[Google Auth] No redirect result found');
  } catch (error: any) {
    console.log('[Google Auth] Redirect result error:', error.code, error.message);
  }
  return { user: null, error: null };
};

// Password Reset
export const firebaseResetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, error: null };
  } catch (error: any) {
    let message = 'Erreur lors de l\'envoi';
    if (error.code === 'auth/user-not-found') {
      message = 'Aucun compte trouvé avec cet email';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Email invalide';
    }
    return { success: false, error: message };
  }
};

// Auth state listener
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Get Firebase ID Token for API calls
export const getIdToken = async () => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken();
      return token;
    } catch (error) {
      console.log('Error getting ID token:', error);
      return null;
    }
  }
  return null;
};

// Convert Firebase user to app user format
export const formatUser = (firebaseUser: User) => {
  return {
    user_id: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: firebaseUser.displayName || 'Utilisateur',
    picture: firebaseUser.photoURL || null,
    subscription_type: 'free' // Default, will be updated from backend
  };
};

export { auth, googleProvider };
