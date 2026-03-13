// Product Detail Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Share,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { useApp } from '../src/contexts/AppContext';
import { addToFavoritesAPI, removeFromFavoritesAPI } from '../src/services/api';
import { colors, getScoreColor, getNutriScoreColor, getAdditiveColor } from '../src/styles/colors';
import { ScoreCircle } from '../src/components';

export default function ProductScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { product, alternatives, productLoading, favorites, setFavorites } = useApp();
  const [selectedAdditive, setSelectedAdditive] = useState<any>(null);
  const [showAdditiveModal, setShowAdditiveModal] = useState(false);

  const isFavorite = favorites.some((f: any) => f.barcode === product?.barcode);

  const handleToggleFavorite = async () => {
    if (!user || !product) return;
    
    try {
      if (isFavorite) {
        await removeFromFavoritesAPI(product.barcode, user.email, user.user_id);
        setFavorites((prev: any[]) => prev.filter((f: any) => f.barcode !== product.barcode));
      } else {
        await addToFavoritesAPI(product.barcode, user.email, user.user_id);
        setFavorites((prev: any[]) => [...prev, {
          barcode: product.barcode,
          product_name: product.name,
          brand: product.brand,
          image_url: product.image_url,
          health_score: product.health_score,
        }]);
      }
    } catch (error) {
      console.log('Error toggling favorite:', error);
    }
  };

  const handleShare = async () => {
    if (!product) return;
    try {
      await Share.share({
        message: `Découvre ${product.name} sur NutriScan ! Score santé: ${product.health_score}/100`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const getScoreDescription = (score: number): string => {
    if (score >= 70) return 'Excellent choix pour votre santé';
    if (score >= 50) return 'Consommation modérée recommandée';
    return 'À éviter ou consommer rarement';
  };

  const getNovaDescription = (group: number): string => {
    const descriptions: { [key: number]: string } = {
      1: 'Aliment non transformé',
      2: 'Ingrédient culinaire',
      3: 'Aliment transformé',
      4: 'Ultra-transformé',
    };
    return descriptions[group] || 'Non renseigné';
  };

  if (productLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Analyse du produit...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product || !product.found) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Produit</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.notFoundTitle}>Produit non trouvé</Text>
          <Text style={styles.notFoundText}>Ce produit n'est pas dans notre base de données</Text>
          <TouchableOpacity style={styles.scanAgainButton} onPress={() => router.push('/scanner')}>
            <Text style={styles.scanAgainButtonText}>Scanner un autre produit</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analyse</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerAction} onPress={handleToggleFavorite}>
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={24} color={isFavorite ? colors.error : colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAction} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Product Info */}
        <View style={styles.productCard}>
          <View style={styles.productRow}>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={styles.productImage} />
            ) : (
              <View style={styles.productImagePlaceholder}>
                <Ionicons name="cube-outline" size={40} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productBrand}>{product.brand || 'Marque inconnue'}</Text>
            </View>
          </View>
        </View>

        {/* Score */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreTitle}>Score Santé</Text>
          <ScoreCircle score={product.health_score} size="large" />
          <Text style={styles.scoreDescription}>{getScoreDescription(product.health_score)}</Text>
        </View>

        {/* Pro Tip */}
        {product.pro_tip && (
          <View style={styles.proTipCard}>
            <View style={styles.proTipHeader}>
              <Ionicons name="bulb" size={20} color={colors.primary} />
              <Text style={styles.proTipTitle}>Conseil Santé</Text>
            </View>
            <Text style={styles.proTipText}>{product.pro_tip}</Text>
          </View>
        )}

        {/* Badges */}
        <View style={styles.badgesRow}>
          <View style={styles.badgeCard}>
            <Text style={styles.badgeLabel}>Nutri-Score</Text>
            <View style={[styles.nutriScoreBadge, { backgroundColor: getNutriScoreColor(product.nutri_score_grade) }]}>
              <Text style={styles.nutriScoreText}>{product.nutri_score_grade?.toUpperCase() || '?'}</Text>
            </View>
          </View>
          <View style={styles.badgeCard}>
            <Text style={styles.badgeLabel}>NOVA</Text>
            <View style={styles.novaBadge}>
              <Text style={styles.novaText}>{product.nova_group || '?'}</Text>
            </View>
            <Text style={styles.novaDescription}>{getNovaDescription(product.nova_group)}</Text>
          </View>
        </View>

        {/* Health Risks */}
        {product.health_risks && product.health_risks.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning" size={20} color={colors.error} />
              <Text style={styles.sectionTitleDanger}>Risques pour la santé</Text>
            </View>
            {product.health_risks.map((risk, index) => (
              <View key={index} style={[styles.riskItem, { borderLeftColor: risk.severity === 'high' ? colors.error : colors.warning }]}>
                <Text style={[styles.riskTitle, { color: risk.severity === 'high' ? colors.error : colors.warning }]}>{risk.title}</Text>
                <Text style={styles.riskDescription}>{risk.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Additives */}
        {product.additives && product.additives.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionCardTitle}>Additifs ({product.additives.length})</Text>
            {product.additives.map((additive, index) => (
              <TouchableOpacity
                key={index}
                style={styles.additiveItem}
                onPress={() => {
                  setSelectedAdditive(additive);
                  setShowAdditiveModal(true);
                }}
              >
                <View style={[styles.additiveIndicator, { backgroundColor: getAdditiveColor(additive.risk) }]} />
                <View style={styles.additiveInfo}>
                  <Text style={styles.additiveCode}>{additive.code}</Text>
                  <Text style={styles.additiveName}>{additive.name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Alternatives */}
        {alternatives && alternatives.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.alternativesHeader}>
              <Text style={styles.sectionCardTitle}>Alternatives plus saines</Text>
              <View style={styles.alternativesBadge}>
                <Ionicons name="checkmark" size={14} color="#FFF" />
                <Text style={styles.alternativesBadgeText}>{alternatives.length}</Text>
              </View>
            </View>
            {alternatives.slice(0, 5).map((alt, index) => (
              <View key={index} style={styles.alternativeItem}>
                <TouchableOpacity
                  style={styles.alternativeContent}
                  onPress={() => router.push({ pathname: '/product', params: { barcode: alt.barcode } })}
                >
                  <View style={styles.alternativeImageContainer}>
                    {alt.image_url ? (
                      <Image source={{ uri: alt.image_url }} style={styles.alternativeImage} />
                    ) : (
                      <Ionicons name="leaf" size={20} color={colors.primary} />
                    )}
                  </View>
                  <View style={styles.alternativeInfo}>
                    <Text style={styles.alternativeName} numberOfLines={1}>{alt.name}</Text>
                    <Text style={styles.alternativeBrand}>{alt.brand || ''}</Text>
                    <View style={styles.scoreGain}>
                      <Ionicons name="arrow-up" size={12} color={colors.success} />
                      <Text style={styles.scoreGainText}>+{alt.score_gain || Math.max(0, (alt.health_score || 0) - (product?.health_score || 0))} pts</Text>
                    </View>
                  </View>
                  <View style={[styles.alternativeScore, { backgroundColor: getScoreColor(alt.health_score) }]}>
                    <Text style={styles.alternativeScoreText}>{alt.health_score}</Text>
                  </View>
                </TouchableOpacity>
                {/* Buy Now Button */}
                <TouchableOpacity
                  style={styles.buyButton}
                  onPress={() => {
                    const searchQuery = encodeURIComponent(`${alt.name} ${alt.brand || ''}`);
                    Linking.openURL(`https://www.google.com/search?q=${searchQuery}+acheter`);
                  }}
                >
                  <Ionicons name="cart" size={14} color="#FFF" />
                  <Text style={styles.buyButtonText}>Acheter</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Good Choice */}
        {product.health_score >= 70 && (
          <View style={styles.goodChoiceCard}>
            <Ionicons name="checkmark-circle" size={32} color={colors.success} />
            <Text style={styles.goodChoiceTitle}>Excellent choix !</Text>
            <Text style={styles.goodChoiceText}>Ce produit est bon pour votre santé</Text>
          </View>
        )}

        {/* Scan Another */}
        <TouchableOpacity style={styles.scanAnotherButton} onPress={() => router.push('/scanner')}>
          <Ionicons name="barcode-outline" size={20} color="#FFF" />
          <Text style={styles.scanAnotherButtonText}>Scanner un autre produit</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Additive Modal */}
      <Modal visible={showAdditiveModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedAdditive?.code}</Text>
              <TouchableOpacity onPress={() => setShowAdditiveModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.additiveTitleModal}>{selectedAdditive?.name}</Text>
              <View style={[
                styles.riskBadge,
                { backgroundColor: getAdditiveColor(selectedAdditive?.risk) }
              ]}>
                <Text style={styles.riskBadgeText}>
                  {selectedAdditive?.risk === 'high' ? 'Risque élevé' : selectedAdditive?.risk === 'medium' ? 'Risque modéré' : 'Risque faible'}
                </Text>
              </View>
              <Text style={styles.additiveDetailsTitle}>Description</Text>
              <Text style={styles.additiveDetails}>{selectedAdditive?.description}</Text>
              {selectedAdditive?.details && (
                <>
                  <Text style={styles.additiveDetailsTitle}>Détails</Text>
                  <Text style={styles.additiveDetails}>{selectedAdditive?.details}</Text>
                </>
              )}
              {selectedAdditive?.daily_limit && (
                <>
                  <Text style={styles.additiveDetailsTitle}>Limite journalière</Text>
                  <Text style={styles.additiveDetails}>{selectedAdditive?.daily_limit}</Text>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { fontSize: 16, color: colors.textSecondary, marginTop: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surface },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerAction: { padding: 8, marginLeft: 4 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  productCard: { backgroundColor: '#FFF', padding: 20, margin: 16, borderRadius: 16 },
  productRow: { flexDirection: 'row', alignItems: 'center' },
  productImage: { width: 80, height: 80, borderRadius: 12, resizeMode: 'contain', backgroundColor: colors.surface },
  productImagePlaceholder: { width: 80, height: 80, borderRadius: 12, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1, marginLeft: 16 },
  productName: { fontSize: 18, fontWeight: '600', color: colors.text },
  productBrand: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  scoreCard: { backgroundColor: '#FFF', padding: 24, marginHorizontal: 16, marginBottom: 16, borderRadius: 16, alignItems: 'center' },
  scoreTitle: { fontSize: 16, fontWeight: '500', color: colors.textSecondary, marginBottom: 16 },
  scoreDescription: { fontSize: 16, color: colors.text, marginTop: 12, fontWeight: '500', textAlign: 'center' },
  proTipCard: { backgroundColor: colors.surfaceAlt, padding: 16, marginHorizontal: 16, marginBottom: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: colors.primary },
  proTipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  proTipTitle: { fontSize: 14, fontWeight: '600', color: colors.primary, marginLeft: 8 },
  proTipText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  badgesRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16 },
  badgeCard: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 12, alignItems: 'center', marginHorizontal: 4 },
  badgeLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  nutriScoreBadge: { width: 48, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  nutriScoreText: { color: '#FFF', fontSize: 24, fontWeight: '700' },
  novaBadge: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  novaText: { fontSize: 24, fontWeight: '700', color: colors.text },
  novaDescription: { fontSize: 10, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },
  sectionCard: { backgroundColor: '#FFF', padding: 20, marginHorizontal: 16, marginBottom: 16, borderRadius: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionCardTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 16 },
  sectionTitleDanger: { fontSize: 16, fontWeight: '600', color: colors.error, marginLeft: 8 },
  riskItem: { backgroundColor: '#FFF5F5', padding: 14, borderRadius: 10, marginBottom: 10, borderLeftWidth: 4 },
  riskTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  riskDescription: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  additiveItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surface },
  additiveIndicator: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  additiveInfo: { flex: 1 },
  additiveCode: { fontSize: 14, fontWeight: '600', color: colors.text },
  additiveName: { fontSize: 13, color: colors.textSecondary },
  alternativesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  alternativesBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.success, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  alternativesBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  alternativeItem: { flexDirection: 'column', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surface },
  alternativeContent: { flexDirection: 'row', alignItems: 'center' },
  alternativeImageContainer: { width: 44, height: 44, borderRadius: 8, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  alternativeImage: { width: 44, height: 44, resizeMode: 'contain' },
  alternativeInfo: { flex: 1, marginLeft: 12 },
  alternativeName: { fontSize: 14, fontWeight: '500', color: colors.text },
  alternativeBrand: { fontSize: 12, color: colors.textSecondary },
  alternativeScore: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  alternativeScoreText: { color: '#FFF', fontWeight: '600', fontSize: 12 },
  scoreGain: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  scoreGainText: { fontSize: 11, fontWeight: '600', color: colors.success, marginLeft: 2 },
  buyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF9800', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, alignSelf: 'flex-end', marginTop: 10 },
  buyButtonText: { color: '#FFF', fontSize: 13, fontWeight: '600', marginLeft: 6 },
  goodChoiceCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, alignItems: 'center', marginHorizontal: 16, marginTop: 16 },
  goodChoiceTitle: { fontSize: 16, fontWeight: '700', color: colors.success, marginTop: 8 },
  goodChoiceText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
  scanAnotherButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, marginHorizontal: 16, marginVertical: 20, paddingVertical: 16, borderRadius: 12 },
  scanAnotherButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  notFoundTitle: { fontSize: 20, fontWeight: '600', color: colors.text, marginTop: 16 },
  notFoundText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
  scanAgainButton: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, marginTop: 24 },
  scanAgainButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.surface },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  modalBody: { padding: 20 },
  additiveTitleModal: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 },
  riskBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 20 },
  riskBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  additiveDetailsTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 16, marginBottom: 8 },
  additiveDetails: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
});
