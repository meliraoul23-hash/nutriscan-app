// Product Detail - Premium Bento Grid Design with Glassmorphism
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Share,
  Linking,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useApp } from '../src/contexts/AppContext';
import { useAuth } from '../src/contexts/AuthContext';
import { premiumTheme, getScoreColor, getNutriColor, getAdditiveRiskColor } from '../src/styles/premiumTheme';
import { GlassCard, BentoRow } from '../src/components/GlassCard';
import { ScoreRing3D } from '../src/components/ScoreRing3D';
import { toggleFavoriteAPI, findBetterAlternativesAPI } from '../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BENTO_GAP = 12;
const PADDING = 20;
const CARD_SMALL = (SCREEN_WIDTH - PADDING * 2 - BENTO_GAP * 2) / 3;
const CARD_MEDIUM = (SCREEN_WIDTH - PADDING * 2 - BENTO_GAP) / 2;
const CARD_LARGE = SCREEN_WIDTH - PADDING * 2;

export default function ProductScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentProduct: product, favorites, setFavorites } = useApp();
  
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (product) {
      setIsFavorite(favorites?.some(f => f.barcode === product.barcode) || false);
      loadAlternatives();
    }
  }, [product]);

  const loadAlternatives = async () => {
    if (!product?.barcode) return;
    try {
      const data = await findBetterAlternativesAPI(product.barcode);
      setAlternatives(data || []);
    } catch (error) {
      console.log('Error loading alternatives:', error);
    }
  };

  const handleShare = async () => {
    if (!product) return;
    if (Platform.OS !== 'web') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `${product.name} - Score: ${product.health_score}/100 🥗\n\nDécouvert avec NutriScan`,
      });
    } catch (error) {}
  };

  const handleFavorite = async () => {
    if (!product || !user) return;
    if (Platform.OS !== 'web') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await toggleFavoriteAPI(user.email, product.barcode, product.name, product.health_score);
      if (result.added) {
        setFavorites([...(favorites || []), { barcode: product.barcode, product_name: product.name }]);
        setIsFavorite(true);
      } else {
        setFavorites((favorites || []).filter(f => f.barcode !== product.barcode));
        setIsFavorite(false);
      }
    } catch (error) {}
  };

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const scoreColor = getScoreColor(product.health_score || 50);
  const nutriColor = getNutriColor(product.nutri_score);

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={[scoreColor + '15', premiumTheme.light.background, premiumTheme.light.background]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={28} color={premiumTheme.light.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleFavorite} style={styles.headerBtn}>
              <Ionicons 
                name={isFavorite ? "heart" : "heart-outline"} 
                size={24} 
                color={isFavorite ? premiumTheme.light.error : premiumTheme.light.textPrimary} 
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
              <Ionicons name="share-outline" size={24} color={premiumTheme.light.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Header */}
        <View style={styles.productHeader}>
          <View style={styles.productImageContainer}>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={styles.productImage} />
            ) : (
              <Ionicons name="cube-outline" size={40} color={premiumTheme.light.textTertiary} />
            )}
          </View>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productBrand}>{product.brand || 'Marque inconnue'}</Text>
        </View>

        {/* Bento Grid */}
        <View style={styles.bentoContainer}>
          {/* Row 1: Large Score Card */}
          <GlassCard 
            style={[styles.scoreCard, { width: CARD_LARGE, height: 260 }]}
            animated={true}
            delay={0}
          >
            <ScoreRing3D score={product.health_score || 50} size={180} />
            <Text style={styles.scoreLabel}>Score Santé</Text>
          </GlassCard>

          {/* Row 2: Three small cards */}
          <BentoRow style={{ marginTop: BENTO_GAP }}>
            <GlassCard 
              style={[styles.statCard, { width: CARD_SMALL, height: 110 }]}
              animated={true}
              delay={80}
            >
              <View style={[styles.statIcon, { backgroundColor: '#FF3B30' + '20' }]}>
                <Ionicons name="cube" size={22} color="#FF3B30" />
              </View>
              <Text style={[styles.statValue, { color: '#FF3B30' }]}>
                {product.nutriments?.sugars_100g?.toFixed(0) || '0'}g
              </Text>
              <Text style={styles.statLabel}>Sucres</Text>
            </GlassCard>

            <GlassCard 
              style={[styles.statCard, { width: CARD_SMALL, height: 110 }]}
              animated={true}
              delay={160}
            >
              <View style={[styles.statIcon, { backgroundColor: '#FF9F0A' + '20' }]}>
                <Ionicons name="water" size={22} color="#FF9F0A" />
              </View>
              <Text style={[styles.statValue, { color: '#FF9F0A' }]}>
                {product.nutriments?.fat_100g?.toFixed(0) || '0'}g
              </Text>
              <Text style={styles.statLabel}>Graisses</Text>
            </GlassCard>

            <GlassCard 
              style={[styles.statCard, { width: CARD_SMALL, height: 110 }]}
              animated={true}
              delay={240}
            >
              <View style={[styles.statIcon, { backgroundColor: '#5856D6' + '20' }]}>
                <Ionicons name="flask" size={22} color="#5856D6" />
              </View>
              <Text style={[styles.statValue, { color: '#5856D6' }]}>
                {product.additives?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Additifs</Text>
            </GlassCard>
          </BentoRow>

          {/* Row 3: Two medium cards */}
          <BentoRow style={{ marginTop: BENTO_GAP }}>
            <GlassCard 
              style={[styles.badgeCard, { width: CARD_MEDIUM, height: 100 }]}
              animated={true}
              delay={320}
            >
              <View style={[styles.nutriBadge, { backgroundColor: nutriColor }]}>
                <Text style={styles.nutriBadgeText}>{product.nutri_score || '?'}</Text>
              </View>
              <View style={styles.badgeInfo}>
                <Text style={styles.badgeTitle}>Nutri-Score</Text>
                <Text style={styles.badgeSubtitle}>Classification nutritionnelle</Text>
              </View>
            </GlassCard>

            <GlassCard 
              style={[styles.badgeCard, { width: CARD_MEDIUM, height: 100 }]}
              animated={true}
              delay={400}
            >
              <View style={[styles.novaBadge, { backgroundColor: getNovaColor(product.nova_group) }]}>
                <Text style={styles.novaBadgeText}>{product.nova_group || '?'}</Text>
              </View>
              <View style={styles.badgeInfo}>
                <Text style={styles.badgeTitle}>NOVA</Text>
                <Text style={styles.badgeSubtitle}>Transformation</Text>
              </View>
            </GlassCard>
          </BentoRow>

          {/* Additives Section */}
          {product.additives && product.additives.length > 0 && (
            <GlassCard 
              style={[styles.additivesCard, { width: CARD_LARGE, marginTop: BENTO_GAP }]}
              animated={true}
              delay={480}
            >
              <Text style={styles.sectionTitle}>Additifs</Text>
              {product.additives.slice(0, 5).map((additive: any, index: number) => (
                <View key={index} style={styles.additiveItem}>
                  <View style={[styles.additiveRisk, { backgroundColor: getAdditiveRiskColor(additive.risk) }]} />
                  <Text style={styles.additiveName}>{additive.name || additive.code}</Text>
                  <View style={[styles.riskBadge, { backgroundColor: getAdditiveRiskColor(additive.risk) + '20' }]}>
                    <Text style={[styles.riskText, { color: getAdditiveRiskColor(additive.risk) }]}>
                      {getRiskLabel(additive.risk)}
                    </Text>
                  </View>
                </View>
              ))}
            </GlassCard>
          )}

          {/* Alternatives Section */}
          {alternatives.length > 0 && (
            <View style={{ marginTop: BENTO_GAP }}>
              <Text style={styles.altSectionTitle}>Alternatives plus saines</Text>
              {alternatives.slice(0, 4).map((alt, index) => (
                <GlassCard 
                  key={index}
                  style={[styles.alternativeCard, { width: CARD_LARGE, marginBottom: BENTO_GAP }]}
                  onPress={() => router.push({ pathname: '/product', params: { barcode: alt.barcode } })}
                  animated={true}
                  delay={560 + index * 80}
                >
                  <View style={styles.altContent}>
                    <View style={styles.altImageContainer}>
                      {alt.image_url ? (
                        <Image source={{ uri: alt.image_url }} style={styles.altImage} />
                      ) : (
                        <Ionicons name="leaf" size={24} color={premiumTheme.light.primary} />
                      )}
                    </View>
                    <View style={styles.altInfo}>
                      <Text style={styles.altName} numberOfLines={1}>{alt.name}</Text>
                      <Text style={styles.altBrand}>{alt.brand || ''}</Text>
                      <View style={styles.scoreGain}>
                        <Ionicons name="trending-up" size={14} color={premiumTheme.light.success} />
                        <Text style={styles.scoreGainText}>
                          +{Math.max(0, (alt.health_score || 0) - (product.health_score || 0))} pts
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.altScore, { backgroundColor: getScoreColor(alt.health_score) }]}>
                      <Text style={styles.altScoreText}>{alt.health_score}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.buyButton}
                    onPress={() => Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(alt.name + ' acheter')}`)}
                  >
                    <Ionicons name="cart" size={16} color="#FFF" />
                    <Text style={styles.buyText}>Acheter</Text>
                  </TouchableOpacity>
                </GlassCard>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// Helper functions
const getNovaColor = (nova: number): string => {
  switch (nova) {
    case 1: return '#34C759';
    case 2: return '#FFD60A';
    case 3: return '#FF9F0A';
    case 4: return '#FF3B30';
    default: return '#8E8E93';
  }
};

const getRiskLabel = (risk: string): string => {
  switch (risk?.toLowerCase()) {
    case 'low': return 'Faible';
    case 'medium': return 'Modéré';
    case 'high': return 'Élevé';
    default: return '?';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: premiumTheme.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: premiumTheme.light.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerBtn: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: PADDING,
  },
  productHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  productImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: premiumTheme.light.glass,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 16,
    ...premiumTheme.shadows.glass,
  },
  productImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  productName: {
    fontSize: 28,
    fontWeight: '700',
    color: premiumTheme.light.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  productBrand: {
    fontSize: 16,
    color: premiumTheme.light.textSecondary,
    marginTop: 4,
  },
  bentoContainer: {
    marginTop: 8,
  },
  scoreCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: premiumTheme.light.textSecondary,
    marginTop: 12,
    letterSpacing: 0.5,
  },
  statCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
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
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: premiumTheme.light.textSecondary,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  nutriBadge: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nutriBadgeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
  },
  novaBadge: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  novaBadgeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
  },
  badgeInfo: {
    marginLeft: 14,
    flex: 1,
  },
  badgeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: premiumTheme.light.textPrimary,
  },
  badgeSubtitle: {
    fontSize: 12,
    color: premiumTheme.light.textSecondary,
    marginTop: 2,
  },
  additivesCard: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: premiumTheme.light.textPrimary,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  additiveItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: premiumTheme.light.glassBorder,
  },
  additiveRisk: {
    width: 4,
    height: 30,
    borderRadius: 2,
    marginRight: 12,
  },
  additiveName: {
    flex: 1,
    fontSize: 15,
    color: premiumTheme.light.textPrimary,
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  riskText: {
    fontSize: 11,
    fontWeight: '600',
  },
  altSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: premiumTheme.light.textPrimary,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  alternativeCard: {
    padding: 16,
  },
  altContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  altImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: premiumTheme.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  altImage: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
  },
  altInfo: {
    flex: 1,
    marginLeft: 14,
  },
  altName: {
    fontSize: 16,
    fontWeight: '600',
    color: premiumTheme.light.textPrimary,
  },
  altBrand: {
    fontSize: 13,
    color: premiumTheme.light.textSecondary,
  },
  scoreGain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  scoreGainText: {
    fontSize: 13,
    fontWeight: '600',
    color: premiumTheme.light.success,
    marginLeft: 4,
  },
  altScore: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  altScoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9F0A',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  buyText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});
