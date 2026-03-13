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
  timeout: 20000,
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
  const response = await api.get(`/find-better/${barcode}`);
  return response.data?.alternatives || [];
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
  const response = await api.post(`/generate-menu?${params.toString()}`, { family_size: familySize });
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

export default api;
