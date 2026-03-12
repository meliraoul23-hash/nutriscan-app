// Firebase Configuration for NutriScan
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  updateProfile,
  User
} from 'firebase/auth';
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
const auth = getAuth(app);
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
    // On web, use popup
    if (Platform.OS === 'web') {
      const result = await signInWithPopup(auth, googleProvider);
      return { user: result.user, error: null };
    } else {
      // For mobile, we'll need expo-auth-session (handled separately)
      return { user: null, error: 'Utilisez le bouton Google sur mobile' };
    }
  } catch (error: any) {
    let message = 'Connexion Google échouée';
    if (error.code === 'auth/popup-closed-by-user') {
      message = 'Connexion annulée';
    } else if (error.code === 'auth/popup-blocked') {
      message = 'Popup bloquée. Autorisez les popups pour ce site.';
    }
    return { user: null, error: message };
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
