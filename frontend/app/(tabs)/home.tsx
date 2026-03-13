// Home Screen - Premium Redesign
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../src/contexts/AuthContext';
import { useApp } from '../../src/contexts/AppContext';
import { theme, getScoreGradient } from '../../src/styles/theme';
import { ProductCardSkeleton } from '../../src/components/SkeletonLoader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { scanHistory, healingFoods, fetchProduct, refreshData, loading } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  
  const scanButtonScale = useRef(new Animated.Value(1)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const handleScanPress = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    router.push('/scanner');
  };

  const handleProductPress = async (barcode: string) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await fetchProduct(barcode);
    router.push('/product');
  };

  const handleScanButtonPressIn = () => {
    Animated.spring(scanButtonScale, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handleScanButtonPressOut = () => {
    Animated.spring(scanButtonScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}, {user?.email?.split('@')[0] || 'vous'} 👋
            </Text>
            <Text style={styles.subtitle}>Scannez pour manger mieux</Text>
          </View>
          <TouchableOpacity 
            style={styles.coachButton}
            onPress={() => router.push('/coach')}
          >
            <View style={styles.coachIcon}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#FFF" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Scan Button - Hero */}
        <Animated.View style={{ transform: [{ scale: scanButtonScale }] }}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleScanPress}
            onPressIn={handleScanButtonPressIn}
            onPressOut={handleScanButtonPressOut}
            activeOpacity={1}
          >
            <View style={styles.scanButtonInner}>
              <View style={styles.scanIconContainer}>
                <Ionicons name="scan" size={32} color="#FFF" />
              </View>
              <View style={styles.scanTextContainer}>
                <Text style={styles.scanButtonTitle}>Scanner un produit</Text>
                <Text style={styles.scanButtonSubtitle}>Découvrez son score santé</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => router.push('/compare')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="git-compare" size={20} color="#1976D2" />
            </View>
            <Text style={styles.quickActionText}>Comparer</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => router.push('/fridge-score')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#F3E5F5' }]}>
              <Text style={{ fontSize: 20 }}>🧊</Text>
            </View>
            <Text style={styles.quickActionText}>Mon Frigo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => router.push('/preferences')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="settings" size={20} color="#FF9800" />
            </View>
            <Text style={styles.quickActionText}>Préférences</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => router.push('/premium')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FFF8E1' }]}>
              <Ionicons name="diamond" size={20} color="#FFB300" />
            </View>
            <Text style={styles.quickActionText}>Premium</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Scans */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Scans récents</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
              <Text style={styles.seeAll}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <>
              <ProductCardSkeleton />
              <ProductCardSkeleton />
            </>
          ) : !scanHistory || scanHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="scan-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>Aucun produit scanné</Text>
              <Text style={styles.emptySubtext}>Scannez votre premier produit !</Text>
            </View>
          ) : (
            scanHistory.slice(0, 5).map((item, index) => (
              <ProductCard 
                key={`${item.barcode}-${index}`}
                product={item}
                onPress={() => handleProductPress(item.barcode)}
                index={index}
              />
            ))
          )}
        </View>

        {/* Healing Foods */}
        {healingFoods && healingFoods.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Aliments bienfaisants</Text>
              <View style={styles.badge}>
                <Ionicons name="leaf" size={12} color="#FFF" />
              </View>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {healingFoods.slice(0, 8).map((food, index) => (
                <HealingFoodCard 
                  key={index} 
                  food={food} 
                  onPress={() => handleProductPress(food.barcode)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Product Card Component
const ProductCard = ({ product, onPress, index }: any) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 400,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, []);

  const scoreColor = getScoreGradient(product.health_score || 50);

  return (
    <Animated.View style={[
      styles.productCard,
      {
        opacity: animatedValue,
        transform: [
          { translateY: animatedValue.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
          { scale: scaleValue }
        ]
      }
    ]}>
      <TouchableOpacity 
        style={styles.productCardInner}
        onPress={onPress}
        onPressIn={() => {
          Animated.spring(scaleValue, { toValue: 0.98, useNativeDriver: true }).start();
        }}
        onPressOut={() => {
          Animated.spring(scaleValue, { toValue: 1, useNativeDriver: true }).start();
        }}
        activeOpacity={1}
      >
        <View style={styles.productImageContainer}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.productImage} />
          ) : (
            <Ionicons name="cube-outline" size={24} color={theme.colors.textMuted} />
          )}
        </View>
        
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{product.product_name}</Text>
          <Text style={styles.productBrand} numberOfLines={1}>{product.brand || 'Marque inconnue'}</Text>
        </View>
        
        <View style={[styles.scoreCircle, { backgroundColor: scoreColor }]}>
          <Text style={styles.scoreText}>{product.health_score || '--'}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Healing Food Card
const HealingFoodCard = ({ food, onPress }: any) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <TouchableOpacity
        style={styles.healingCard}
        onPress={onPress}
        onPressIn={() => {
          Animated.spring(scaleValue, { toValue: 0.95, useNativeDriver: true }).start();
        }}
        onPressOut={() => {
          Animated.spring(scaleValue, { toValue: 1, useNativeDriver: true }).start();
        }}
        activeOpacity={1}
      >
        {food.image_url ? (
          <Image source={{ uri: food.image_url }} style={styles.healingImage} />
        ) : (
          <View style={styles.healingPlaceholder}>
            <Ionicons name="leaf" size={30} color={theme.colors.primary} />
          </View>
        )}
        <View style={styles.healingInfo}>
          <Text style={styles.healingName} numberOfLines={2}>{food.name}</Text>
          <View style={[styles.healingScore, { backgroundColor: getScoreGradient(food.health_score) }]}>
            <Text style={styles.healingScoreText}>{food.health_score}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Helper function
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  coachButton: {
    padding: 4,
  },
  coachIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#9C27B0',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  scanButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.xl,
    marginBottom: 20,
    ...theme.shadows.lg,
  },
  scanButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  scanIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  scanButtonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  scanButtonSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    ...theme.shadows.sm,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  badge: {
    backgroundColor: theme.colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 40,
    alignItems: 'center',
    ...theme.shadows.card,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  productCard: {
    marginBottom: 12,
  },
  productCardInner: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.card,
  },
  productImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  productImage: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
  },
  productInfo: {
    flex: 1,
    marginLeft: 14,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  scoreCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  horizontalScroll: {
    paddingRight: 20,
  },
  healingCard: {
    width: 140,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    marginRight: 12,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  healingImage: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
  },
  healingPlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  healingInfo: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  healingName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  healingScore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  healingScoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
});
