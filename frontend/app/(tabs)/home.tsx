// Home Screen - Premium iOS 18 Style with Bento Grid & Glassmorphism
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
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../src/contexts/AuthContext';
import { useApp } from '../../src/contexts/AppContext';
import { premiumTheme, getScoreColor } from '../../src/styles/premiumTheme';
import { GlassCard, BentoRow } from '../../src/components/GlassCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BENTO_GAP = 12;
const PADDING = 20;
const CARD_SMALL = (SCREEN_WIDTH - PADDING * 2 - BENTO_GAP * 2) / 3;
const CARD_MEDIUM = (SCREEN_WIDTH - PADDING * 2 - BENTO_GAP) / 2;
const CARD_LARGE = SCREEN_WIDTH - PADDING * 2;

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { scanHistory, healingFoods, fetchProduct, refreshData, loading } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 800,
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

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={[premiumTheme.light.primary + '08', premiumTheme.light.background, premiumTheme.light.background]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor={premiumTheme.light.primary}
            />
          }
        >
          {/* Header */}
          <Animated.View style={[styles.header, { opacity: headerAnim }]}>
            <View>
              <Text style={styles.greeting}>
                {getGreeting()} 👋
              </Text>
              <Text style={styles.userName}>
                {user?.email?.split('@')[0] || 'Bienvenue'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.coachButton}
              onPress={() => router.push('/coach')}
            >
              <LinearGradient
                colors={['#9C27B0', '#7B1FA2']}
                style={styles.coachGradient}
              >
                <Ionicons name="chatbubble-ellipses" size={22} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Scan Button - Hero Card */}
          <GlassCard 
            style={[styles.scanCard, { width: CARD_LARGE }]}
            onPress={handleScanPress}
            animated={true}
            delay={100}
          >
            <LinearGradient
              colors={[premiumTheme.light.primary, '#27AE60']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.scanGradient}
            >
              <View style={styles.scanIconContainer}>
                <Ionicons name="scan" size={36} color="#FFF" />
              </View>
              <View style={styles.scanTextContainer}>
                <Text style={styles.scanTitle}>Scanner un produit</Text>
                <Text style={styles.scanSubtitle}>Découvrez son score santé instantanément</Text>
              </View>
              <Ionicons name="chevron-forward" size={28} color="rgba(255,255,255,0.8)" />
            </LinearGradient>
          </GlassCard>

          {/* Quick Actions Bento */}
          <BentoRow style={{ marginTop: BENTO_GAP }}>
            <GlassCard 
              style={[styles.quickCard, { width: CARD_SMALL, height: 100 }]}
              onPress={() => router.push('/compare')}
              animated={true}
              delay={180}
            >
              <View style={[styles.quickIcon, { backgroundColor: '#007AFF20' }]}>
                <Ionicons name="git-compare" size={22} color="#007AFF" />
              </View>
              <Text style={styles.quickLabel}>Comparer</Text>
            </GlassCard>

            <GlassCard 
              style={[styles.quickCard, { width: CARD_SMALL, height: 100 }]}
              onPress={() => router.push('/fridge-score')}
              animated={true}
              delay={260}
            >
              <View style={[styles.quickIcon, { backgroundColor: '#5856D620' }]}>
                <Text style={{ fontSize: 22 }}>🧊</Text>
              </View>
              <Text style={styles.quickLabel}>Mon Frigo</Text>
            </GlassCard>

            <GlassCard 
              style={[styles.quickCard, { width: CARD_SMALL, height: 100 }]}
              onPress={() => router.push('/preferences')}
              animated={true}
              delay={340}
            >
              <View style={[styles.quickIcon, { backgroundColor: '#FF9F0A20' }]}>
                <Ionicons name="settings" size={22} color="#FF9F0A" />
              </View>
              <Text style={styles.quickLabel}>Préférences</Text>
            </GlassCard>
          </BentoRow>

          {/* Premium Card */}
          <GlassCard 
            style={[styles.premiumCard, { width: CARD_LARGE, marginTop: BENTO_GAP }]}
            onPress={() => router.push('/premium')}
            animated={true}
            delay={420}
          >
            <LinearGradient
              colors={['#FFD700', '#FFA000']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumGradient}
            >
              <Ionicons name="diamond" size={24} color="#FFF" />
              <View style={styles.premiumText}>
                <Text style={styles.premiumTitle}>Passez Premium</Text>
                <Text style={styles.premiumSubtitle}>Mode hors-ligne, menu personnalisé...</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.8)" />
            </LinearGradient>
          </GlassCard>

          {/* Recent Scans Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Scans récents</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
                <Text style={styles.seeAll}>Voir tout</Text>
              </TouchableOpacity>
            </View>

            {!scanHistory || scanHistory.length === 0 ? (
              <GlassCard 
                style={[styles.emptyCard, { width: CARD_LARGE }]}
                animated={true}
                delay={500}
              >
                <Ionicons name="scan-outline" size={48} color={premiumTheme.light.textTertiary} />
                <Text style={styles.emptyTitle}>Aucun scan</Text>
                <Text style={styles.emptySubtitle}>Scannez votre premier produit</Text>
              </GlassCard>
            ) : (
              scanHistory.slice(0, 4).map((item: any, index: number) => (
                <ProductCard 
                  key={`${item.barcode}-${index}`}
                  product={item}
                  onPress={() => handleProductPress(item.barcode)}
                  delay={500 + index * 80}
                />
              ))
            )}
          </View>

          {/* Healing Foods Section */}
          {healingFoods && healingFoods.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Aliments bienfaisants</Text>
                <View style={styles.leafBadge}>
                  <Ionicons name="leaf" size={14} color="#FFF" />
                </View>
              </View>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                {healingFoods.slice(0, 8).map((food: any, index: number) => (
                  <HealingCard 
                    key={index}
                    food={food}
                    onPress={() => handleProductPress(food.barcode)}
                    delay={700 + index * 60}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// Product Card Component
const ProductCard = ({ product, onPress, delay }: any) => {
  const scoreColor = getScoreColor(product.health_score || 50);

  return (
    <GlassCard 
      style={[styles.productCard, { width: CARD_LARGE, marginBottom: BENTO_GAP }]}
      onPress={onPress}
      animated={true}
      delay={delay}
    >
      <View style={styles.productImageContainer}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.productImage} />
        ) : (
          <Ionicons name="cube-outline" size={24} color={premiumTheme.light.textTertiary} />
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{product.product_name}</Text>
        <Text style={styles.productBrand} numberOfLines={1}>{product.brand || 'Marque'}</Text>
      </View>
      <View style={[styles.scoreCircle, { backgroundColor: scoreColor }]}>
        <Text style={styles.scoreText}>{product.health_score || '--'}</Text>
      </View>
    </GlassCard>
  );
};

// Healing Food Card
const HealingCard = ({ food, onPress, delay }: any) => {
  return (
    <GlassCard 
      style={styles.healingCard}
      onPress={onPress}
      animated={true}
      delay={delay}
    >
      <View style={styles.healingImageContainer}>
        {food.image_url ? (
          <Image source={{ uri: food.image_url }} style={styles.healingImage} />
        ) : (
          <Ionicons name="leaf" size={30} color={premiumTheme.light.primary} />
        )}
      </View>
      <View style={styles.healingInfo}>
        <Text style={styles.healingName} numberOfLines={2}>{food.name}</Text>
        <View style={[styles.healingScore, { backgroundColor: getScoreColor(food.health_score) }]}>
          <Text style={styles.healingScoreText}>{food.health_score}</Text>
        </View>
      </View>
    </GlassCard>
  );
};

// Helper
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: premiumTheme.light.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: PADDING,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: premiumTheme.light.textSecondary,
    fontWeight: '500',
  },
  userName: {
    fontSize: 32,
    fontWeight: '700',
    color: premiumTheme.light.textPrimary,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  coachButton: {
    borderRadius: 22,
    overflow: 'hidden',
    ...premiumTheme.shadows.glass,
  },
  coachGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanCard: {
    borderRadius: premiumTheme.radius['2xl'],
    overflow: 'hidden',
  },
  scanGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderRadius: premiumTheme.radius['2xl'],
  },
  scanIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanTextContainer: {
    flex: 1,
    marginLeft: 18,
  },
  scanTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: -0.3,
  },
  scanSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  quickCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: premiumTheme.light.textSecondary,
    letterSpacing: 0.2,
  },
  premiumCard: {
    borderRadius: premiumTheme.radius.xl,
    overflow: 'hidden',
  },
  premiumGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: premiumTheme.radius.xl,
  },
  premiumText: {
    flex: 1,
    marginLeft: 14,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  premiumSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  section: {
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: premiumTheme.light.textPrimary,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 15,
    fontWeight: '600',
    color: premiumTheme.light.primary,
  },
  leafBadge: {
    backgroundColor: premiumTheme.light.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: premiumTheme.light.textPrimary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: premiumTheme.light.textSecondary,
    marginTop: 4,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  productImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: premiumTheme.light.backgroundSecondary,
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
    color: premiumTheme.light.textPrimary,
  },
  productBrand: {
    fontSize: 13,
    color: premiumTheme.light.textSecondary,
    marginTop: 2,
  },
  scoreCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 150,
    marginRight: 12,
    borderRadius: premiumTheme.radius.xl,
    overflow: 'hidden',
  },
  healingImageContainer: {
    width: '100%',
    height: 100,
    backgroundColor: premiumTheme.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  healingImage: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
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
    color: premiumTheme.light.textPrimary,
  },
  healingScore: {
    width: 34,
    height: 34,
    borderRadius: 10,
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
