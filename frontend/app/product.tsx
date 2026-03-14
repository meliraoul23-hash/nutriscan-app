// Product Detail Screen - Clean Design
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Share,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useApp } from '../src/contexts/AppContext';
import { useAuth } from '../src/contexts/AuthContext';
import { toggleFavoriteAPI, findBetterAlternativesAPI } from '../src/services/api';

// Colors
const COLORS = {
  primary: '#34C759',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  success: '#34C759',
  warning: '#FF9F0A',
  error: '#FF3B30',
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#00C853';
  if (score >= 60) return '#7CB342';
  if (score >= 45) return '#FFB300';
  if (score >= 30) return '#FF6D00';
  return '#DD2C00';
};

const getNutriColor = (grade: string): string => {
  const colors: Record<string, string> = {
    A: '#00C853', B: '#7CB342', C: '#FFB300', D: '#FF6D00', E: '#DD2C00'
  };
  return colors[grade?.toUpperCase()] || '#FFB300';
};

export default function ProductScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentProduct: product, favorites, setFavorites } = useApp();
  
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);

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
        message: `${product.name} - Score: ${product.health_score}/100 🥗\nDécouvert avec NutriScan`,
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
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const scoreColor = getScoreColor(product.health_score || 50);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleFavorite} style={styles.headerBtn}>
            <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={24} color={isFavorite ? COLORS.error : COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
            <Ionicons name="share-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Product Header */}
        <View style={styles.productHeader}>
          <View style={styles.productImage}>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={styles.productImg} />
            ) : (
              <Ionicons name="cube-outline" size={40} color={COLORS.textSecondary} />
            )}
          </View>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productBrand}>{product.brand || 'Marque inconnue'}</Text>
        </View>

        {/* Score Card */}
        <View style={styles.scoreCard}>
          <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreNumber, { color: scoreColor }]}>{product.health_score || 50}</Text>
            <Text style={styles.scoreLabel}>/100</Text>
          </View>
          <Text style={[styles.scoreGrade, { color: scoreColor }]}>{getScoreGrade(product.health_score)}</Text>
          <Text style={styles.proTip}>{getProTip(product.health_score)}</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statBadge, { backgroundColor: getNutriColor(product.nutri_score) }]}>
              <Text style={styles.statBadgeText}>{product.nutri_score || '?'}</Text>
            </View>
            <Text style={styles.statLabel}>Nutri-Score</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{product.additives?.length || 0}</Text>
            <Text style={styles.statLabel}>Additifs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{product.nova_group || '?'}</Text>
            <Text style={styles.statLabel}>NOVA</Text>
          </View>
        </View>

        {/* Additives */}
        {product.additives && product.additives.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additifs</Text>
            {product.additives.slice(0, 5).map((additive: any, index: number) => (
              <View key={index} style={styles.additiveItem}>
                <View style={[styles.additiveRisk, { backgroundColor: getRiskColor(additive.risk) }]} />
                <Text style={styles.additiveName}>{additive.name || additive.code}</Text>
                <Text style={[styles.additiveRiskText, { color: getRiskColor(additive.risk) }]}>
                  {getRiskLabel(additive.risk)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Alternatives */}
        {alternatives.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alternatives plus saines</Text>
            {alternatives.slice(0, 4).map((alt, index) => (
              <View key={index} style={styles.altCard}>
                <TouchableOpacity
                  style={styles.altContent}
                  onPress={() => router.push({ pathname: '/product', params: { barcode: alt.barcode } })}
                >
                  <View style={styles.altImage}>
                    {alt.image_url ? (
                      <Image source={{ uri: alt.image_url }} style={styles.altImg} />
                    ) : (
                      <Ionicons name="leaf" size={24} color={COLORS.primary} />
                    )}
                  </View>
                  <View style={styles.altInfo}>
                    <Text style={styles.altName} numberOfLines={1}>{alt.name}</Text>
                    <Text style={styles.altBrand}>{alt.brand || ''}</Text>
                  </View>
                  <View style={[styles.altScore, { backgroundColor: getScoreColor(alt.health_score) }]}>
                    <Text style={styles.altScoreText}>{alt.health_score}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.buyBtn}
                  onPress={() => Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(alt.name + ' acheter')}`)}
                >
                  <Ionicons name="cart" size={14} color="#FFF" />
                  <Text style={styles.buyText}>Acheter</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Helpers
const getScoreGrade = (score: number): string => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Bon';
  if (score >= 45) return 'Moyen';
  if (score >= 30) return 'Médiocre';
  return 'À éviter';
};

const getProTip = (score: number): string => {
  if (score >= 80) return "🌟 Excellent choix pour la santé !";
  if (score >= 60) return "👍 Bon produit, consommable régulièrement.";
  if (score >= 45) return "⚠️ À consommer avec modération.";
  return "🔶 Privilégiez des alternatives plus saines.";
};

const getRiskColor = (risk: string): string => {
  switch (risk?.toLowerCase()) {
    case 'low': return '#34C759';
    case 'medium': return '#FF9F0A';
    case 'high': return '#FF3B30';
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
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: COLORS.textSecondary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
  },
  headerBtn: { padding: 8 },
  headerActions: { flexDirection: 'row' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  productHeader: { alignItems: 'center', marginBottom: 20 },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  productImg: { width: 100, height: 100, resizeMode: 'contain' },
  productName: { fontSize: 24, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  productBrand: { fontSize: 15, color: COLORS.textSecondary, marginTop: 4 },
  scoreCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreNumber: { fontSize: 48, fontWeight: '800' },
  scoreLabel: { fontSize: 18, color: COLORS.textSecondary },
  scoreGrade: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  proTip: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  statsRow: { flexDirection: 'row', marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statBadgeText: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  statValue: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  additiveItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  additiveRisk: { width: 4, height: 30, borderRadius: 2, marginRight: 12 },
  additiveName: { flex: 1, fontSize: 15, color: COLORS.text },
  additiveRiskText: { fontSize: 12, fontWeight: '600' },
  altCard: { marginBottom: 12 },
  altContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  altImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  altImg: { width: 52, height: 52, resizeMode: 'contain' },
  altInfo: { flex: 1, marginLeft: 12 },
  altName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  altBrand: { fontSize: 13, color: COLORS.textSecondary },
  altScore: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  altScoreText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.warning,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  buyText: { color: '#FFF', fontSize: 14, fontWeight: '600', marginLeft: 6 },
});
