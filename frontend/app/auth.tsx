// Auth Screen with 3 Google Login Methods
// 1. Email/Password - Works everywhere
// 2. Google Web (redirect) - Works on web browsers
// 3. Google Mobile (expo-auth-session) - Works on Expo Go/native apps
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { colors } from '../src/styles/colors';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { firebaseGoogleLoginWithToken } from '../src/firebase';

// Complete auth session for web
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client IDs - Using Expo's proxy for Expo Go
const EXPO_CLIENT_ID = "343097974542-PLACEHOLDER.apps.googleusercontent.com";

export default function AuthScreen() {
  const router = useRouter();
  const { login, register, loginWithGoogle, resetPassword } = useAuth();
  
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Google Auth for Mobile using Expo's proxy
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: EXPO_CLIENT_ID,
    webClientId: "343097974542-PLACEHOLDER.apps.googleusercontent.com",
    selectAccount: true,
  });

  // Handle Google auth response for mobile
  useEffect(() => {
    const handleGoogleResponse = async () => {
      if (response?.type === 'success') {
        console.log('[Google Mobile] Auth success, getting token...');
        setLoading(true);
        setError('');
        
        try {
          const { id_token } = response.params;
          
          if (id_token) {
            // Sign in to Firebase with the Google ID token
            const result = await firebaseGoogleLoginWithToken(id_token);
            
            if (result.user) {
              console.log('[Google Mobile] Firebase login success:', result.user.email);
              // Navigate to home instead of going back to prevent white screen
              router.replace('/(tabs)/home');
            } else if (result.error) {
              setError(result.error);
            }
          } else {
            setError('Token non recu de Google');
          }
        } catch (err) {
          console.log('[Google Mobile] Error:', err);
          setError('Erreur de connexion Google');
        } finally {
          setLoading(false);
        }
      } else if (response?.type === 'error') {
        console.log('[Google Mobile] Auth error:', response.error);
        setError('Connexion Google annulee');
      }
    };

    if (response) {
      handleGoogleResponse();
    }
  }, [response]);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        console.log('[Auth] Attempting login for:', email);
        const result = await login(email, password);
        console.log('[Auth] Login result:', result.success);
        if (result.success) {
          // Keep loading true during navigation to prevent white screen
          console.log('[Auth] Login success, navigating to home...');
          // Small delay to ensure auth state is fully propagated before navigation
          await new Promise(resolve => setTimeout(resolve, 500));
          // Navigate to home - don't set loading to false here
          router.replace('/(tabs)/home');
          return; // Exit early, don't set loading to false
        } else {
          setError(result.error || 'Erreur de connexion');
        }
      } else if (mode === 'register') {
        console.log('[Auth] Attempting registration for:', email);
        const result = await register(email, password, name);
        console.log('[Auth] Registration result:', result.success);
        if (result.success) {
          // Keep loading true during navigation to prevent white screen
          console.log('[Auth] Registration success, navigating to home...');
          // Small delay to ensure auth state is fully propagated before navigation
          await new Promise(resolve => setTimeout(resolve, 500));
          // Navigate to home - don't set loading to false here
          router.replace('/(tabs)/home');
          return; // Exit early, don't set loading to false
        } else {
          setError(result.error || 'Erreur d\'inscription');
        }
      } else if (mode === 'reset') {
        const result = await resetPassword(email);
        if (result.success) {
          setSuccess('Email de reinitialisation envoye !');
          setMode('login');
        } else {
          setError(result.error || 'Erreur');
        }
      }
    } catch (err: any) {
      console.log('[Auth] Error:', err);
      setError(err.message || 'Une erreur est survenue');
    }
    // Only set loading to false if we haven't navigated away
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    console.log('[Auth Screen] Starting Google login, Platform:', Platform.OS);
    
    try {
      if (Platform.OS === 'web') {
        // Web: Use Firebase redirect
        console.log('[Auth Screen] Using web redirect method...');
        const result = await loginWithGoogle();
        if (result.error) {
          setError(result.error);
          setLoading(false);
        }
        // For redirect, page will reload, so we don't need to handle success here
      } else {
        // Mobile: Use expo-auth-session
        console.log('[Auth Screen] Using mobile native method...');
        if (request) {
          await promptAsync();
          // Response will be handled by useEffect above
        } else {
          setError('Configuration Google non disponible. Utilisez email/mot de passe.');
          setLoading(false);
        }
      }
    } catch (err: any) {
      console.log('[Auth Screen] Google login exception:', err);
      setError(err.message || 'Erreur Google');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <Ionicons name="leaf" size={48} color={colors.primary} />
            </View>
            <Text style={styles.title}>
              {mode === 'login' ? 'Connexion' : mode === 'register' ? 'Inscription' : 'Reinitialisation'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'login'
                ? 'Connectez-vous a votre compte'
                : mode === 'register'
                ? 'Creez votre compte NutriScan'
                : 'Entrez votre email pour reinitialiser'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {success ? (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.successText}>{success}</Text>
              </View>
            ) : null}

            {mode === 'register' && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nom</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Votre nom"
                    placeholderTextColor={colors.textSecondary}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="votre@email.com"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {mode !== 'reset' && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Mot de passe</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </View>
            )}

            {mode === 'login' && (
              <TouchableOpacity style={styles.forgotPassword} onPress={() => setMode('reset')}>
                <Text style={styles.forgotPasswordText}>Mot de passe oublie ?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {mode === 'login' ? 'Se connecter' : mode === 'register' ? 'S\'inscrire' : 'Envoyer'}
                </Text>
              )}
            </TouchableOpacity>

            {mode !== 'reset' && (
              <>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>ou</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity 
                  style={[styles.googleButton, loading && styles.googleButtonDisabled]} 
                  onPress={handleGoogleLogin} 
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={20} color="#FFF" />
                      <Text style={styles.googleButtonText}>Continuer avec Google</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Info about auth method */}
                <Text style={styles.authInfo}>
                  {Platform.OS === 'web' 
                    ? 'Connexion via redirection Google' 
                    : 'Connexion native Google'}
                </Text>
              </>
            )}

            <TouchableOpacity
              style={styles.switchMode}
              onPress={() => {
                setError('');
                setSuccess('');
                setMode(mode === 'login' ? 'register' : 'login');
              }}
            >
              <Text style={styles.switchModeText}>
                {mode === 'login' ? 'Pas de compte ? S\'inscrire' : 'Deja un compte ? Se connecter'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, padding: 24 },
  header: { alignItems: 'center', marginBottom: 40, marginTop: 20 },
  backButton: { position: 'absolute', left: 0, top: 0 },
  logoContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginTop: 16 },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
  form: { width: '100%' },
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 2, borderColor: '#E0E0E0' },
  inputIcon: { marginLeft: 14 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 16, fontSize: 16, color: colors.text },
  forgotPassword: { alignItems: 'flex-end', marginBottom: 8, marginTop: -4 },
  forgotPasswordText: { color: colors.primary, fontSize: 14 },
  submitButton: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.surface },
  dividerText: { color: colors.textSecondary, paddingHorizontal: 16, fontSize: 14 },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4285F4', paddingVertical: 14, borderRadius: 12, minHeight: 52 },
  googleButtonDisabled: { opacity: 0.7 },
  googleButtonText: { color: '#FFF', fontSize: 16, fontWeight: '500', marginLeft: 8 },
  authInfo: { textAlign: 'center', fontSize: 12, color: colors.textSecondary, marginTop: 8 },
  switchMode: { alignItems: 'center', marginTop: 24 },
  switchModeText: { color: colors.primary, fontSize: 14 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', padding: 12, borderRadius: 8, marginBottom: 12 },
  errorText: { color: colors.error, fontSize: 14, marginLeft: 8, flex: 1 },
  successContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', padding: 12, borderRadius: 8, marginBottom: 12 },
  successText: { color: colors.success, fontSize: 14, marginLeft: 8, flex: 1 },
});
