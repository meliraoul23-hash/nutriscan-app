// Auth Context for NutriScan
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { User } from '../types';
import { checkPremiumStatusAPI } from '../services/api';
import {
  firebaseLogin,
  firebaseRegister,
  firebaseLogout,
  firebaseGoogleLogin,
  firebaseResetPassword,
  onAuthStateChange,
  formatUser,
  getIdToken,
} from '../firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  testPremiumMode: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  checkPremiumStatus: () => Promise<void>;
  forceRefreshPremium: () => Promise<void>;
  toggleTestPremiumMode: () => void;
  isPremium: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [testPremiumMode, setTestPremiumMode] = useState(false);

  // Computed premium status: either real premium OR test mode
  const isPremium = testPremiumMode || user?.subscription_type === 'premium';

  // Force refresh premium status from server
  const forceRefreshPremium = async () => {
    if (user) {
      console.log('[Auth] Force refreshing premium status for:', user.email);
      try {
        const premiumStatus = await checkPremiumStatusAPI(user.email);
        console.log('[Auth] Premium status from server:', premiumStatus);
        const updatedUser = { ...user, subscription_type: premiumStatus };
        setUser(updatedUser);
        await AsyncStorage.setItem('auth_user', JSON.stringify(updatedUser));
      } catch (error) {
        console.log('[Auth] Error refreshing premium:', error);
      }
    }
  };

  // Toggle test premium mode (for secret button)
  const toggleTestPremiumMode = () => {
    setTestPremiumMode(prev => {
      console.log('[Auth] Test Premium Mode:', !prev ? 'ACTIVATED' : 'DEACTIVATED');
      return !prev;
    });
  };

  // Refresh premium status when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && user) {
        forceRefreshPremium();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [user]);

  // Load auth state on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        const appUser = formatUser(firebaseUser);
        console.log('[Auth] Firebase user detected:', appUser.email);
        const premiumStatus = await checkPremiumStatusAPI(appUser.email);
        console.log('[Auth] Initial premium status:', premiumStatus);
        appUser.subscription_type = premiumStatus;
        setUser(appUser);
        await AsyncStorage.setItem('auth_user', JSON.stringify(appUser));
      } else {
        // Check local storage as fallback
        const savedUser = await AsyncStorage.getItem('auth_user');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          console.log('[Auth] Loading saved user:', parsedUser.email);
          const premiumStatus = await checkPremiumStatusAPI(parsedUser.email);
          console.log('[Auth] Premium status from server:', premiumStatus);
          parsedUser.subscription_type = premiumStatus;
          setUser(parsedUser);
          await AsyncStorage.setItem('auth_user', JSON.stringify(parsedUser));
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { user: firebaseUser, error } = await firebaseLogin(email, password);
      if (error) return { success: false, error };
      if (firebaseUser) {
        const appUser = formatUser(firebaseUser);
        const premiumStatus = await checkPremiumStatusAPI(appUser.email);
        appUser.subscription_type = premiumStatus;
        await AsyncStorage.setItem('auth_user', JSON.stringify(appUser));
        setUser(appUser);
        return { success: true };
      }
      return { success: false, error: 'Connexion échouée' };
    } catch (error: any) {
      return { success: false, error: 'Connexion échouée' };
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const { user: firebaseUser, error } = await firebaseRegister(email, password, name);
      if (error) return { success: false, error };
      if (firebaseUser) {
        const appUser = formatUser(firebaseUser);
        await AsyncStorage.setItem('auth_user', JSON.stringify(appUser));
        setUser(appUser);
        return { success: true };
      }
      return { success: false, error: 'Inscription échouée' };
    } catch (error: any) {
      return { success: false, error: 'Inscription échouée' };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const { user: firebaseUser, error } = await firebaseGoogleLogin();
      if (error) {
        if (error === 'Connexion annulée') return { success: false };
        return { success: false, error };
      }
      if (firebaseUser) {
        const appUser = formatUser(firebaseUser);
        const premiumStatus = await checkPremiumStatusAPI(appUser.email);
        appUser.subscription_type = premiumStatus;
        await AsyncStorage.setItem('auth_user', JSON.stringify(appUser));
        setUser(appUser);
        return { success: true };
      }
      return { success: false, error: 'Connexion Google échouée' };
    } catch (error: any) {
      return { success: false, error: 'Erreur lors de la connexion Google' };
    }
  };

  const logout = async () => {
    try {
      await firebaseLogout();
    } catch (error) {
      console.log('Logout error:', error);
    }
    await AsyncStorage.removeItem('auth_user');
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    const { success, error } = await firebaseResetPassword(email);
    return { success, error: error || undefined };
  };

  const checkPremiumStatus = async () => {
    if (user) {
      const premiumStatus = await checkPremiumStatusAPI(user.email);
      if (premiumStatus !== user.subscription_type) {
        const updatedUser = { ...user, subscription_type: premiumStatus };
        setUser(updatedUser);
        await AsyncStorage.setItem('auth_user', JSON.stringify(updatedUser));
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        testPremiumMode,
        login,
        register,
        loginWithGoogle,
        logout,
        resetPassword,
        checkPremiumStatus,
        forceRefreshPremium,
        toggleTestPremiumMode,
        isPremium,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
