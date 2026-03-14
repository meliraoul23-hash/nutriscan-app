// Product Detail Screen - Complete with Composition, Nutrition & Additives Details
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
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useApp } from '../src/contexts/AppContext';
import { useAuth } from '../src/contexts/AuthContext';
import { toggleFavoriteAPI, findBetterAlternativesAPI } from '../src/services/api';
import axios from 'axios';
import Constants from 'expo-constants';

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
    case 'low': return 'Faible risque';
    case 'medium': return 'Risque modere';
    case 'high': return 'Risque eleve';
    default: return 'Non evalue';
  }
};

const getRiskIcon = (risk: string): string => {
  switch (risk?.toLowerCase()) {
    case 'low': return 'checkmark-circle';
    case 'medium': return 'warning';
    case 'high': return 'alert-circle';
    default: return 'help-circle';
  }
};

export default function ProductScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { product, productLoading, favorites, setFavorites, fetchProduct } = useApp();
  
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedAdditive, setSelectedAdditive] = useState<any>(null);
  const [showAdditiveModal, setShowAdditiveModal] = useState(false);

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

  const handleAdditivePress = async (additive: any) => {
    // Try to fetch detailed info from backend
    try {
      const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '';
      const response = await axios.get(`${backendUrl}/api/additive/${additive.code}`);
      setSelectedAdditive({ ...additive, ...response.data });
    } catch {
      setSelectedAdditive(additive);
    }
    setShowAdditiveModal(true);
  };

  const handleShare = async () => {
    if (!product) return;
    if (Platform.OS !== 'web') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `${product.name} - Score: ${product.health_score}/100\nDecouvert avec NutriScan`,
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

  const handleAlternativePress = async (barcode: string) => {
    if (Platform.OS !== 'web') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fetchProduct(barcode);
  };

  // Loading state
  if (productLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement du produit...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // No product or not found
  if (!product || !product.found) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loading}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.loadingText}>Produit non trouve</Text>
          <Text style={styles.subText}>Essayez un autre code-barres</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const scoreColor = getScoreColor(product.health_score || 50);
  const nutrients = product.nutrients || {};

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
          <Text style={styles.proTip}>{product.pro_tip || getProTip(product.health_score)}</Text>
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

        {/* Allergens */}
        {product.allergens && product.allergens.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning" size={20} color={COLORS.error} />
              <Text style={[styles.sectionTitle, { marginLeft: 8, color: COLORS.error }]}>Allergenes</Text>
            </View>
            <View style={styles.allergensList}>
              {product.allergens.map((allergen: string, index: number) => (
                <View key={index} style={styles.allergenTag}>
                  <Text style={styles.allergenText}>{allergen}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Nutrition Facts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Valeurs nutritionnelles (pour 100g)</Text>
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Energie</Text>
              <Text style={styles.nutritionValue}>{nutrients.energy_kcal || 0} kcal</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Matieres grasses</Text>
              <Text style={styles.nutritionValue}>{nutrients.fat?.toFixed(1) || 0}g</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>dont saturees</Text>
              <Text style={[styles.nutritionValue, (nutrients.saturated_fat || 0) > 5 && { color: COLORS.error }]}>
                {nutrients.saturated_fat?.toFixed(1) || 0}g
              </Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Glucides</Text>
              <Text style={styles.nutritionValue}>{nutrients.carbohydrates?.toFixed(1) || 0}g</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>dont sucres</Text>
              <Text style={[styles.nutritionValue, (nutrients.sugars || 0) > 12.5 && { color: COLORS.error }]}>
                {nutrients.sugars?.toFixed(1) || 0}g
              </Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Fibres</Text>
              <Text style={[styles.nutritionValue, (nutrients.fiber || 0) > 3 && { color: COLORS.primary }]}>
                {nutrients.fiber?.toFixed(1) || 0}g
              </Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Proteines</Text>
              <Text style={styles.nutritionValue}>{nutrients.proteins?.toFixed(1) || 0}g</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Sel</Text>
              <Text style={[styles.nutritionValue, (nutrients.salt || 0) > 1.5 && { color: COLORS.error }]}>
                {nutrients.salt?.toFixed(2) || 0}g
              </Text>
            </View>
          </View>
        </View>

        {/* Ingredients / Composition */}
        {product.ingredients_text && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Composition / Ingredients</Text>
            <Text style={styles.ingredientsText}>{product.ingredients_text}</Text>
          </View>
        )}

        {/* Health Risks */}
        {product.health_risks && product.health_risks.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: COLORS.error }]}>Alertes Sante</Text>
            {product.health_risks.map((risk: any, index: number) => (
              <View key={index} style={styles.riskItem}>
                <View style={[styles.riskIcon, { backgroundColor: risk.severity === 'high' ? '#FFEBEE' : '#FFF3E0' }]}>
                  <Ionicons 
                    name={risk.severity === 'high' ? 'alert-circle' : 'warning'} 
                    size={20} 
                    color={risk.severity === 'high' ? COLORS.error : COLORS.warning} 
                  />
                </View>
                <View style={styles.riskContent}>
                  <Text style={styles.riskTitle}>{risk.title}</Text>
                  <Text style={styles.riskDescription}>{risk.description}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Additives with Details */}
        {product.additives && product.additives.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Additifs - Appuyez pour les details</Text>
            </View>
            {product.additives.map((additive: any, index: number) => (
              <TouchableOpacity 
                key={index} 
                style={styles.additiveItem}
                onPress={() => handleAdditivePress(additive)}
                activeOpacity={0.7}
              >
                <View style={[styles.additiveRisk, { backgroundColor: getRiskColor(additive.risk) }]} />
                <View style={styles.additiveContent}>
                  <Text style={styles.additiveCode}>{additive.code}</Text>
                  <Text style={styles.additiveName}>{additive.name || additive.code}</Text>
                  {additive.description && (
                    <Text style={styles.additiveDesc} numberOfLines={1}>{additive.description}</Text>
                  )}
                </View>
                <View style={styles.additiveRiskBadge}>
                  <Ionicons name={getRiskIcon(additive.risk) as any} size={16} color={getRiskColor(additive.risk)} />
                  <Text style={[styles.additiveRiskText, { color: getRiskColor(additive.risk) }]}>
                    {getRiskLabel(additive.risk).split(' ')[0]}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
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
                  onPress={() => handleAlternativePress(alt.barcode)}
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

      {/* Additive Detail Modal */}
      <Modal visible={showAdditiveModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalRiskBadge, { backgroundColor: getRiskColor(selectedAdditive?.risk) }]}>
                <Ionicons name={getRiskIcon(selectedAdditive?.risk) as any} size={28} color="#FFF" />
              </View>
              <Text style={styles.modalTitle}>{selectedAdditive?.code}</Text>
              <Text style={styles.modalSubtitle}>{selectedAdditive?.name}</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowAdditiveModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={[styles.riskAlert, { backgroundColor: getRiskColor(selectedAdditive?.risk) + '15' }]}>
                <Ionicons name={getRiskIcon(selectedAdditive?.risk) as any} size={20} color={getRiskColor(selectedAdditive?.risk)} />
                <Text style={[styles.riskAlertText, { color: getRiskColor(selectedAdditive?.risk) }]}>
                  {getRiskLabel(selectedAdditive?.risk)}
                </Text>
              </View>

              {selectedAdditive?.description && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Description</Text>
                  <Text style={styles.modalText}>{selectedAdditive.description}</Text>
                </View>
              )}

              {selectedAdditive?.details && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Ce que vous devez savoir</Text>
                  <Text style={styles.modalText}>{selectedAdditive.details}</Text>
                </View>
              )}

              {selectedAdditive?.daily_limit && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Dose journaliere admissible (DJA)</Text>
                  <Text style={styles.modalText}>{selectedAdditive.daily_limit}</Text>
                </View>
              )}

              {selectedAdditive?.sources && selectedAdditive.sources.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Sources</Text>
                  <Text style={styles.modalText}>{selectedAdditive.sources.join(', ')}</Text>
                </View>
              )}

              <View style={styles.disclaimer}>
                <Ionicons name="information-circle" size={16} color={COLORS.textSecondary} />
                <Text style={styles.disclaimerText}>
                  Ces informations proviennent de sources scientifiques (EFSA, OMS, ANSES). Consultez un professionnel pour des conseils personnalises.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowAdditiveModal(false)}>
              <Text style={styles.closeModalText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Helpers
const getScoreGrade = (score: number): string => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Bon';
  if (score >= 45) return 'Moyen';
  if (score >= 30) return 'Mediocre';
  return 'A eviter';
};

const getProTip = (score: number): string => {
  if (score >= 80) return "Excellent choix pour la sante !";
  if (score >= 60) return "Bon produit, consommable regulierement.";
  if (score >= 45) return "A consommer avec moderation.";
  return "Privilegiez des alternatives plus saines.";
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  loadingText: { fontSize: 18, color: COLORS.text, fontWeight: '600', marginTop: 16 },
  subText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' },
  retryBtn: { marginTop: 24, backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  retryText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.surface },
  headerBtn: { padding: 8 },
  headerActions: { flexDirection: 'row' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  productHeader: { alignItems: 'center', marginBottom: 20 },
  productImage: { width: 100, height: 100, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 16 },
  productImg: { width: 100, height: 100, resizeMode: 'contain' },
  productName: { fontSize: 22, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  productBrand: { fontSize: 15, color: COLORS.textSecondary, marginTop: 4 },
  scoreCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16 },
  scoreCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  scoreNumber: { fontSize: 42, fontWeight: '800' },
  scoreLabel: { fontSize: 16, color: COLORS.textSecondary },
  scoreGrade: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  proTip: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  statsRow: { flexDirection: 'row', marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 16, padding: 14, alignItems: 'center', marginHorizontal: 4 },
  statBadge: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  statBadgeText: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  statValue: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  section: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  
  // Allergens
  allergensList: { flexDirection: 'row', flexWrap: 'wrap' },
  allergenTag: { backgroundColor: '#FFEBEE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8, marginBottom: 8 },
  allergenText: { fontSize: 13, color: COLORS.error, fontWeight: '600' },
  
  // Nutrition
  nutritionGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  nutritionItem: { width: '50%', paddingVertical: 8, paddingRight: 8 },
  nutritionLabel: { fontSize: 13, color: COLORS.textSecondary },
  nutritionValue: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginTop: 2 },
  
  // Ingredients
  ingredientsText: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
  
  // Health Risks
  riskItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  riskIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  riskContent: { flex: 1 },
  riskTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  riskDescription: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 },
  
  // Additives
  additiveItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  additiveRisk: { width: 4, height: 44, borderRadius: 2, marginRight: 12 },
  additiveContent: { flex: 1 },
  additiveCode: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  additiveName: { fontSize: 13, color: COLORS.text, marginTop: 2 },
  additiveDesc: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  additiveRiskBadge: { flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  additiveRiskText: { fontSize: 11, fontWeight: '600', marginLeft: 4 },
  
  // Alternatives
  altCard: { marginBottom: 12 },
  altContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  altImage: { width: 52, height: 52, borderRadius: 12, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  altImg: { width: 52, height: 52, resizeMode: 'contain' },
  altInfo: { flex: 1, marginLeft: 12 },
  altName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  altBrand: { fontSize: 13, color: COLORS.textSecondary },
  altScore: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  altScoreText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  buyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.warning, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, alignSelf: 'flex-end' },
  buyText: { color: '#FFF', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingBottom: 40 },
  modalHeader: { alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalRiskBadge: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  modalSubtitle: { fontSize: 16, color: COLORS.textSecondary, marginTop: 4 },
  closeBtn: { position: 'absolute', top: 16, right: 16, padding: 8 },
  modalScroll: { paddingHorizontal: 20, maxHeight: 400 },
  riskAlert: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, marginVertical: 16 },
  riskAlertText: { fontSize: 16, fontWeight: '700', marginLeft: 8 },
  modalSection: { marginBottom: 20 },
  modalSectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  modalText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFF8E1', padding: 12, borderRadius: 12, marginVertical: 16 },
  disclaimerText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, marginLeft: 8, lineHeight: 18 },
  closeModalBtn: { marginHorizontal: 20, backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  closeModalText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
