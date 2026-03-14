// Firebase Configuration for NutriScan
// Supports: Email/Password, Google Web (redirect), Google Mobile (expo-auth-session)
import { initializeApp } from 'firebase/app';
import { 
  initializeAuth,
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
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
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

// Complete any pending auth sessions
WebBrowser.maybeCompleteAuthSession();

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

// Google OAuth Client IDs
// You need to create these in Google Cloud Console
const GOOGLE_WEB_CLIENT_ID = "343097974542-XXXXXXX.apps.googleusercontent.com"; // Replace with your web client ID
const GOOGLE_IOS_CLIENT_ID = "343097974542-XXXXXXX.apps.googleusercontent.com"; // Replace with your iOS client ID  
const GOOGLE_ANDROID_CLIENT_ID = "343097974542-XXXXXXX.apps.googleusercontent.com"; // Replace with your Android client ID

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with proper persistence for React Native
let auth: any;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

const googleProvider = new GoogleAuthProvider();

// ============== EMAIL/PASSWORD AUTH ==============

export const firebaseLogin = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    let message = 'Connexion echouee';
    if (error.code === 'auth/user-not-found') {
      message = 'Aucun compte trouve avec cet email';
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
    await updateProfile(userCredential.user, { displayName: name });
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    let message = 'Inscription echouee';
    if (error.code === 'auth/email-already-in-use') {
      message = 'Cet email est deja utilise';
    } else if (error.code === 'auth/weak-password') {
      message = 'Le mot de passe doit contenir au moins 6 caracteres';
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
    return { success: false, error: 'Erreur lors de la deconnexion' };
  }
};

// ============== GOOGLE AUTH - WEB (Redirect) ==============

export const firebaseGoogleLoginWeb = async () => {
  try {
    console.log('[Google Auth Web] Starting redirect login...');
    
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
    // Store redirect state
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('google_auth_redirect', 'pending');
    }
    
    await signInWithRedirect(auth, googleProvider);
    return { user: null, error: null };
  } catch (error: any) {
    console.log('[Google Auth Web] Error:', error.code, error.message);
    return { user: null, error: getGoogleErrorMessage(error) };
  }
};

// Check redirect result on page load (Web only)
export const checkGoogleRedirectResult = async () => {
  if (Platform.OS !== 'web') return { user: null, error: null };
  
  try {
    console.log('[Google Auth Web] Checking redirect result...');
    const result = await getRedirectResult(auth);
    
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('google_auth_redirect');
    }
    
    if (result?.user) {
      console.log('[Google Auth Web] Redirect success:', result.user.email);
      return { user: result.user, error: null };
    }
  } catch (error: any) {
    console.log('[Google Auth Web] Redirect error:', error.code);
  }
  return { user: null, error: null };
};

// ============== GOOGLE AUTH - MOBILE (expo-auth-session) ==============

// Hook to use in components for mobile Google auth
export const useGoogleAuth = () => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });

  return { request, response, promptAsync };
};

// Sign in with Google ID token (from expo-auth-session)
export const firebaseGoogleLoginWithToken = async (idToken: string) => {
  try {
    console.log('[Google Auth Mobile] Signing in with ID token...');
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    console.log('[Google Auth Mobile] Success:', userCredential.user.email);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    console.log('[Google Auth Mobile] Error:', error.code, error.message);
    return { user: null, error: getGoogleErrorMessage(error) };
  }
};

// ============== UNIFIED GOOGLE LOGIN ==============

// Main Google login function - automatically chooses the right method
export const firebaseGoogleLogin = async () => {
  if (Platform.OS === 'web') {
    return firebaseGoogleLoginWeb();
  } else {
    // For mobile, return info that promptAsync should be used
    return { 
      user: null, 
      error: null,
      useNativeAuth: true,
      message: 'Utilisez le bouton Google natif sur mobile'
    };
  }
};

// ============== PASSWORD RESET ==============

export const firebaseResetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, error: null };
  } catch (error: any) {
    let message = 'Erreur lors de l\'envoi';
    if (error.code === 'auth/user-not-found') {
      message = 'Aucun compte trouve avec cet email';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Email invalide';
    }
    return { success: false, error: message };
  }
};

// ============== HELPERS ==============

const getGoogleErrorMessage = (error: any) => {
  const errorMessages: Record<string, string> = {
    'auth/popup-closed-by-user': 'Connexion annulee',
    'auth/popup-blocked': 'Popup bloquee. Essayez de nouveau.',
    'auth/cancelled-popup-request': 'Connexion annulee',
    'auth/unauthorized-domain': 'Domaine non autorise dans Firebase.',
    'auth/operation-not-allowed': 'La connexion Google n\'est pas activee',
    'auth/account-exists-with-different-credential': 'Un compte existe deja avec cet email'
  };
  return errorMessages[error.code] || error.message || 'Connexion Google echouee';
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
      return await currentUser.getIdToken();
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
    subscription_type: 'free'
  };
};

export { auth, googleProvider };
