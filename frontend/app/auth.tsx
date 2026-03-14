// Auth Screen
import React, { useState } from 'react';
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

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const result = await login(email, password);
        if (result.success) {
          router.back();
        } else {
          setError(result.error || 'Erreur de connexion');
        }
      } else if (mode === 'register') {
        const result = await register(email, password, name);
        if (result.success) {
          router.back();
        } else {
          setError(result.error || 'Erreur d\'inscription');
        }
      } else if (mode === 'reset') {
        const result = await resetPassword(email);
        if (result.success) {
          setSuccess('Email de réinitialisation envoyé !');
          setMode('login');
        } else {
          setError(result.error || 'Erreur');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    console.log('[Auth Screen] Starting Google login...');
    try {
      const result = await loginWithGoogle();
      console.log('[Auth Screen] Google login result:', result);
      if (result.success) {
        console.log('[Auth Screen] Google login successful, navigating back...');
        router.back();
      } else if (result.error) {
        console.log('[Auth Screen] Google login error:', result.error);
        setError(result.error);
      }
    } catch (err: any) {
      console.log('[Auth Screen] Google login exception:', err);
      setError(err.message || 'Erreur Google');
    } finally {
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
              {mode === 'login' ? 'Connexion' : mode === 'register' ? 'Inscription' : 'Réinitialisation'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'login'
                ? 'Connectez-vous à votre compte'
                : mode === 'register'
                ? 'Créez votre compte NutriScan'
                : 'Entrez votre email pour réinitialiser'}
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
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </View>
            )}

            {mode === 'login' && (
              <TouchableOpacity style={styles.forgotPassword} onPress={() => setMode('reset')}>
                <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
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

                <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin} disabled={loading}>
                  <Ionicons name="logo-google" size={20} color="#FFF" />
                  <Text style={styles.googleButtonText}>Continuer avec Google</Text>
                </TouchableOpacity>
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
                {mode === 'login' ? 'Pas de compte ? S\'inscrire' : 'Déjà un compte ? Se connecter'}
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
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4285F4', paddingVertical: 14, borderRadius: 12 },
  googleButtonText: { color: '#FFF', fontSize: 16, fontWeight: '500', marginLeft: 8 },
  switchMode: { alignItems: 'center', marginTop: 24 },
  switchModeText: { color: colors.primary, fontSize: 14 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', padding: 12, borderRadius: 8, marginBottom: 12 },
  errorText: { color: colors.error, fontSize: 14, marginLeft: 8, flex: 1 },
  successContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', padding: 12, borderRadius: 8, marginBottom: 12 },
  successText: { color: colors.success, fontSize: 14, marginLeft: 8, flex: 1 },
});
