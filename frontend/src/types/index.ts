// Types for NutriScan app

export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  subscription_type: string;
}

export interface Product {
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
  error?: boolean;
}

export interface Additive {
  code: string;
  name: string;
  risk: 'high' | 'medium' | 'low';
  description: string;
  details: string;
  sources: string[];
  daily_limit: string;
}

export interface Ingredient {
  id: string;
  name: string;
  percent: number;
  vegan: string;
  vegetarian: string;
}

export interface HealthRisk {
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  icon: string;
}

export interface Nutrients {
  energy_kcal: number;
  fat: number;
  saturated_fat: number;
  carbohydrates: number;
  sugars: number;
  fiber: number;
  proteins: number;
  salt: number;
}

export interface ScanHistory {
  id: string;
  barcode: string;
  product_name: string;
  brand: string;
  image_url: string;
  health_score: number;
  nutri_score: string;
  timestamp: string;
}

export interface HealingFood {
  name: string;
  benefits: string[];
  conditions: string[];
  source: string;
  image: string;
}

export interface HealthGoal {
  id: string;
  user_id: string;
  type: string;
  name: string;
  created_at: string;
}

export interface Exercise {
  name: string;
  duration: string;
  calories: number;
  goal_type: string;
  icon: string;
}

export interface WeeklyMenu {
  [day: string]: {
    petit_dejeuner?: string;
    dejeuner?: string;
    diner?: string;
    collation?: string;
  } | string[];
  liste_courses?: string[];
  nombre_personnes?: number;
}

export interface CoachMessage {
  type: 'user' | 'coach';
  text: string;
}
