// App Context for shared state in NutriScan
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import {
  Product,
  ScanHistory,
  HealingFood,
  HealthGoal,
  Exercise,
  WeeklyMenu,
  CoachMessage,
} from '../types';
import {
  fetchHistoryAPI,
  fetchRankingsAPI,
  fetchHealingFoodsAPI,
  fetchFavoritesAPI,
  fetchHealthGoalsAPI,
  fetchExercisesAPI,
  fetchRecommendationsAPI,
  fetchProductAPI,
  findBetterAlternativesAPI,
  saveToHistoryAPI,
} from '../services/api';

interface AppContextType {
  // Data
  history: ScanHistory[];
  rankings: any[];
  healingFoods: HealingFood[];
  favorites: any[];
  healthGoals: HealthGoal[];
  exercises: Exercise[];
  recommendations: any[];
  weeklyMenu: WeeklyMenu | null;
  shoppingList: string[];
  coachMessages: CoachMessage[];
  
  // Current product
  product: Product | null;
  alternatives: any[];
  productLoading: boolean;
  
  // Actions
  fetchHistory: () => Promise<void>;
  fetchRankings: () => Promise<void>;
  fetchHealingFoods: () => Promise<void>;
  fetchFavorites: () => Promise<void>;
  fetchHealthGoals: () => Promise<void>;
  fetchExercises: () => Promise<void>;
  fetchRecommendations: () => Promise<void>;
  fetchProduct: (barcode: string) => Promise<void>;
  setProduct: (product: Product | null) => void;
  setAlternatives: (alternatives: any[]) => void;
  setWeeklyMenu: (menu: WeeklyMenu | null) => void;
  setShoppingList: (list: string[]) => void;
  setCoachMessages: (messages: CoachMessage[] | ((prev: CoachMessage[]) => CoachMessage[])) => void;
  setFavorites: (favorites: any[] | ((prev: any[]) => any[])) => void;
  setHealthGoals: (goals: HealthGoal[] | ((prev: HealthGoal[]) => HealthGoal[])) => void;
  setExercises: (exercises: Exercise[]) => void;
  
  // Loading states
  refreshing: boolean;
  onRefresh: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // Data state
  const [history, setHistory] = useState<ScanHistory[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [healingFoods, setHealingFoods] = useState<HealingFood[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [healthGoals, setHealthGoals] = useState<HealthGoal[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenu | null>(null);
  const [shoppingList, setShoppingList] = useState<string[]>([]);
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([]);
  
  // Product state
  const [product, setProduct] = useState<Product | null>(null);
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  
  // Loading state
  const [refreshing, setRefreshing] = useState(false);

  // Fetch functions
  const fetchHistory = async () => {
    try {
      const data = await fetchHistoryAPI();
      setHistory(data);
    } catch (error) {
      console.log('Error fetching history:', error);
    }
  };

  const fetchRankings = async () => {
    try {
      const data = await fetchRankingsAPI();
      setRankings(data);
    } catch (error) {
      console.log('Error fetching rankings:', error);
    }
  };

  const fetchHealingFoods = async () => {
    try {
      const data = await fetchHealingFoodsAPI();
      setHealingFoods(data);
    } catch (error) {
      console.log('Error fetching healing foods:', error);
    }
  };

  const fetchFavorites = async () => {
    if (!user) return;
    try {
      const data = await fetchFavoritesAPI(user.email, user.user_id);
      setFavorites(data);
    } catch (error) {
      console.log('Error fetching favorites:', error);
    }
  };

  const fetchHealthGoals = async () => {
    if (!user) return;
    try {
      const data = await fetchHealthGoalsAPI(user.email, user.user_id);
      setHealthGoals(data);
    } catch (error) {
      console.log('Error fetching health goals:', error);
    }
  };

  const fetchExercises = async () => {
    if (!user) return;
    try {
      const data = await fetchExercisesAPI(user.email, user.user_id);
      setExercises(data);
    } catch (error) {
      console.log('Error fetching exercises:', error);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const data = await fetchRecommendationsAPI();
      setRecommendations(data);
    } catch (error) {
      console.log('Error fetching recommendations:', error);
    }
  };

  const fetchProduct = async (barcode: string) => {
    if (isFetching) return;
    
    setIsFetching(true);
    setProduct(null);
    setAlternatives([]);
    setProductLoading(true);
    
    try {
      const productData = await fetchProductAPI(barcode);
      setProduct(productData);
      
      if (productData.found) {
        // Save to history
        saveToHistoryAPI({
          barcode: productData.barcode,
          product_name: productData.name || 'Produit inconnu',
          brand: productData.brand || '',
          image_url: productData.image_url || '',
          health_score: productData.health_score,
          nutri_score: productData.nutri_score,
        }).catch(console.log);
        
        // Fetch alternatives in background
        findBetterAlternativesAPI(barcode)
          .then(setAlternatives)
          .catch(console.log);
        
        // Refresh history
        fetchHistory();
      }
    } catch (error: any) {
      console.log('Error fetching product:', error?.message || error);
      setProduct({ found: false, barcode, name: 'Erreur de connexion', error: true } as Product);
    } finally {
      setProductLoading(false);
      setIsFetching(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchHistory(),
      fetchRankings(),
      fetchHealingFoods(),
    ]);
    setRefreshing(false);
  }, []);

  // Load saved data from AsyncStorage
  const loadSavedData = async () => {
    try {
      const savedList = await AsyncStorage.getItem('shopping_list');
      const savedMenu = await AsyncStorage.getItem('weekly_menu');
      
      if (savedList) setShoppingList(JSON.parse(savedList));
      if (savedMenu) setWeeklyMenu(JSON.parse(savedMenu));
    } catch (error) {
      console.log('Error loading saved data:', error);
    }
  };

  // Initial load
  useEffect(() => {
    fetchHistory();
    fetchRankings();
    fetchHealingFoods();
  }, []);

  // Load user-specific data
  useEffect(() => {
    if (user) {
      fetchFavorites();
      fetchHealthGoals();
      fetchExercises();
      fetchRecommendations();
      loadSavedData();
    }
  }, [user]);

  // Save menu and shopping list when they change
  useEffect(() => {
    if (weeklyMenu) {
      AsyncStorage.setItem('weekly_menu', JSON.stringify(weeklyMenu)).catch(console.log);
    }
  }, [weeklyMenu]);

  useEffect(() => {
    if (shoppingList.length > 0) {
      AsyncStorage.setItem('shopping_list', JSON.stringify(shoppingList)).catch(console.log);
    }
  }, [shoppingList]);

  return (
    <AppContext.Provider
      value={{
        history,
        rankings,
        healingFoods,
        favorites,
        healthGoals,
        exercises,
        recommendations,
        weeklyMenu,
        shoppingList,
        coachMessages,
        product,
        alternatives,
        productLoading,
        fetchHistory,
        fetchRankings,
        fetchHealingFoods,
        fetchFavorites,
        fetchHealthGoals,
        fetchExercises,
        fetchRecommendations,
        fetchProduct,
        setProduct,
        setAlternatives,
        setWeeklyMenu,
        setShoppingList,
        setCoachMessages,
        setFavorites,
        setHealthGoals,
        setExercises,
        refreshing,
        onRefresh,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
