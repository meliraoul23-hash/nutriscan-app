import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
  TextInput,
  Modal,
  Alert,
  FlatList,
  KeyboardAvoidingView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';

const { width, height } = Dimensions.get('window');

// API URL
const getApiUrl = () => {
  const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL 
    || process.env.EXPO_PUBLIC_BACKEND_URL 
    || '';
  return `${backendUrl}/api`;
};

const API_URL = getApiUrl();

// Colors
const colors = {
  primary: '#4CAF50',
  primaryLight: '#81C784',
  primaryDark: '#388E3C',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  surfaceAlt: '#E8F5E9',
  text: '#212121',
  textSecondary: '#757575',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  premium: '#FFD700',
  scoreHigh: '#4CAF50',
  scoreMedium: '#FF9800',
  scoreLow: '#F44336',
};

// Types
interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  subscription_type: string;
}

interface Product {
  barcode: string;
  name: string;
  brand: string;
  image_url: string;
  health_score: number;
  nutri_score: string;
  nutri_score_grade: string;
  nova_group: number;
  additives: Additive[];
  nutrients: Nutrients;
  categories: string[];
  pro_tip: string;
  found: boolean;
  ingredients_text: string;
  ingredients_list: Ingredient[];
  allergens: string[];
  health_risks: HealthRisk[];
  is_vegan: boolean;
  is_vegetarian: boolean;
  is_palm_oil_free: boolean;
}

interface Additive {
  code: string;
  name: string;
  risk: 'high' | 'medium' | 'low';
  description: string;
  details: string;
  sources: string[];
  daily_limit: string;
}

interface Ingredient {
  id: string;
  name: string;
  percent: number;
  vegan: string;
  vegetarian: string;
}

interface HealthRisk {
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  icon: string;
}

interface Nutrients {
  energy_kcal: number;
  fat: number;
  saturated_fat: number;
  carbohydrates: number;
  sugars: number;
  fiber: number;
  proteins: number;
  salt: number;
}

interface ScanHistory {
  id: string;
  barcode: string;
  product_name: string;
  brand: string;
  image_url: string;
  health_score: number;
  nutri_score: string;
  timestamp: string;
}

interface HealingFood {
  name: string;
  benefits: string[];
  conditions: string[];
  source: string;
  image: string;
}

// Auth Context
const AuthContext = createContext<{
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
  loading: boolean;
}>({
  user: null,
  token: null,
  login: async () => {},
  register: async () => {},
  loginWithGoogle: () => {},
  logout: async () => {},
  loading: false,
});

// Helper functions
const getScoreColor = (score: number): string => {
  if (score >= 70) return colors.scoreHigh;
  if (score >= 40) return colors.scoreMedium;
  return colors.scoreLow;
};

const getNutriScoreColor = (grade: string): string => {
  const gradeColors: { [key: string]: string } = {
    'A': '#038141', 'B': '#85BB2F', 'C': '#FECB02', 'D': '#EE8100', 'E': '#E63E11',
  };
  return gradeColors[grade.toUpperCase()] || colors.textSecondary;
};

const getAdditiveColor = (risk: string): string => {
  if (risk === 'high') return colors.error;
  if (risk === 'medium') return colors.warning;
  return colors.success;
};

// Main App Component
export default function NutriScanApp() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App state
  const [currentTab, setCurrentTab] = useState<'home' | 'history' | 'search' | 'rankings' | 'profile'>('home');
  const [currentScreen, setCurrentScreen] = useState<'main' | 'scanner' | 'product' | 'auth'>('main');
  
  // Data state
  const [product, setProduct] = useState<Product | null>(null);
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [history, setHistory] = useState<ScanHistory[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [healingFoods, setHealingFoods] = useState<HealingFood[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [productLoading, setProductLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [selectedAdditive, setSelectedAdditive] = useState<Additive | null>(null);
  const [showAdditiveModal, setShowAdditiveModal] = useState(false);
  const [selectedHealingFood, setSelectedHealingFood] = useState<HealingFood | null>(null);
  const [showHealingFoodModal, setShowHealingFoodModal] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const [authError, setAuthError] = useState<string | null>(null);

  // Auth functions
  const loadAuthState = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('auth_token');
      const savedUser = await AsyncStorage.getItem('auth_user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.log('Error loading auth state:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { token: newToken, user: newUser } = response.data;
      await AsyncStorage.setItem('auth_token', newToken);
      await AsyncStorage.setItem('auth_user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      setCurrentScreen('main');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Connexion échouée';
      setAuthError(message);
      console.log('Login error:', message);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      console.log('Registering:', email, name);
      const response = await axios.post(`${API_URL}/auth/register`, { email, password, name });
      console.log('Registration response:', response.data);
      const { token: newToken, user: newUser } = response.data;
      await AsyncStorage.setItem('auth_token', newToken);
      await AsyncStorage.setItem('auth_user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      setCurrentScreen('main');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Inscription échouée';
      setAuthError(message);
      console.log('Register error:', message);
    } finally {
      setLoading(false);
    }
  };

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const loginWithGoogle = async () => {
    try {
      const authUrl = 'https://auth.emergentagent.com/';
      
      if (Platform.OS === 'web') {
        // On web, redirect directly
        const redirectUrl = window.location.origin + '/';
        window.location.href = `${authUrl}?redirect=${encodeURIComponent(redirectUrl)}`;
      } else {
        // On mobile (iOS/Android), use WebBrowser
        const result = await WebBrowser.openAuthSessionAsync(
          authUrl,
          'nutriscan://'  // Your app's URL scheme
        );
        
        if (result.type === 'success' && result.url) {
          // Extract session_id from URL
          const url = new URL(result.url);
          const sessionId = url.searchParams.get('session_id');
          
          if (sessionId) {
            // Process the session
            const response = await axios.post(`${API_URL}/auth/session`, { session_id: sessionId });
            const userData = response.data;
            
            await AsyncStorage.setItem('auth_user', JSON.stringify(userData));
            setUser(userData);
            setCurrentScreen('main');
          }
        }
      }
    } catch (error) {
      console.log('Google login error:', error);
      setAuthError('Erreur lors de la connexion Google');
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/auth/logout`);
    } catch (error) {}
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
  };

  // Data fetching
  const fetchHistory = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API_URL}/history`, { headers });
      setHistory(response.data);
    } catch (error) {
      console.log('Error fetching history:', error);
    }
  };

  const fetchRankings = async () => {
    try {
      const response = await axios.get(`${API_URL}/rankings/all`);
      setRankings(response.data);
    } catch (error) {
      console.log('Error fetching rankings:', error);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API_URL}/recommendations`, { headers });
      setRecommendations(response.data);
    } catch (error) {
      console.log('Error fetching recommendations:', error);
    }
  };

  const fetchHealingFoods = async () => {
    try {
      const response = await axios.get(`${API_URL}/healing-foods`);
      setHealingFoods(response.data);
    } catch (error) {
      console.log('Error fetching healing foods:', error);
    }
  };

  const searchProducts = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/search`, { params: { q: query } });
      setSearchResults(response.data.products || []);
    } catch (error) {
      console.log('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  // Track if we're currently fetching a product to prevent duplicate calls
  const [isFetching, setIsFetching] = useState(false);

  const fetchProduct = async (barcode: string) => {
    // Prevent multiple simultaneous fetches
    if (isFetching) {
      console.log('fetchProduct ignored - already fetching');
      return;
    }
    
    console.log('fetchProduct called with barcode:', barcode);
    
    // Set states immediately
    setIsFetching(true);
    setProduct(null);
    setAlternatives([]);
    setProductLoading(true);
    setCurrentScreen('product');
    
    try {
      console.log('Making API request...');
      const response = await axios.get(`${API_URL}/product/${barcode}`, { timeout: 15000 });
      console.log('API response received');
      const productData = response.data;
      console.log('Product data found:', productData.found, 'score:', productData.health_score);
      
      // Batch state updates
      setProduct(productData);
      setProductLoading(false);
      setIsFetching(false);
      console.log('States updated');
      
      if (productData.found) {
        // Save to history in background (only once)
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        axios.post(`${API_URL}/history`, {
          barcode: productData.barcode,
          product_name: productData.name || 'Produit inconnu',
          brand: productData.brand || '',
          image_url: productData.image_url || '',
          health_score: productData.health_score,
          nutri_score: productData.nutri_score,
        }, { headers }).catch((err) => console.log('History save error:', err));

        // Fetch alternatives in background if score is below 70
        if (productData.health_score < 70) {
          axios.get(`${API_URL}/alternatives/${barcode}`)
            .then(altResponse => setAlternatives(altResponse.data || []))
            .catch(() => setAlternatives([]));
        }
        
        // Refresh history in background
        fetchHistory();
      }
      
    } catch (error: any) {
      console.log('Error fetching product:', error?.message || error);
      setProduct(null);
      setProductLoading(false);
      setIsFetching(false);
      setCurrentScreen('main');
    }
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    // Double protection against multiple scans
    if (scanned) {
      console.log('Scan ignored - already scanned');
      return;
    }
    
    // Set scanned immediately to prevent any additional scans
    setScanned(true);
    
    console.log('Barcode scanned:', data);
    
    // Small delay to ensure state is set before proceeding
    setTimeout(() => {
      fetchProduct(data);
    }, 100);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchHistory(), fetchRankings(), fetchRecommendations(), fetchHealingFoods()]);
    setRefreshing(false);
  }, []);

  // Effects
  useEffect(() => {
    loadAuthState();
    fetchHistory();
    fetchRankings();
    fetchHealingFoods();
  }, []);

  useEffect(() => {
    if (user) {
      fetchRecommendations();
    }
  }, [user]);

  // Navigation
  const openScanner = () => {
    setScanned(false);
    setCurrentScreen('scanner');
  };

  const goHome = () => {
    setCurrentScreen('main');
    setProduct(null);
    setAlternatives([]);
    setScanned(false);
  };

  // Additive Modal
  const openAdditiveModal = async (additive: Additive) => {
    try {
      const response = await axios.get(`${API_URL}/additive/${additive.code}`);
      setSelectedAdditive(response.data);
      setShowAdditiveModal(true);
    } catch (error) {
      setSelectedAdditive(additive);
      setShowAdditiveModal(true);
    }
  };

  // Auth form state
  const [isLogin, setIsLogin] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');

  // Auth Screen
  const renderAuthScreen = () => {
    const validateForm = () => {
      if (!isLogin && !authName.trim()) {
        setAuthError('Le nom est requis');
        return false;
      }
      if (!authEmail.trim()) {
        setAuthError('L\'email est requis');
        return false;
      }
      if (!authEmail.includes('@')) {
        setAuthError('Veuillez entrer un email valide');
        return false;
      }
      if (!authPassword || authPassword.length < 6) {
        setAuthError('Le mot de passe doit contenir au moins 6 caractères');
        return false;
      }
      return true;
    };

    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView contentContainerStyle={styles.authContainer}>
          <View style={styles.authHeader}>
            <TouchableOpacity onPress={goHome} style={styles.authBackButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Ionicons name="leaf" size={60} color={colors.primary} />
            <Text style={styles.authTitle}>NutriScan</Text>
            <Text style={styles.authSubtitle}>{isLogin ? 'Connexion à votre compte' : 'Créer un nouveau compte'}</Text>
          </View>

          <View style={styles.authForm}>
            {!isLogin && (
              <>
                <Text style={styles.inputLabel}>Nom complet <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Jean Dupont"
                  value={authName}
                  onChangeText={setAuthName}
                  autoCapitalize="words"
                />
              </>
            )}
            
            <Text style={styles.inputLabel}>Adresse email <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: jean@exemple.com"
              value={authEmail}
              onChangeText={setAuthEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <Text style={styles.inputLabel}>Mot de passe <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Minimum 6 caractères"
              value={authPassword}
              onChangeText={setAuthPassword}
              secureTextEntry
            />

            {authError && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.authButton, loading && styles.authButtonDisabled]}
              onPress={() => {
                setAuthError(null);
                if (validateForm()) {
                  isLogin ? login(authEmail, authPassword) : register(authEmail, authPassword, authName);
                }
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.authButtonText}>{isLogin ? 'Se connecter' : "Créer mon compte"}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.googleButton} onPress={loginWithGoogle}>
              <Ionicons name="logo-google" size={20} color="#FFF" />
              <Text style={styles.googleButtonText}>Continuer avec Google</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchAuth}>
              <Text style={styles.switchAuthText}>
                {isLogin ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  // Tab Bar
  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {[
        { key: 'home', icon: 'home', label: 'Accueil' },
        { key: 'history', icon: 'time', label: 'Historique' },
        { key: 'search', icon: 'search', label: 'Recherche' },
        { key: 'rankings', icon: 'trophy', label: 'Classement' },
        { key: 'profile', icon: 'person', label: 'Profil' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={styles.tabItem}
          onPress={() => setCurrentTab(tab.key as any)}
        >
          <Ionicons
            name={(tab.icon + (currentTab === tab.key ? '' : '-outline')) as any}
            size={24}
            color={currentTab === tab.key ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabLabel, currentTab === tab.key && styles.tabLabelActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Home Tab
  const renderHomeTab = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* Hero */}
      <View style={styles.heroSection}>
        <View style={styles.logoContainer}>
          <Ionicons name="leaf" size={48} color={colors.primary} />
        </View>
        <Text style={styles.title}>NutriScan</Text>
        <Text style={styles.subtitle}>Scannez. Analysez. Mangez mieux.</Text>
      </View>

      {/* Scan Button */}
      <TouchableOpacity style={styles.scanButton} onPress={openScanner} activeOpacity={0.8}>
        <View style={styles.scanButtonInner}>
          <Ionicons name="barcode-outline" size={32} color="#FFF" />
          <Text style={styles.scanButtonText}>Scanner un produit</Text>
        </View>
      </TouchableOpacity>

      {/* Recent Scans */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Scans récents</Text>
        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>Aucun scan récent</Text>
          </View>
        ) : (
          history.slice(0, 5).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.historyItem}
              onPress={() => fetchProduct(item.barcode)}
            >
              <View style={styles.historyImageContainer}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.historyImage} />
                ) : (
                  <Ionicons name="cube-outline" size={30} color={colors.textSecondary} />
                )}
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyName} numberOfLines={1}>{item.product_name}</Text>
                <Text style={styles.historyBrand} numberOfLines={1}>{item.brand || 'Marque inconnue'}</Text>
              </View>
              <View style={[styles.historyScore, { backgroundColor: getScoreColor(item.health_score) }]}>
                <Text style={styles.historyScoreText}>{item.health_score}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Recommandations pour vous</Text>
          <Text style={styles.sectionSubtitle}>Alternatives plus saines à vos produits habituels</Text>
          {recommendations.slice(0, 3).map((rec, index) => (
            <TouchableOpacity key={index} style={styles.recommendationItem} onPress={() => fetchProduct(rec.barcode)}>
              <View style={styles.recommendationImageContainer}>
                {rec.image_url ? (
                  <Image source={{ uri: rec.image_url }} style={styles.recommendationImage} />
                ) : (
                  <Ionicons name="leaf" size={24} color={colors.primary} />
                )}
              </View>
              <View style={styles.recommendationInfo}>
                <Text style={styles.recommendationName} numberOfLines={1}>{rec.name}</Text>
                <Text style={styles.recommendationReplaces} numberOfLines={1}>Remplace: {rec.replaces}</Text>
              </View>
              <View style={[styles.recommendationScore, { backgroundColor: getScoreColor(rec.health_score) }]}>
                <Text style={styles.recommendationScoreText}>{rec.health_score}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Healing Foods */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Aliments naturels bienfaisants</Text>
        </View>
        <Text style={styles.sectionSubtitle}>Aliments validés par la science pour votre santé</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.healingFoodsScroll}>
          {healingFoods.map((food, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.healingFoodCard}
              onPress={() => {
                setSelectedHealingFood(food);
                setShowHealingFoodModal(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.healingFoodEmoji}>{food.image}</Text>
              <Text style={styles.healingFoodName}>{food.name}</Text>
              <Text style={styles.healingFoodBenefit} numberOfLines={2}>{food.benefits.slice(0, 2).join(', ')}</Text>
              <View style={styles.healingFoodTapHint}>
                <Text style={styles.healingFoodTapText}>Voir plus</Text>
                <Ionicons name="chevron-forward" size={12} color={colors.primary} />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );

  // History Tab
  const renderHistoryTab = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.pageTitle}>Historique des scans</Text>
      {history.length === 0 ? (
        <View style={styles.emptyStateLarge}>
          <Ionicons name="time-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyStateTitle}>Aucun historique</Text>
          <Text style={styles.emptyStateSubtext}>Scannez des produits pour les voir ici</Text>
        </View>
      ) : (
        history.map((item) => (
          <TouchableOpacity key={item.id} style={styles.historyItemLarge} onPress={() => fetchProduct(item.barcode)}>
            <View style={styles.historyImageContainerLarge}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.historyImageLarge} />
              ) : (
                <Ionicons name="cube-outline" size={40} color={colors.textSecondary} />
              )}
            </View>
            <View style={styles.historyInfoLarge}>
              <Text style={styles.historyNameLarge} numberOfLines={1}>{item.product_name}</Text>
              <Text style={styles.historyBrandLarge} numberOfLines={1}>{item.brand || 'Marque inconnue'}</Text>
              <Text style={styles.historyDate}>{new Date(item.timestamp).toLocaleDateString('fr-FR')}</Text>
            </View>
            <View style={[styles.historyScoreLarge, { backgroundColor: getScoreColor(item.health_score) }]}>
              <Text style={styles.historyScoreTextLarge}>{item.health_score}</Text>
              <Text style={styles.historyScoreLabel}>/100</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );

  // Search Tab
  const renderSearchTab = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un produit..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => searchProducts(searchQuery)}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : searchResults.length === 0 ? (
        <View style={styles.emptyStateLarge}>
          <Ionicons name="search-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyStateTitle}>Rechercher un aliment</Text>
          <Text style={styles.emptyStateSubtext}>Tapez le nom d'un produit pour le trouver</Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item, index) => item.barcode || index.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.searchResultItem} onPress={() => fetchProduct(item.barcode)}>
              <View style={styles.searchResultImageContainer}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.searchResultImage} />
                ) : (
                  <Ionicons name="cube-outline" size={30} color={colors.textSecondary} />
                )}
              </View>
              <View style={styles.searchResultInfo}>
                <Text style={styles.searchResultName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.searchResultBrand} numberOfLines={1}>{item.brand || 'Marque inconnue'}</Text>
              </View>
              <View style={[styles.searchResultScore, { backgroundColor: getScoreColor(item.health_score) }]}>
                <Text style={styles.searchResultScoreText}>{item.health_score}</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      )}
    </View>
  );

  // Rankings Tab
  const renderRankingsTab = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.pageTitle}>Classement Santé</Text>
      <Text style={styles.pageSubtitle}>Les meilleurs produits pour votre santé</Text>

      {rankings.length === 0 ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        rankings.map((item, index) => (
          <TouchableOpacity key={index} style={styles.rankingItem} onPress={() => fetchProduct(item.barcode)}>
            <View style={styles.rankingPosition}>
              <Text style={styles.rankingPositionText}>{index + 1}</Text>
            </View>
            <View style={styles.rankingImageContainer}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.rankingImage} />
              ) : (
                <Ionicons name="trophy" size={24} color={colors.primary} />
              )}
            </View>
            <View style={styles.rankingInfo}>
              <Text style={styles.rankingName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.rankingBrand} numberOfLines={1}>{item.brand || 'Marque inconnue'}</Text>
            </View>
            <View style={[styles.rankingScore, { backgroundColor: getScoreColor(item.health_score) }]}>
              <Text style={styles.rankingScoreText}>{item.health_score}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );

  // Profile Tab
  const renderProfileTab = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.pageTitle}>Mon Profil</Text>

      {!user ? (
        <View style={styles.notLoggedIn}>
          <Ionicons name="person-circle-outline" size={80} color={colors.textSecondary} />
          <Text style={styles.notLoggedInTitle}>Connectez-vous</Text>
          <Text style={styles.notLoggedInText}>Accédez à vos menus personnalisés et recommandations</Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => setCurrentScreen('auth')}>
            <Text style={styles.loginButtonText}>Se connecter / S'inscrire</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.profileContent}>
          <View style={styles.profileHeader}>
            {user.picture ? (
              <Image source={{ uri: user.picture }} style={styles.profilePicture} />
            ) : (
              <View style={styles.profilePictureAlt}>
                <Text style={styles.profileInitial}>{user.name?.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.profileName}>{user.name}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
            <View style={[styles.subscriptionBadge, user.subscription_type === 'premium' && styles.subscriptionBadgePremium]}>
              <Ionicons name={user.subscription_type === 'premium' ? 'star' : 'person'} size={14} color={user.subscription_type === 'premium' ? colors.premium : colors.textSecondary} />
              <Text style={[styles.subscriptionText, user.subscription_type === 'premium' && styles.subscriptionTextPremium]}>
                {user.subscription_type === 'premium' ? 'Premium' : 'Gratuit'}
              </Text>
            </View>
          </View>

          {user.subscription_type !== 'premium' && (
            <View style={styles.premiumPromo}>
              <View style={styles.premiumPromoHeader}>
                <Ionicons name="star" size={24} color={colors.premium} />
                <Text style={styles.premiumPromoTitle}>Passez à Premium</Text>
              </View>
              <Text style={styles.premiumPromoText}>
                • Menus hebdomadaires personnalisés{'\n'}
                • Recommandations avancées{'\n'}
                • Aliments curatifs détaillés{'\n'}
                • Support prioritaire
              </Text>
              <TouchableOpacity style={styles.premiumButton}>
                <Text style={styles.premiumButtonText}>Activer Premium</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.logoutButtonText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  // Scanner Screen
  const renderScannerScreen = () => {
    if (!permission) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.centered}>
          <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.permissionText}>Accès caméra requis</Text>
          <Text style={styles.permissionSubtext}>Autorisez l'accès à la caméra pour scanner les codes-barres</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Autoriser</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={goHome}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.scannerContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'] }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerOverlayTop} />
          <View style={styles.scannerOverlayMiddle}>
            <View style={styles.scannerOverlaySide} />
            <View style={styles.scannerFrame}>
              <View style={[styles.scannerCorner, styles.scannerCornerTL]} />
              <View style={[styles.scannerCorner, styles.scannerCornerTR]} />
              <View style={[styles.scannerCorner, styles.scannerCornerBL]} />
              <View style={[styles.scannerCorner, styles.scannerCornerBR]} />
            </View>
            <View style={styles.scannerOverlaySide} />
          </View>
          <View style={styles.scannerOverlayBottom}>
            <Text style={styles.scannerHint}>Positionnez le code-barres dans le cadre</Text>
          </View>
        </View>
        {loading && (
          <View style={styles.scannerLoading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.scannerLoadingText}>Analyse en cours...</Text>
          </View>
        )}
        <TouchableOpacity style={styles.closeButton} onPress={goHome}>
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>
    );
  };

  // Product Screen (shortened for space - includes all original functionality)
  const renderProductScreen = () => {
    if (productLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      );
    }

    if (!product || !product.found) {
      return (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.notFoundTitle}>Produit non trouvé</Text>
          <Text style={styles.notFoundText}>Ce produit n'est pas dans notre base de données.</Text>
          <TouchableOpacity style={styles.scanAgainButton} onPress={openScanner}>
            <Text style={styles.scanAgainButtonText}>Scanner un autre produit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={goHome}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.productScrollContent}
        showsVerticalScrollIndicator={true}
        bounces={true}
        nestedScrollEnabled={true}
      >
        {/* Header */}
        <View style={styles.productHeader}>
          <TouchableOpacity style={styles.productBackButton} onPress={goHome}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.productHeaderTitle}>Détails produit</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Product Info */}
        <View style={styles.productCard}>
          <View style={styles.productInfoRow}>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={styles.productImage} />
            ) : (
              <View style={styles.productImagePlaceholder}>
                <Ionicons name="cube-outline" size={50} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.productTextInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productBrand}>{product.brand}</Text>
            </View>
          </View>
        </View>

        {/* Health Score */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreTitle}>Score Santé</Text>
          <View style={[styles.scoreCircle, { borderColor: getScoreColor(product.health_score) }]}>
            <Text style={[styles.scoreValue, { color: getScoreColor(product.health_score) }]}>{product.health_score}</Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
          <Text style={styles.scoreDescription}>
            {product.health_score >= 70 ? 'Excellent choix !' : product.health_score >= 40 ? 'Modéré - Considérez des alternatives' : 'Faible - Cherchez mieux'}
          </Text>
        </View>

        {/* Pro Tip */}
        <View style={styles.proTipCard}>
          <View style={styles.proTipHeader}>
            <Ionicons name="bulb-outline" size={20} color={colors.primary} />
            <Text style={styles.proTipTitle}>Conseil</Text>
          </View>
          <Text style={styles.proTipText}>{product.pro_tip}</Text>
        </View>

        {/* Nutri-Score & NOVA */}
        <View style={styles.badgesRow}>
          {product.nutri_score && (
            <View style={styles.badgeCard}>
              <Text style={styles.badgeLabel}>Nutri-Score</Text>
              <View style={[styles.nutriScoreBadge, { backgroundColor: getNutriScoreColor(product.nutri_score) }]}>
                <Text style={styles.nutriScoreText}>{product.nutri_score}</Text>
              </View>
            </View>
          )}
          {product.nova_group > 0 && (
            <View style={styles.badgeCard}>
              <Text style={styles.badgeLabel}>NOVA</Text>
              <View style={styles.novaBadge}>
                <Text style={styles.novaText}>{product.nova_group}</Text>
              </View>
              <Text style={styles.novaDescription}>
                {product.nova_group === 1 ? 'Non transformé' : product.nova_group === 2 ? 'Peu transformé' : product.nova_group === 3 ? 'Transformé' : 'Ultra-transformé'}
              </Text>
            </View>
          )}
        </View>

        {/* Health Risks */}
        {product.health_risks?.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderWithIcon}>
              <Ionicons name="warning-outline" size={20} color={colors.error} />
              <Text style={styles.sectionCardTitleDanger}>Risques pour la Santé</Text>
            </View>
            {product.health_risks.map((risk, index) => (
              <View key={index} style={[styles.riskItem, { borderLeftColor: risk.severity === 'high' ? colors.error : risk.severity === 'medium' ? colors.warning : colors.success }]}>
                <Text style={[styles.riskTitle, { color: risk.severity === 'high' ? colors.error : risk.severity === 'medium' ? colors.warning : colors.text }]}>{risk.title}</Text>
                <Text style={styles.riskDescription}>{risk.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Additives - CLICKABLE */}
        {product.additives?.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionCardTitle}>Additifs</Text>
            {product.additives.map((additive, index) => (
              <TouchableOpacity key={index} style={styles.additiveItem} onPress={() => openAdditiveModal(additive)}>
                <View style={[styles.additiveIndicator, { backgroundColor: getAdditiveColor(additive.risk) }]} />
                <View style={styles.additiveInfo}>
                  <Text style={styles.additiveCode}>{additive.code}</Text>
                  <Text style={styles.additiveName}>{additive.name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Allergens */}
        {product.allergens?.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderWithIcon}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
              <Text style={styles.sectionCardTitleWarning}>Allergènes</Text>
            </View>
            <View style={styles.allergensContainer}>
              {product.allergens.map((allergen, index) => (
                <View key={index} style={styles.allergenBadge}>
                  <Text style={styles.allergenText}>{allergen}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Ingredients */}
        {product.ingredients_text && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionCardTitle}>Ingrédients</Text>
            <View style={styles.dietaryBadgesContainer}>
              {product.is_vegan && <View style={styles.dietaryBadge}><Ionicons name="leaf" size={14} color={colors.success} /><Text style={styles.dietaryBadgeText}>Vegan</Text></View>}
              {product.is_vegetarian && !product.is_vegan && <View style={styles.dietaryBadge}><Text style={styles.dietaryBadgeText}>Végétarien</Text></View>}
              {!product.is_palm_oil_free && <View style={[styles.dietaryBadge, { backgroundColor: '#FFF3E0' }]}><Text style={[styles.dietaryBadgeText, { color: colors.warning }]}>Huile de palme</Text></View>}
            </View>
            <Text style={styles.ingredientsText}>{product.ingredients_text}</Text>
          </View>
        )}

        {/* Alternatives */}
        {alternatives.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionCardTitle}>Alternatives plus saines</Text>
            {alternatives.map((alt, index) => (
              <TouchableOpacity key={index} style={styles.alternativeItem} onPress={() => fetchProduct(alt.barcode)}>
                <View style={styles.alternativeImageContainer}>
                  {alt.image_url ? <Image source={{ uri: alt.image_url }} style={styles.alternativeImage} /> : <Ionicons name="leaf" size={24} color={colors.primary} />}
                </View>
                <View style={styles.alternativeInfo}>
                  <Text style={styles.alternativeName} numberOfLines={1}>{alt.name}</Text>
                  <Text style={styles.alternativeBrand} numberOfLines={1}>{alt.brand}</Text>
                </View>
                <View style={[styles.alternativeScore, { backgroundColor: getScoreColor(alt.health_score) }]}>
                  <Text style={styles.alternativeScoreText}>{alt.health_score}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.scanAnotherButton} onPress={openScanner}>
          <Ionicons name="barcode-outline" size={24} color="#FFF" />
          <Text style={styles.scanAnotherButtonText}>Scanner un autre produit</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // Additive Modal
  const renderAdditiveModal = () => (
    <Modal visible={showAdditiveModal} transparent animationType="slide" onRequestClose={() => setShowAdditiveModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedAdditive?.code}</Text>
            <TouchableOpacity onPress={() => setShowAdditiveModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.additiveTitleModal}>{selectedAdditive?.name}</Text>
            <View style={[styles.riskBadgeModal, { backgroundColor: getAdditiveColor(selectedAdditive?.risk || 'low') }]}>
              <Text style={styles.riskBadgeText}>Risque {selectedAdditive?.risk === 'high' ? 'élevé' : selectedAdditive?.risk === 'medium' ? 'modéré' : 'faible'}</Text>
            </View>
            <Text style={styles.additiveDetailsTitle}>Description</Text>
            <Text style={styles.additiveDetails}>{selectedAdditive?.details || selectedAdditive?.description}</Text>
            <Text style={styles.additiveDetailsTitle}>Dose journalière admissible</Text>
            <Text style={styles.additiveDetails}>{selectedAdditive?.daily_limit || 'Non établie'}</Text>
            {selectedAdditive?.sources && selectedAdditive.sources.length > 0 && (
              <>
                <Text style={styles.additiveDetailsTitle}>Sources</Text>
                <Text style={styles.additiveDetails}>{selectedAdditive.sources.join(', ')}</Text>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Healing Food Modal
  const renderHealingFoodModal = () => (
    <Modal visible={showHealingFoodModal} transparent animationType="slide" onRequestClose={() => setShowHealingFoodModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.healingFoodModalTitleContainer}>
              <Text style={styles.healingFoodModalEmoji}>{selectedHealingFood?.image}</Text>
              <Text style={styles.modalTitle}>{selectedHealingFood?.name}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowHealingFoodModal(false)} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Benefits Section */}
            <View style={styles.healingFoodSection}>
              <View style={styles.healingFoodSectionHeader}>
                <Ionicons name="heart" size={20} color={colors.primary} />
                <Text style={styles.healingFoodSectionTitle}>Bienfaits</Text>
              </View>
              <View style={styles.healingFoodTagsContainer}>
                {selectedHealingFood?.benefits.map((benefit, index) => (
                  <View key={index} style={styles.healingFoodBenefitTag}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={styles.healingFoodBenefitText}>{benefit}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Conditions Section */}
            <View style={styles.healingFoodSection}>
              <View style={styles.healingFoodSectionHeader}>
                <Ionicons name="medkit" size={20} color={colors.warning} />
                <Text style={styles.healingFoodSectionTitle}>Peut aider pour</Text>
              </View>
              <View style={styles.healingFoodTagsContainer}>
                {selectedHealingFood?.conditions.map((condition, index) => (
                  <View key={index} style={styles.healingFoodConditionTag}>
                    <Text style={styles.healingFoodConditionText}>{condition}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Source Section */}
            <View style={styles.healingFoodSourceSection}>
              <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.healingFoodSourceText}>Source: {selectedHealingFood?.source}</Text>
            </View>

            {/* Disclaimer */}
            <View style={styles.healingFoodDisclaimer}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.healingFoodDisclaimerText}>
                Ces informations sont basées sur des études scientifiques et ne remplacent pas un avis médical professionnel.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Loading state
  if (authLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {currentScreen === 'auth' && renderAuthScreen()}
      {currentScreen === 'scanner' && renderScannerScreen()}
      {currentScreen === 'product' && renderProductScreen()}
      {currentScreen === 'main' && (
        <View style={styles.mainContainer}>
          {currentTab === 'home' && renderHomeTab()}
          {currentTab === 'history' && renderHistoryTab()}
          {currentTab === 'search' && renderSearchTab()}
          {currentTab === 'rankings' && renderRankingsTab()}
          {currentTab === 'profile' && renderProfileTab()}
          {renderTabBar()}
        </View>
      )}
      
      {renderAdditiveModal()}
      {renderHealingFoodModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mainContainer: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  productScrollContent: { paddingBottom: 40, flexGrow: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },

  // Tab Bar
  tabBar: { flexDirection: 'row', backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: colors.surface, paddingBottom: Platform.OS === 'ios' ? 20 : 8, paddingTop: 8 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  tabLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  tabLabelActive: { color: colors.primary, fontWeight: '600' },

  // Hero
  heroSection: { alignItems: 'center', marginBottom: 24, paddingTop: 16 },
  logoContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textSecondary },

  // Scan Button
  scanButton: { marginBottom: 24 },
  scanButtonInner: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  scanButtonText: { color: '#FFF', fontSize: 18, fontWeight: '600', marginLeft: 12 },

  // Section
  sectionContainer: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 },
  sectionSubtitle: { fontSize: 12, color: colors.textSecondary, marginBottom: 12, marginTop: -4 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 },
  pageSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 24 },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 32, backgroundColor: colors.surface, borderRadius: 16 },
  emptyStateText: { fontSize: 16, fontWeight: '500', color: colors.textSecondary, marginTop: 12 },
  emptyStateLarge: { alignItems: 'center', paddingVertical: 60 },
  emptyStateTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },

  // History Items
  historyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 8 },
  historyImageContainer: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  historyImage: { width: 48, height: 48, resizeMode: 'contain' },
  historyInfo: { flex: 1, marginLeft: 12 },
  historyName: { fontSize: 14, fontWeight: '500', color: colors.text },
  historyBrand: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  historyScore: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  historyScoreText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  historyItemLarge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
  historyImageContainerLarge: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  historyImageLarge: { width: 60, height: 60, resizeMode: 'contain' },
  historyInfoLarge: { flex: 1, marginLeft: 12 },
  historyNameLarge: { fontSize: 16, fontWeight: '500', color: colors.text },
  historyBrandLarge: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  historyDate: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  historyScoreLarge: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  historyScoreTextLarge: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  historyScoreLabel: { color: '#FFF', fontSize: 10 },

  // Recommendations
  recommendationItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 12, marginBottom: 8 },
  recommendationImageContainer: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  recommendationImage: { width: 44, height: 44, resizeMode: 'contain' },
  recommendationInfo: { flex: 1, marginLeft: 12 },
  recommendationName: { fontSize: 14, fontWeight: '500', color: colors.text },
  recommendationReplaces: { fontSize: 11, color: colors.primary, marginTop: 2 },
  recommendationScore: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  recommendationScoreText: { color: '#FFF', fontWeight: '600', fontSize: 12 },

  // Healing Foods
  healingFoodsScroll: { marginHorizontal: -16, paddingHorizontal: 16 },
  healingFoodCard: { width: 140, backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginRight: 12 },
  healingFoodEmoji: { fontSize: 32, marginBottom: 8 },
  healingFoodName: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 },
  healingFoodBenefit: { fontSize: 11, color: colors.textSecondary, marginBottom: 4 },
  healingFoodSource: { fontSize: 10, color: colors.primary },

  // Premium
  premiumBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  premiumBadgeText: { fontSize: 10, color: colors.premium, fontWeight: '600', marginLeft: 4 },

  // Search
  searchContainer: { flex: 1 },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 12, marginHorizontal: 16, marginVertical: 16, height: 48 },
  searchInput: { flex: 1, fontSize: 16, marginLeft: 8, color: colors.text },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 8 },
  searchResultImageContainer: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  searchResultImage: { width: 48, height: 48, resizeMode: 'contain' },
  searchResultInfo: { flex: 1, marginLeft: 12 },
  searchResultName: { fontSize: 14, fontWeight: '500', color: colors.text },
  searchResultBrand: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  searchResultScore: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  searchResultScoreText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  // Rankings
  rankingItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 8 },
  rankingPosition: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  rankingPositionText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  rankingImageContainer: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginLeft: 12 },
  rankingImage: { width: 44, height: 44, resizeMode: 'contain' },
  rankingInfo: { flex: 1, marginLeft: 12 },
  rankingName: { fontSize: 14, fontWeight: '500', color: colors.text },
  rankingBrand: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rankingScore: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  rankingScoreText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  // Profile
  notLoggedIn: { alignItems: 'center', paddingVertical: 40 },
  notLoggedInTitle: { fontSize: 20, fontWeight: '600', color: colors.text, marginTop: 16 },
  notLoggedInText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
  loginButton: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, marginTop: 24 },
  loginButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  profileContent: { paddingTop: 20 },
  profileHeader: { alignItems: 'center', marginBottom: 32 },
  profilePicture: { width: 80, height: 80, borderRadius: 40 },
  profilePictureAlt: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  profileInitial: { fontSize: 32, fontWeight: '700', color: '#FFF' },
  profileName: { fontSize: 20, fontWeight: '600', color: colors.text, marginTop: 12 },
  profileEmail: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  subscriptionBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginTop: 12 },
  subscriptionBadgePremium: { backgroundColor: '#FFF8E1' },
  subscriptionText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500', marginLeft: 4 },
  subscriptionTextPremium: { color: colors.premium },

  premiumPromo: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 24 },
  premiumPromoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  premiumPromoTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginLeft: 8 },
  premiumPromoText: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  premiumButton: { backgroundColor: colors.premium, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  premiumButtonText: { color: '#000', fontSize: 14, fontWeight: '600' },

  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderWidth: 1, borderColor: colors.error, borderRadius: 12 },
  logoutButtonText: { color: colors.error, fontSize: 14, fontWeight: '500', marginLeft: 8 },

  // Auth
  authContainer: { flexGrow: 1, padding: 24 },
  authHeader: { alignItems: 'center', marginBottom: 40, marginTop: 40 },
  authBackButton: { position: 'absolute', left: 0, top: 0 },
  authTitle: { fontSize: 28, fontWeight: '700', color: colors.text, marginTop: 16 },
  authSubtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 8 },
  authForm: { width: '100%' },
  input: { backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 12 },
  authButton: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  authButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.surface },
  dividerText: { color: colors.textSecondary, paddingHorizontal: 16, fontSize: 14 },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4285F4', paddingVertical: 14, borderRadius: 12 },
  googleButtonText: { color: '#FFF', fontSize: 16, fontWeight: '500', marginLeft: 8 },
  switchAuth: { alignItems: 'center', marginTop: 24 },
  switchAuthText: { color: colors.primary, fontSize: 14 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', padding: 12, borderRadius: 8, marginBottom: 12 },
  errorText: { color: colors.error, fontSize: 14, marginLeft: 8, flex: 1 },

  // Scanner
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scannerOverlay: { ...StyleSheet.absoluteFillObject },
  scannerOverlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  scannerOverlayMiddle: { flexDirection: 'row' },
  scannerOverlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  scannerFrame: { width: 280, height: 180, position: 'relative' },
  scannerCorner: { position: 'absolute', width: 30, height: 30, borderColor: colors.primary },
  scannerCornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  scannerCornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  scannerCornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  scannerCornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  scannerOverlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-start', alignItems: 'center', paddingTop: 30 },
  scannerHint: { color: '#FFF', fontSize: 16 },
  scannerLoading: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  scannerLoadingText: { color: '#FFF', fontSize: 16, marginTop: 16 },
  closeButton: { position: 'absolute', top: 50, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },

  // Permission
  permissionText: { fontSize: 20, fontWeight: '600', color: colors.text, marginTop: 16 },
  permissionSubtext: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
  permissionButton: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, marginTop: 24 },
  permissionButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  backButton: { marginTop: 16, paddingVertical: 10 },
  backButtonText: { color: colors.primary, fontSize: 16 },

  // Product
  productHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surface },
  productBackButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  productHeaderTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  productCard: { backgroundColor: '#FFF', padding: 20, margin: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  productInfoRow: { flexDirection: 'row', alignItems: 'center' },
  productImage: { width: 80, height: 80, borderRadius: 12, resizeMode: 'contain', backgroundColor: colors.surface },
  productImagePlaceholder: { width: 80, height: 80, borderRadius: 12, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  productTextInfo: { flex: 1, marginLeft: 16 },
  productName: { fontSize: 18, fontWeight: '600', color: colors.text },
  productBrand: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },

  // Score
  scoreCard: { backgroundColor: '#FFF', padding: 24, marginHorizontal: 16, marginBottom: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  scoreTitle: { fontSize: 16, fontWeight: '500', color: colors.textSecondary, marginBottom: 16 },
  scoreCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
  scoreValue: { fontSize: 36, fontWeight: '700' },
  scoreMax: { fontSize: 14, color: colors.textSecondary },
  scoreDescription: { fontSize: 16, color: colors.text, marginTop: 16, fontWeight: '500' },

  // Pro Tip
  proTipCard: { backgroundColor: colors.surfaceAlt, padding: 16, marginHorizontal: 16, marginBottom: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: colors.primary },
  proTipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  proTipTitle: { fontSize: 14, fontWeight: '600', color: colors.primary, marginLeft: 8 },
  proTipText: { fontSize: 14, color: colors.text, lineHeight: 20 },

  // Badges
  badgesRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16 },
  badgeCard: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 12, alignItems: 'center', marginHorizontal: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  badgeLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  nutriScoreBadge: { width: 48, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  nutriScoreText: { color: '#FFF', fontSize: 24, fontWeight: '700' },
  novaBadge: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  novaText: { fontSize: 24, fontWeight: '700', color: colors.text },
  novaDescription: { fontSize: 10, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },

  // Section Card
  sectionCard: { backgroundColor: '#FFF', padding: 20, marginHorizontal: 16, marginBottom: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  sectionCardTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 16 },
  sectionHeaderWithIcon: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionCardTitleDanger: { fontSize: 16, fontWeight: '600', color: colors.error, marginLeft: 8 },
  sectionCardTitleWarning: { fontSize: 16, fontWeight: '600', color: colors.warning, marginLeft: 8 },

  // Risks
  riskItem: { backgroundColor: '#FFF5F5', padding: 14, borderRadius: 10, marginBottom: 10, borderLeftWidth: 4 },
  riskTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  riskDescription: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

  // Additives
  additiveItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surface },
  additiveIndicator: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  additiveInfo: { flex: 1 },
  additiveCode: { fontSize: 14, fontWeight: '600', color: colors.text },
  additiveName: { fontSize: 13, color: colors.textSecondary },

  // Allergens
  allergensContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  allergenBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.warning },
  allergenText: { fontSize: 12, fontWeight: '500', color: colors.warning },

  // Ingredients
  dietaryBadgesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  dietaryBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  dietaryBadgeText: { fontSize: 12, fontWeight: '500', color: colors.success, marginLeft: 4 },
  ingredientsText: { fontSize: 14, color: colors.text, lineHeight: 22, backgroundColor: colors.surface, padding: 12, borderRadius: 8 },

  // Alternatives
  alternativeItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surface },
  alternativeImageContainer: { width: 44, height: 44, borderRadius: 8, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  alternativeImage: { width: 44, height: 44, resizeMode: 'contain' },
  alternativeInfo: { flex: 1, marginLeft: 12 },
  alternativeName: { fontSize: 14, fontWeight: '500', color: colors.text },
  alternativeBrand: { fontSize: 12, color: colors.textSecondary },
  alternativeScore: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  alternativeScoreText: { color: '#FFF', fontWeight: '600', fontSize: 12 },

  // Buttons
  scanAnotherButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, marginHorizontal: 16, marginVertical: 20, paddingVertical: 16, borderRadius: 12 },
  scanAnotherButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  loadingText: { fontSize: 16, color: colors.textSecondary, marginTop: 16 },
  notFoundTitle: { fontSize: 20, fontWeight: '600', color: colors.text, marginTop: 16 },
  notFoundText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
  scanAgainButton: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, marginTop: 24 },
  scanAgainButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.surface },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  modalBody: { padding: 20 },
  modalCloseButton: { padding: 4 },
  additiveTitleModal: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 },
  riskBadgeModal: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 20 },
  riskBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  additiveDetailsTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 16, marginBottom: 8 },
  additiveDetails: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },

  // Healing Food Modal
  healingFoodModalTitleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  healingFoodModalEmoji: { fontSize: 28, marginRight: 12 },
  healingFoodSection: { marginBottom: 24 },
  healingFoodSectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  healingFoodSectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginLeft: 8 },
  healingFoodTagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  healingFoodBenefitTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  healingFoodBenefitText: { fontSize: 14, color: colors.text, marginLeft: 6, fontWeight: '500' },
  healingFoodConditionTag: { backgroundColor: '#FFF3E0', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.warning },
  healingFoodConditionText: { fontSize: 14, color: colors.warning, fontWeight: '500' },
  healingFoodSourceSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.surface },
  healingFoodSourceText: { fontSize: 13, color: colors.textSecondary, marginLeft: 8, fontStyle: 'italic' },
  healingFoodDisclaimer: { flexDirection: 'row', backgroundColor: colors.surface, padding: 12, borderRadius: 12, marginBottom: 20 },
  healingFoodDisclaimerText: { fontSize: 12, color: colors.textSecondary, marginLeft: 8, flex: 1, lineHeight: 18 },
  healingFoodTapHint: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  healingFoodTapText: { fontSize: 11, color: colors.primary, fontWeight: '500' },
});
