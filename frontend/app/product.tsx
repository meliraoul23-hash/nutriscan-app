// Product Detail Screen - Premium Redesign
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Share,
  Linking,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useApp } from '../src/contexts/AppContext';
import { useAuth } from '../src/contexts/AuthContext';
import { theme, getScoreGradient, getNutriScoreColor, getAdditiveColor } from '../src/styles/theme';
import { AnimatedScoreGauge } from '../src/components/AnimatedScoreGauge';
import { ProductDetailSkeleton } from '../src/components/SkeletonLoader';
import { toggleFavoriteAPI, findBetterAlternativesAPI } from '../src/services/api';

export default function ProductScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentProduct: product, favorites, setFavorites } = useApp();
  
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (product) {
      // Entry animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      // Check if favorite
      setIsFavorite(favorites.some(f => f.barcode === product.barcode));

      // Load alternatives
      loadAlternatives();
    }
  }, [product]);

  const loadAlternatives = async () => {
    if (!product?.barcode) return;
    setLoadingAlternatives(true);
    try {
      const data = await findBetterAlternativesAPI(product.barcode);
      setAlternatives(data || []);
    } catch (error) {
      console.log('Error loading alternatives:', error);
    } finally {
      setLoadingAlternatives(false);
    }
  };

  const handleShare = async () => {
    if (!product) return;
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      await Share.share({
        message: `${product.name} - Score Santé: ${product.health_score}/100\n\nDécouvert avec NutriScan 🥗`,
        title: `NutriScan - ${product.name}`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleFavorite = async () => {
    if (!product || !user) return;
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    try {
      const result = await toggleFavoriteAPI(user.email, product.barcode, product.name, product.health_score);
      if (result.added) {
        setFavorites([...favorites, { barcode: product.barcode, product_name: product.name }]);
        setIsFavorite(true);
      } else {
        setFavorites(favorites.filter(f => f.barcode !== product.barcode));
        setIsFavorite(false);
      }
    } catch (error) {
      console.log('Favorite error:', error);
    }
  };

  if (!product) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ProductDetailSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Détails produit</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleFavorite} style={styles.headerBtn}>
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={24} 
              color={isFavorite ? theme.colors.error : theme.colors.text} 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
            <Ionicons name="share-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Product Header */}
          <View style={styles.productHeader}>
            <View style={styles.productImageContainer}>
              {product.image_url ? (
                <Image source={{ uri: product.image_url }} style={styles.productImage} />
              ) : (
                <Ionicons name="cube-outline" size={48} color={theme.colors.textMuted} />
              )}
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productBrand}>{product.brand || 'Marque inconnue'}</Text>
              <View style={styles.productBadges}>
                {product.nutri_score && (
                  <View style={[styles.nutriBadge, { backgroundColor: getNutriScoreColor(product.nutri_score) }]}>
                    <Text style={styles.nutriBadgeText}>Nutri-Score {product.nutri_score}</Text>
                  </View>
                )}
                {product.nova_group && (
                  <View style={styles.novaBadge}>
                    <Text style={styles.novaBadgeText}>NOVA {product.nova_group}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Score Card */}
          <View style={styles.scoreCard}>
            <AnimatedScoreGauge 
              score={product.health_score || 50} 
              size={180}
              strokeWidth={14}
            />
            <Text style={styles.proTip}>{getProTip(product.health_score)}</Text>
          </View>

          {/* Quick Stats */}
          <View style={styles.statsRow}>
            <StatCard 
              icon="leaf" 
              label="Nutri-Score" 
              value={product.nutri_score || '?'}
              color={getNutriScoreColor(product.nutri_score)}
            />
            <StatCard 
              icon="flask" 
              label="Additifs" 
              value={String(product.additives?.length || 0)}
              color={product.additives?.length > 3 ? theme.colors.error : theme.colors.success}
            />
            <StatCard 
              icon="cube" 
              label="NOVA" 
              value={String(product.nova_group || '?')}
              color={product.nova_group > 2 ? theme.colors.warning : theme.colors.success}
            />
          </View>

          {/* Additives */}
          {product.additives && product.additives.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additifs</Text>
              {product.additives.map((additive: any, index: number) => (
                <View key={index} style={styles.additiveItem}>
                  <View style={[styles.additiveRisk, { backgroundColor: getAdditiveColor(additive.risk) }]} />
                  <View style={styles.additiveInfo}>
                    <Text style={styles.additiveName}>{additive.name || additive.code}</Text>
                    <Text style={styles.additiveDescription}>{additive.description || getRiskText(additive.risk)}</Text>
                  </View>
                  <View style={[styles.additiveRiskBadge, { backgroundColor: getAdditiveColor(additive.risk) + '20' }]}>
                    <Text style={[styles.additiveRiskText, { color: getAdditiveColor(additive.risk) }]}>
                      {getRiskLabel(additive.risk)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Alternatives */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Alternatives plus saines</Text>
              {loadingAlternatives && <ActivityIndicator size="small" color={theme.colors.primary} />}
            </View>
            
            {alternatives.length === 0 && !loadingAlternatives ? (
              <View style={styles.noAlternatives}>
                <Ionicons name="checkmark-circle" size={40} color={theme.colors.success} />
                <Text style={styles.noAlternativesText}>
                  Ce produit est déjà un bon choix !
                </Text>
              </View>
            ) : (
              alternatives.slice(0, 5).map((alt, index) => (
                <AlternativeCard 
                  key={index} 
                  alternative={alt} 
                  currentScore={product.health_score}
                  onPress={() => router.push({ pathname: '/product', params: { barcode: alt.barcode } })}
                />
              ))
            )}
          </View>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Stat Card Component
const StatCard = ({ icon, label, value, color }: any) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// Alternative Card Component
const AlternativeCard = ({ alternative, currentScore, onPress }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const scoreGain = Math.max(0, (alternative.health_score || 0) - (currentScore || 0));

  const handleBuy = () => {
    const query = encodeURIComponent(`${alternative.name} ${alternative.brand || ''} acheter`);
    Linking.openURL(`https://www.google.com/search?q=${query}`);
  };

  return (
    <Animated.View style={[styles.alternativeCard, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.alternativeContent}
        onPress={onPress}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
        activeOpacity={1}
      >
        <View style={styles.alternativeImageContainer}>
          {alternative.image_url ? (
            <Image source={{ uri: alternative.image_url }} style={styles.alternativeImage} />
          ) : (
            <Ionicons name="leaf" size={24} color={theme.colors.primary} />
          )}
        </View>
        
        <View style={styles.alternativeInfo}>
          <Text style={styles.alternativeName} numberOfLines={1}>{alternative.name}</Text>
          <Text style={styles.alternativeBrand} numberOfLines={1}>{alternative.brand || ''}</Text>
          {scoreGain > 0 && (
            <View style={styles.scoreGain}>
              <Ionicons name="arrow-up" size={12} color={theme.colors.success} />
              <Text style={styles.scoreGainText}>+{scoreGain} pts</Text>
            </View>
          )}
        </View>
        
        <View style={[styles.alternativeScore, { backgroundColor: getScoreGradient(alternative.health_score) }]}>
          <Text style={styles.alternativeScoreText}>{alternative.health_score}</Text>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.buyButton} onPress={handleBuy}>
        <Ionicons name="cart" size={14} color="#FFF" />
        <Text style={styles.buyButtonText}>Acheter</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Helper functions
const getProTip = (score: number): string => {
  if (score >= 80) return "🌟 Excellent choix ! Ce produit est très bon pour la santé.";
  if (score >= 60) return "👍 Bon produit, consommable régulièrement.";
  if (score >= 45) return "⚠️ À consommer avec modération.";
  if (score >= 30) return "🔶 Privilégiez des alternatives plus saines.";
  return "🚫 Produit à éviter. Consultez nos alternatives.";
};

const getRiskLabel = (risk: string): string => {
  switch (risk?.toLowerCase()) {
    case 'low': return 'Faible';
    case 'medium': return 'Modéré';
    case 'high': return 'Élevé';
    default: return 'Inconnu';
  }
};

const getRiskText = (risk: string): string => {
  switch (risk?.toLowerCase()) {
    case 'low': return 'Risque faible pour la santé';
    case 'medium': return 'À consommer avec modération';
    case 'high': return 'Éviter une consommation régulière';
    default: return 'Risque non évalué';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  productImageContainer: {
    width: 100,
    height: 100,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  productImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  productInfo: {
    flex: 1,
    marginLeft: 16,
  },
  productName: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  productBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  nutriBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  nutriBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  novaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  novaBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  scoreCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    ...theme.shadows.card,
  },
  proTip: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    ...theme.shadows.card,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 20,
    marginBottom: 20,
    ...theme.shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  additiveItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  additiveRisk: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: 12,
  },
  additiveInfo: {
    flex: 1,
  },
  additiveName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  additiveDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  additiveRiskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  additiveRiskText: {
    fontSize: 11,
    fontWeight: '600',
  },
  noAlternatives: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noAlternativesText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  alternativeCard: {
    marginBottom: 12,
  },
  alternativeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  alternativeImageContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  alternativeImage: {
    width: 52,
    height: 52,
    resizeMode: 'contain',
  },
  alternativeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  alternativeName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  alternativeBrand: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  scoreGain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  scoreGainText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.success,
    marginLeft: 4,
  },
  alternativeScore: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alternativeScoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.warning,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  buyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});
