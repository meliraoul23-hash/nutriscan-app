// Home Tab Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useApp } from '../../src/contexts/AppContext';
import { colors, getScoreColor } from '../../src/styles/colors';
import { ProductCard, HealingFoodCard } from '../../src/components';
import { HealingFood } from '../../src/types';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { history, healingFoods, recommendations, refreshing, onRefresh, fetchProduct } = useApp();
  const [selectedHealingFood, setSelectedHealingFood] = useState<HealingFood | null>(null);
  const [showHealingFoodModal, setShowHealingFoodModal] = useState(false);

  const openScanner = () => {
    router.push('/scanner');
  };

  const handleProductPress = (barcode: string) => {
    fetchProduct(barcode);
    router.push('/product');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <Ionicons name="leaf" size={48} color={colors.primary} />
          </View>
          <Text style={styles.title}>NutriScan</Text>
          <Text style={styles.subtitle}>Scannez. Analysez. Mangez mieux.</Text>
        </View>

        {/* Scan Button */}
        <TouchableOpacity style={styles.scanButton} onPress={openScanner} activeOpacity={0.8}>
          <View style={styles.scanButtonInner}>
            <Ionicons name="barcode-outline" size={32} color="#FFF" />
            <Text style={styles.scanButtonText}>Scanner un produit</Text>
          </View>
        </TouchableOpacity>

        {/* Recent Scans */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Scans récents</Text>
          {history.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>Aucun scan récent</Text>
            </View>
          ) : (
            history.slice(0, 5).map((item) => (
              <ProductCard
                key={item.id}
                barcode={item.barcode}
                name={item.product_name}
                brand={item.brand}
                imageUrl={item.image_url}
                healthScore={item.health_score}
                onPress={() => handleProductPress(item.barcode)}
              />
            ))
          )}
        </View>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Recommandations pour vous</Text>
            <Text style={styles.sectionSubtitle}>Alternatives plus saines à vos produits habituels</Text>
            {recommendations.slice(0, 3).map((rec, index) => (
              <ProductCard
                key={index}
                barcode={rec.barcode}
                name={rec.name}
                brand={rec.replaces ? `Remplace: ${rec.replaces}` : rec.brand}
                imageUrl={rec.image_url}
                healthScore={rec.health_score}
                onPress={() => handleProductPress(rec.barcode)}
              />
            ))}
          </View>
        )}

        {/* Healing Foods */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Aliments naturels bienfaisants</Text>
          <Text style={styles.sectionSubtitle}>Aliments validés par la science pour votre santé</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.healingFoodsScroll}>
            {healingFoods.map((food, index) => (
              <HealingFoodCard
                key={index}
                food={food}
                onPress={() => {
                  setSelectedHealingFood(food);
                  setShowHealingFoodModal(true);
                }}
              />
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Healing Food Modal */}
      <Modal visible={showHealingFoodModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.healingFoodModalTitleContainer}>
                <Text style={styles.healingFoodModalEmoji}>{selectedHealingFood?.image}</Text>
                <Text style={styles.modalTitle}>{selectedHealingFood?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowHealingFoodModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {/* Benefits */}
              <View style={styles.healingFoodSection}>
                <View style={styles.healingFoodSectionHeader}>
                  <Ionicons name="sparkles" size={20} color={colors.primary} />
                  <Text style={styles.healingFoodSectionTitle}>Bienfaits</Text>
                </View>
                <View style={styles.healingFoodTagsContainer}>
                  {selectedHealingFood?.benefits.map((benefit, index) => (
                    <View key={index} style={styles.benefitTag}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                      <Text style={styles.benefitText}>{benefit}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Conditions */}
              <View style={styles.healingFoodSection}>
                <View style={styles.healingFoodSectionHeader}>
                  <Ionicons name="medical" size={20} color={colors.warning} />
                  <Text style={styles.healingFoodSectionTitle}>Peut aider pour</Text>
                </View>
                <View style={styles.healingFoodTagsContainer}>
                  {selectedHealingFood?.conditions.map((condition, index) => (
                    <View key={index} style={styles.conditionTag}>
                      <Text style={styles.conditionText}>{condition}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Source */}
              <View style={styles.sourceSection}>
                <Ionicons name="document-text" size={16} color={colors.textSecondary} />
                <Text style={styles.sourceText}>Source: {selectedHealingFood?.source}</Text>
              </View>

              {/* Disclaimer */}
              <View style={styles.disclaimer}>
                <Ionicons name="information-circle" size={20} color={colors.textSecondary} />
                <Text style={styles.disclaimerText}>
                  Ces informations sont à titre informatif et ne remplacent pas un avis médical.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  heroSection: { alignItems: 'center', marginBottom: 24, paddingTop: 16 },
  logoContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  scanButton: { marginBottom: 24 },
  scanButtonInner: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16 },
  scanButtonText: { color: '#FFF', fontSize: 18, fontWeight: '600', marginLeft: 12 },
  sectionContainer: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 },
  sectionSubtitle: { fontSize: 12, color: colors.textSecondary, marginBottom: 12, marginTop: -4 },
  emptyState: { alignItems: 'center', paddingVertical: 32, backgroundColor: colors.surface, borderRadius: 16 },
  emptyStateText: { fontSize: 16, fontWeight: '500', color: colors.textSecondary, marginTop: 12 },
  healingFoodsScroll: { marginHorizontal: -16, paddingHorizontal: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.surface },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  modalBody: { padding: 20 },
  healingFoodModalTitleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  healingFoodModalEmoji: { fontSize: 28, marginRight: 12 },
  healingFoodSection: { marginBottom: 24 },
  healingFoodSectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  healingFoodSectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginLeft: 8 },
  healingFoodTagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  benefitTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  benefitText: { fontSize: 14, color: colors.text, marginLeft: 6, fontWeight: '500' },
  conditionTag: { backgroundColor: '#FFF3E0', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.warning },
  conditionText: { fontSize: 14, color: colors.warning, fontWeight: '500' },
  sourceSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.surface },
  sourceText: { fontSize: 13, color: colors.textSecondary, marginLeft: 8, fontStyle: 'italic' },
  disclaimer: { flexDirection: 'row', backgroundColor: colors.surface, padding: 12, borderRadius: 12, marginBottom: 20 },
  disclaimerText: { fontSize: 12, color: colors.textSecondary, marginLeft: 8, flex: 1, lineHeight: 18 },
});
