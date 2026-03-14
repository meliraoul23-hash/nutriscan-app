// Premium Recipes List Screen - NutriScan
// Beautiful grid of premium recipes with filtering and categories
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../src/styles/colors';
import { useAuth } from '../src/contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

// Mock recipes data
const CATEGORIES = [
  { id: 'all', name: 'Toutes', icon: 'apps' },
  { id: 'quick', name: 'Rapides', icon: 'flash' },
  { id: 'healthy', name: 'Sante', icon: 'heart' },
  { id: 'vegetarian', name: 'Vegetarien', icon: 'leaf' },
  { id: 'protein', name: 'Proteines', icon: 'fitness' },
  { id: 'lowcarb', name: 'Low Carb', icon: 'trending-down' },
];

const RECIPES = [
  {
    id: '1',
    title: 'Buddha Bowl Mediterraneen',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
    duration: '35 min',
    difficulty: 'Facile',
    healthScore: 92,
    calories: 485,
    categories: ['healthy', 'vegetarian'],
    isPremium: true,
    rating: 4.8,
  },
  {
    id: '2',
    title: 'Saumon Grille aux Legumes',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400',
    duration: '25 min',
    difficulty: 'Moyen',
    healthScore: 88,
    calories: 520,
    categories: ['protein', 'healthy'],
    isPremium: true,
    rating: 4.9,
  },
  {
    id: '3',
    title: 'Salade Cesar Light',
    image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400',
    duration: '15 min',
    difficulty: 'Facile',
    healthScore: 85,
    calories: 320,
    categories: ['quick', 'lowcarb'],
    isPremium: false,
    rating: 4.6,
  },
  {
    id: '4',
    title: 'Bowl Poke Hawaien',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    duration: '20 min',
    difficulty: 'Facile',
    healthScore: 90,
    calories: 450,
    categories: ['healthy', 'protein'],
    isPremium: true,
    rating: 4.7,
  },
  {
    id: '5',
    title: 'Wrap Veggie Express',
    image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400',
    duration: '10 min',
    difficulty: 'Facile',
    healthScore: 82,
    calories: 380,
    categories: ['quick', 'vegetarian'],
    isPremium: false,
    rating: 4.5,
  },
  {
    id: '6',
    title: 'Poulet Tandoori',
    image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400',
    duration: '45 min',
    difficulty: 'Moyen',
    healthScore: 78,
    calories: 550,
    categories: ['protein'],
    isPremium: true,
    rating: 4.8,
  },
  {
    id: '7',
    title: 'Smoothie Bowl Acai',
    image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400',
    duration: '10 min',
    difficulty: 'Facile',
    healthScore: 88,
    calories: 320,
    categories: ['quick', 'healthy', 'vegetarian'],
    isPremium: false,
    rating: 4.6,
  },
  {
    id: '8',
    title: 'Risotto aux Champignons',
    image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400',
    duration: '40 min',
    difficulty: 'Difficile',
    healthScore: 72,
    calories: 480,
    categories: ['vegetarian'],
    isPremium: true,
    rating: 4.9,
  },
];

export default function RecipesListScreen() {
  const router = useRouter();
  const { isPremium } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecipes = RECIPES.filter(recipe => {
    const matchesCategory = selectedCategory === 'all' || recipe.categories.includes(selectedCategory);
    const matchesSearch = recipe.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FFC107';
    return '#FF5722';
  };

  const renderRecipeCard = ({ item }: { item: typeof RECIPES[0] }) => (
    <TouchableOpacity
      style={styles.recipeCard}
      onPress={() => router.push({ pathname: '/recipe', params: { id: item.id } })}
      activeOpacity={0.9}
    >
      <View style={styles.cardImageContainer}>
        <Image source={{ uri: item.image }} style={styles.cardImage} />
        
        {/* Premium Badge */}
        {item.isPremium && (
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.premiumBadgeText}>Premium</Text>
          </View>
        )}
        
        {/* Health Score */}
        <View style={[styles.healthBadge, { backgroundColor: getHealthScoreColor(item.healthScore) }]}>
          <Text style={styles.healthBadgeText}>{item.healthScore}</Text>
        </View>
        
        {/* Duration */}
        <View style={styles.durationBadge}>
          <Ionicons name="time-outline" size={12} color="#FFF" />
          <Text style={styles.durationText}>{item.duration}</Text>
        </View>
      </View>
      
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        
        <View style={styles.cardMeta}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
          <Text style={styles.caloriesText}>{item.calories} kcal</Text>
        </View>
        
        <View style={styles.difficultyBadge}>
          <Text style={styles.difficultyText}>{item.difficulty}</Text>
        </View>
      </View>
      
      {/* Lock overlay for non-premium users on premium recipes */}
      {item.isPremium && !isPremium && (
        <View style={styles.lockOverlay}>
          <Ionicons name="lock-closed" size={32} color="#FFF" />
          <Text style={styles.lockText}>Premium</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recettes Premium</Text>
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="options-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une recette..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.categoriesContainer}
      >
        {CATEGORIES.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryPill,
              selectedCategory === category.id && styles.categoryPillActive
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Ionicons 
              name={category.icon as any} 
              size={18} 
              color={selectedCategory === category.id ? '#FFF' : colors.text} 
            />
            <Text style={[
              styles.categoryText,
              selectedCategory === category.id && styles.categoryTextActive
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Featured Recipe */}
      <TouchableOpacity 
        style={styles.featuredCard}
        onPress={() => router.push({ pathname: '/recipe', params: { id: '1' } })}
      >
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800' }} 
          style={styles.featuredImage}
        />
        <View style={styles.featuredOverlay} />
        <View style={styles.featuredContent}>
          <View style={styles.featuredBadge}>
            <MaterialCommunityIcons name="chef-hat" size={16} color="#FFF" />
            <Text style={styles.featuredBadgeText}>Recette du jour</Text>
          </View>
          <Text style={styles.featuredTitle}>Buddha Bowl Mediterraneen</Text>
          <Text style={styles.featuredSubtitle}>Un classique equilibre et savoureux</Text>
          <View style={styles.featuredMeta}>
            <View style={styles.featuredMetaItem}>
              <Ionicons name="time-outline" size={16} color="#FFF" />
              <Text style={styles.featuredMetaText}>35 min</Text>
            </View>
            <View style={styles.featuredMetaItem}>
              <Ionicons name="flame-outline" size={16} color="#FFF" />
              <Text style={styles.featuredMetaText}>485 kcal</Text>
            </View>
            <View style={styles.featuredMetaItem}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.featuredMetaText}>4.8</Text>
            </View>
          </View>
        </View>
        <View style={styles.playIconContainer}>
          <Ionicons name="play-circle" size={60} color="rgba(255,255,255,0.9)" />
        </View>
      </TouchableOpacity>

      {/* Recipe Grid */}
      <FlatList
        data={filteredRecipes}
        renderItem={renderRecipeCard}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.recipesGrid}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Aucune recette trouvee</Text>
            <Text style={styles.emptySubtitle}>Essayez un autre filtre ou terme de recherche</Text>
          </View>
        }
      />

      {/* Premium CTA for non-premium users */}
      {!isPremium && (
        <View style={styles.premiumCTA}>
          <View style={styles.premiumCTAContent}>
            <Ionicons name="lock-open" size={24} color="#FFD700" />
            <View style={styles.premiumCTAText}>
              <Text style={styles.premiumCTATitle}>Debloquez toutes les recettes</Text>
              <Text style={styles.premiumCTASubtitle}>Passez Premium pour un acces illimite</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.premiumCTAButton}
            onPress={() => router.push('/premium')}
          >
            <Text style={styles.premiumCTAButtonText}>Voir</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  filterBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },

  // Categories
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginRight: 10,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  categoryTextActive: {
    color: '#FFF',
  },

  // Featured Card
  featuredCard: {
    marginHorizontal: 16,
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  featuredContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  featuredBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  featuredTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  featuredSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  featuredMeta: {
    flexDirection: 'row',
    gap: 20,
  },
  featuredMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredMetaText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '500',
  },
  playIconContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -50 }],
  },

  // Recipe Grid
  recipesGrid: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  recipeCard: {
    width: CARD_WIDTH,
    marginHorizontal: 6,
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImageContainer: {
    height: 130,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  premiumBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFD700',
  },
  healthBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  durationText: {
    fontSize: 11,
    color: '#FFF',
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 18,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  caloriesText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  difficultyBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.primary,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 8,
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // Premium CTA
  premiumCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  premiumCTAContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  premiumCTAText: {},
  premiumCTATitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  premiumCTASubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  premiumCTAButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  premiumCTAButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});
