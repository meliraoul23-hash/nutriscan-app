// API Service for NutriScan
import axios from 'axios';
import Constants from 'expo-constants';
import { Product, ScanHistory, HealingFood, HealthGoal, Exercise, WeeklyMenu } from '../types';

// API URL configuration
const getApiUrl = () => {
  const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL 
    || process.env.EXPO_PUBLIC_BACKEND_URL 
    || '';
  return `${backendUrl}/api`;
};

export const API_URL = getApiUrl();

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Increased to 30 seconds for reliability
});

// Product APIs
export const fetchProductAPI = async (barcode: string): Promise<Product> => {
  const response = await api.get(`/product/${barcode}`);
  return response.data;
};

export const searchProductsAPI = async (query: string, page: number = 1): Promise<{ products: any[], count: number }> => {
  const response = await api.get('/search', { params: { q: query, page } });
  return response.data;
};

export const findBetterAlternativesAPI = async (barcode: string): Promise<any[]> => {
  try {
    const response = await api.get(`/alternatives/${barcode}`, { timeout: 15000 });
    return response.data || [];
  } catch (error) {
    console.log('Error fetching alternatives:', error);
    return [];
  }
};

// History APIs
export const fetchHistoryAPI = async (token?: string): Promise<ScanHistory[]> => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await api.get('/history', { headers });
  return response.data;
};

export const saveToHistoryAPI = async (data: Partial<ScanHistory>, token?: string): Promise<void> => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  await api.post('/history', data, { headers });
};

// Rankings APIs
export const fetchRankingsAPI = async (): Promise<any[]> => {
  try {
    const response = await api.get('/rankings/all', { timeout: 10000 });
    return response.data;
  } catch (error) {
    // Fallback data
    return [
      { barcode: '1', name: 'Eau minérale', brand: 'Evian', health_score: 95, nutri_score: 'A' },
      { barcode: '2', name: 'Carottes bio', brand: 'Bio', health_score: 92, nutri_score: 'A' },
      { barcode: '3', name: 'Salade verte', brand: 'Bio', health_score: 90, nutri_score: 'A' },
    ];
  }
};

// Healing Foods
export const fetchHealingFoodsAPI = async (): Promise<HealingFood[]> => {
  const response = await api.get('/healing-foods');
  return response.data;
};

// Premium Status
export const checkPremiumStatusAPI = async (email: string): Promise<string> => {
  try {
    const response = await api.get(`/check-premium/${encodeURIComponent(email)}`);
    return response.data.is_premium ? 'premium' : 'free';
  } catch (error) {
    return 'free';
  }
};

// Favorites APIs
export const fetchFavoritesAPI = async (email: string, userId: string): Promise<any[]> => {
  const params = new URLSearchParams({ email, user_id: userId });
  const response = await api.get(`/favorites?${params.toString()}`);
  return response.data;
};

export const addToFavoritesAPI = async (barcode: string, email: string, userId: string): Promise<void> => {
  const params = new URLSearchParams({ email, user_id: userId });
  await api.post(`/favorites/${barcode}?${params.toString()}`);
};

export const removeFromFavoritesAPI = async (barcode: string, email: string, userId: string): Promise<void> => {
  const params = new URLSearchParams({ email, user_id: userId });
  await api.delete(`/favorites/${barcode}?${params.toString()}`);
};

// Health Goals APIs
export const fetchHealthGoalsAPI = async (email: string, userId: string): Promise<HealthGoal[]> => {
  const params = new URLSearchParams({ email, user_id: userId });
  const response = await api.get(`/health-goals?${params.toString()}`);
  return response.data;
};

export const addHealthGoalAPI = async (type: string, name: string, email: string, userId: string): Promise<void> => {
  const params = new URLSearchParams({ email, user_id: userId });
  await api.post(`/health-goals?${params.toString()}`, { type, name });
};

export const removeHealthGoalAPI = async (goalId: string, email: string, userId: string): Promise<void> => {
  const params = new URLSearchParams({ email, user_id: userId });
  await api.delete(`/health-goals/${goalId}?${params.toString()}`);
};

// Exercises APIs
export const fetchExercisesAPI = async (email: string, userId: string): Promise<Exercise[]> => {
  const params = new URLSearchParams({ email, user_id: userId });
  const response = await api.get(`/exercises?${params.toString()}`);
  return response.data.exercises || [];
};

// Menu Generation (Premium)
export const generateMenuAPI = async (email: string, userId: string, familySize: number): Promise<WeeklyMenu> => {
  const params = new URLSearchParams({ email, user_id: userId });
  const response = await api.post(`/generate-menu?${params.toString()}`, { family_size: familySize }, { timeout: 60000 });
  return response.data;
};

// AI Coach (Premium)
export const sendCoachMessageAPI = async (message: string, email: string, userId: string): Promise<string> => {
  const params = new URLSearchParams({ email, user_id: userId });
  const response = await api.post(`/coach?${params.toString()}`, { message });
  return response.data.response;
};

// Recommendations
export const fetchRecommendationsAPI = async (token?: string): Promise<any[]> => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await api.get('/recommendations', { headers });
  return response.data;
};

// Additive Info
export const fetchAdditiveInfoAPI = async (code: string): Promise<any> => {
  const response = await api.get(`/additive/${code}`);
  return response.data;
};

// Stripe Checkout
export const createCheckoutSessionAPI = async (
  plan: string,
  successUrl: string,
  cancelUrl: string,
  email: string,
  userId: string
): Promise<{ checkout_url: string; session_id: string }> => {
  const response = await api.post('/create-checkout-session', {
    plan,
    success_url: successUrl,
    cancel_url: cancelUrl,
    user_email: email,
    user_id: userId,
  });
  return response.data;
};

// Fridge Score (Viral Feature)
export const fetchFridgeScoreAPI = async (email?: string, userId?: string): Promise<any> => {
  const params = new URLSearchParams();
  if (email) params.append('email', email);
  if (userId) params.append('user_id', userId);
  const response = await api.get(`/fridge-score?${params.toString()}`);
  return response.data;
};

// User Dietary Preferences
export const getUserPreferencesAPI = async (email: string): Promise<any> => {
  const response = await api.get(`/user-preferences/${encodeURIComponent(email)}`);
  return response.data;
};

export const saveUserPreferencesAPI = async (email: string, preferences: any): Promise<any> => {
  const response = await api.post('/user-preferences', { email, preferences });
  return response.data;
};

// Offline Cache
export const getOfflineCacheAPI = async (limit: number = 200): Promise<any> => {
  const response = await api.get(`/offline-cache?limit=${limit}`);
  return response.data;
};

// Product with dietary conflict check
export const getProductWithPreferencesAPI = async (barcode: string, email?: string): Promise<any> => {
  const params = email ? `?email=${encodeURIComponent(email)}` : '';
  const response = await api.get(`/product-with-preferences/${barcode}${params}`);
  return response.data;
};

// ============== USER PROFILE & PROGRESS APIs ==============

export interface UserHealthProfile {
  sex: 'male' | 'female';
  age: number;
  height: number;
  weight: number;
  target_weight: number;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'very';
  goal: 'lose' | 'maintain' | 'gain';
  bmr?: number;
  tdee?: number;
  daily_calories?: number;
  created_at?: string;
  updated_at?: string;
}

export interface WeightEntry {
  date: string;
  weight: number;
}

export interface DailyStats {
  date: string;
  health_score?: number;
  calories?: number;
  scans?: number;
}

export interface UserProgressData {
  weight_history: WeightEntry[];
  daily_stats: DailyStats[];
  current_weight?: number;
  start_weight?: number;
  weight_change?: number;
  avg_health_score?: number;
  total_scans: number;
  calorie_target?: number;
  profile?: UserHealthProfile;
}

// Save user health profile
export const saveUserProfileAPI = async (
  profile: Partial<UserHealthProfile>,
  email: string,
  userId: string
): Promise<{ success: boolean; message: string; profile?: any }> => {
  const params = new URLSearchParams({ email, user_id: userId });
  const response = await api.post(`/user/profile?${params.toString()}`, profile);
  return response.data;
};

// Get user health profile
export const getUserProfileAPI = async (
  email: string,
  userId: string
): Promise<{ profile: UserHealthProfile | null; exists: boolean }> => {
  const params = new URLSearchParams({ email, user_id: userId });
  const response = await api.get(`/user/profile?${params.toString()}`);
  return response.data;
};

// Add weight entry
export const addWeightEntryAPI = async (
  weight: number,
  email: string,
  userId: string,
  date?: string
): Promise<{ success: boolean; message: string }> => {
  const params = new URLSearchParams({ email, user_id: userId });
  const body: any = { weight };
  if (date) body.date = date;
  const response = await api.post(`/user/weight?${params.toString()}`, body);
  return response.data;
};

// Get user progress data for charts
export const getUserProgressAPI = async (
  email: string,
  userId: string,
  days: number = 30
): Promise<UserProgressData> => {
  const params = new URLSearchParams({ email, user_id: userId, days: days.toString() });
  const response = await api.get(`/user/progress?${params.toString()}`);
  return response.data;
};

// Delete user profile
export const deleteUserProfileAPI = async (
  email: string,
  userId: string
): Promise<{ success: boolean; message: string }> => {
  const params = new URLSearchParams({ email, user_id: userId });
  const response = await api.delete(`/user/profile?${params.toString()}`);
  return response.data;
};

export default api;
