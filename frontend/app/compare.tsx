// Compare Products Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { fetchProductAPI, searchProductsAPI } from '../src/services/api';
import { colors, getScoreColor, getNutriScoreColor } from '../src/styles/colors';
import { Product } from '../src/types';

export default function CompareScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  
  const [product1, setProduct1] = useState<Product | null>(null);
  const [product2, setProduct2] = useState<Product | null>(null);
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);
  
  const [showScanner, setShowScanner] = useState<1 | 2 | null>(null);
  const [showSearch, setShowSearch] = useState<1 | 2 | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    const targetSlot = showScanner;
    setShowScanner(null);
    
    if (targetSlot === 1) {
      setLoading1(true);
      try {
        const product = await fetchProductAPI(data);
        if (product.found) setProduct1(product);
      } catch (error) {
        console.log('Error fetching product 1:', error);
      } finally {
        setLoading1(false);
      }
    } else if (targetSlot === 2) {
      setLoading2(true);
      try {
        const product = await fetchProductAPI(data);
        if (product.found) setProduct2(product);
      } catch (error) {
        console.log('Error fetching product 2:', error);
      } finally {
        setLoading2(false);
      }
    }
  };

  const searchProducts = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const data = await searchProductsAPI(searchQuery);
      setSearchResults(data.products || []);
    } catch (error) {
      console.log('Search error:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectSearchResult = async (barcode: string) => {
    const targetSlot = showSearch;
    setShowSearch(null);
    setSearchQuery('');
    setSearchResults([]);
    
    if (targetSlot === 1) {
      setLoading1(true);
      try {
        const product = await fetchProductAPI(barcode);
        if (product.found) setProduct1(product);
      } catch (error) {
        console.log('Error:', error);
      } finally {
        setLoading1(false);
      }
    } else if (targetSlot === 2) {
      setLoading2(true);
      try {
        const product = await fetchProductAPI(barcode);
        if (product.found) setProduct2(product);
      } catch (error) {
        console.log('Error:', error);
      } finally {
        setLoading2(false);
      }
    }
  };

  const getWinner = (val1: number, val2: number, lowerIsBetter: boolean = false) => {
    if (val1 === val2) return 'tie';
    if (lowerIsBetter) {
      return val1 < val2 ? 1 : 2;
    }
    return val1 > val2 ? 1 : 2;
  };

  const renderProductSlot = (slot: 1 | 2, product: Product | null, loading: boolean) => (
    <View style={styles.productSlot}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : product ? (
        <View style={styles.productInfo}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.productImage} />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="cube-outline" size={30} color={colors.textSecondary} />
            </View>
          )}
          <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.productBrand}>{product.brand || 'Marque inconnue'}</Text>
          <View style={[styles.scoreCircle, { backgroundColor: getScoreColor(product.health_score) }]}>
            <Text style={styles.scoreText}>{product.health_score}</Text>
          </View>
          <TouchableOpacity 
            style={styles.changeButton} 
            onPress={() => slot === 1 ? setProduct1(null) : setProduct2(null)}
          >
            <Ionicons name="close-circle" size={20} color={colors.error} />
            <Text style={styles.changeButtonText}>Changer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptySlot}>
          <Text style={styles.slotTitle}>Produit {slot}</Text>
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => {
              if (permission?.granted) {
                setShowScanner(slot);
              } else {
                requestPermission();
              }
            }}
          >
            <Ionicons name="barcode-outline" size={24} color={colors.primary} />
            <Text style={styles.addButtonText}>Scanner</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.addButtonAlt} 
            onPress={() => setShowSearch(slot)}
          >
            <Ionicons name="search-outline" size={24} color={colors.primary} />
            <Text style={styles.addButtonText}>Rechercher</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderComparison = () => {
    if (!product1 || !product2) return null;

    const comparisons = [
      { label: 'Score Santé', val1: product1.health_score, val2: product2.health_score, unit: '/100' },
      { label: 'Nutri-Score', val1: product1.nutri_score_grade, val2: product2.nutri_score_grade, isGrade: true },
      { label: 'NOVA', val1: product1.nova_group, val2: product2.nova_group, lowerIsBetter: true },
      { label: 'Calories', val1: product1.nutrients?.energy_kcal || 0, val2: product2.nutrients?.energy_kcal || 0, unit: ' kcal', lowerIsBetter: true },
      { label: 'Sucres', val1: product1.nutrients?.sugars || 0, val2: product2.nutrients?.sugars || 0, unit: 'g', lowerIsBetter: true },
      { label: 'Graisses sat.', val1: product1.nutrients?.saturated_fat || 0, val2: product2.nutrients?.saturated_fat || 0, unit: 'g', lowerIsBetter: true },
      { label: 'Sel', val1: product1.nutrients?.salt || 0, val2: product2.nutrients?.salt || 0, unit: 'g', lowerIsBetter: true },
      { label: 'Protéines', val1: product1.nutrients?.proteins || 0, val2: product2.nutrients?.proteins || 0, unit: 'g' },
      { label: 'Fibres', val1: product1.nutrients?.fiber || 0, val2: product2.nutrients?.fiber || 0, unit: 'g' },
      { label: 'Additifs', val1: product1.additives?.length || 0, val2: product2.additives?.length || 0, lowerIsBetter: true },
    ];

    // Calculate overall winner
    let score1 = 0, score2 = 0;
    comparisons.forEach(c => {
      if (c.isGrade) {
        const gradeOrder = ['A', 'B', 'C', 'D', 'E'];
        const idx1 = gradeOrder.indexOf(String(c.val1).toUpperCase());
        const idx2 = gradeOrder.indexOf(String(c.val2).toUpperCase());
        if (idx1 < idx2) score1++;
        else if (idx2 < idx1) score2++;
      } else {
        const winner = getWinner(Number(c.val1), Number(c.val2), c.lowerIsBetter);
        if (winner === 1) score1++;
        else if (winner === 2) score2++;
      }
    });

    const overallWinner = score1 > score2 ? 1 : score2 > score1 ? 2 : 'tie';

    return (
      <View style={styles.comparisonContainer}>
        {/* Winner Banner */}
        <View style={[styles.winnerBanner, { backgroundColor: overallWinner === 'tie' ? colors.warning : colors.success }]}>
          <Ionicons name="trophy" size={24} color="#FFF" />
          <Text style={styles.winnerText}>
            {overallWinner === 'tie' 
              ? 'Égalité !' 
              : `${overallWinner === 1 ? product1.name : product2.name} gagne !`}
          </Text>
        </View>

        {/* Comparison Table */}
        <View style={styles.comparisonTable}>
          {comparisons.map((comp, index) => {
            let winner: number | 'tie' = 'tie';
            if (comp.isGrade) {
              const gradeOrder = ['A', 'B', 'C', 'D', 'E'];
              const idx1 = gradeOrder.indexOf(String(comp.val1).toUpperCase());
              const idx2 = gradeOrder.indexOf(String(comp.val2).toUpperCase());
              if (idx1 < idx2) winner = 1;
              else if (idx2 < idx1) winner = 2;
            } else {
              winner = getWinner(Number(comp.val1), Number(comp.val2), comp.lowerIsBetter);
            }

            return (
              <View key={index} style={styles.comparisonRow}>
                <View style={[styles.comparisonCell, winner === 1 && styles.winnerCell]}>
                  <Text style={[styles.comparisonValue, winner === 1 && styles.winnerValue]}>
                    {comp.isGrade ? String(comp.val1).toUpperCase() : `${comp.val1}${comp.unit || ''}`}
                  </Text>
                  {winner === 1 && <Ionicons name="checkmark-circle" size={16} color={colors.success} />}
                </View>
                <View style={styles.comparisonLabelContainer}>
                  <Text style={styles.comparisonLabel}>{comp.label}</Text>
                </View>
                <View style={[styles.comparisonCell, winner === 2 && styles.winnerCell]}>
                  <Text style={[styles.comparisonValue, winner === 2 && styles.winnerValue]}>
                    {comp.isGrade ? String(comp.val2).toUpperCase() : `${comp.val2}${comp.unit || ''}`}
                  </Text>
                  {winner === 2 && <Ionicons name="checkmark-circle" size={16} color={colors.success} />}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Comparer les produits</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Product Slots */}
        <View style={styles.productsRow}>
          {renderProductSlot(1, product1, loading1)}
          <View style={styles.vsContainer}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          {renderProductSlot(2, product2, loading2)}
        </View>

        {/* Comparison Results */}
        {product1 && product2 && renderComparison()}

        {/* Instructions */}
        {(!product1 || !product2) && (
          <View style={styles.instructions}>
            <Ionicons name="information-circle" size={24} color={colors.primary} />
            <Text style={styles.instructionsText}>
              Scannez ou recherchez deux produits pour les comparer
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Scanner Modal */}
      <Modal visible={showScanner !== null} animationType="slide">
        <View style={styles.scannerContainer}>
          {permission?.granted && (
            <CameraView
              style={StyleSheet.absoluteFillObject}
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
              onBarcodeScanned={handleBarCodeScanned}
            />
          )}
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerHeader}>
              <TouchableOpacity onPress={() => setShowScanner(null)}>
                <Ionicons name="close" size={32} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.scannerTitle}>Scanner produit {showScanner}</Text>
              <View style={{ width: 32 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Search Modal */}
      <Modal visible={showSearch !== null} animationType="slide">
        <SafeAreaView style={styles.searchModal}>
          <View style={styles.searchHeader}>
            <TouchableOpacity onPress={() => { setShowSearch(null); setSearchQuery(''); setSearchResults([]); }}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.searchTitle}>Rechercher produit {showSearch}</Text>
            <View style={{ width: 28 }} />
          </View>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Nom du produit..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={searchProducts}
              returnKeyType="search"
              autoFocus
            />
          </View>
          {searchLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <ScrollView style={styles.searchResults}>
              {searchResults.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.searchResultItem}
                  onPress={() => selectSearchResult(item.barcode)}
                >
                  <View style={styles.searchResultImage}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.resultImage} />
                    ) : (
                      <Ionicons name="cube-outline" size={24} color={colors.textSecondary} />
                    )}
                  </View>
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.searchResultBrand}>{item.brand || 'Marque inconnue'}</Text>
                  </View>
                  <View style={[styles.searchResultScore, { backgroundColor: getScoreColor(item.health_score) }]}>
                    <Text style={styles.searchResultScoreText}>{item.health_score}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surface },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  productsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  productSlot: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 16, minHeight: 200, justifyContent: 'center', alignItems: 'center' },
  vsContainer: { width: 40, alignItems: 'center' },
  vsText: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  emptySlot: { alignItems: 'center' },
  slotTitle: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 16 },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.primary },
  addButtonAlt: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  addButtonText: { fontSize: 14, fontWeight: '600', color: colors.primary, marginLeft: 8 },
  productInfo: { alignItems: 'center', width: '100%' },
  productImage: { width: 70, height: 70, borderRadius: 12, resizeMode: 'contain', backgroundColor: '#FFF' },
  productImagePlaceholder: { width: 70, height: 70, borderRadius: 12, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  productName: { fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'center', marginTop: 8 },
  productBrand: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  scoreCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  scoreText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  changeButton: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  changeButtonText: { fontSize: 12, color: colors.error, marginLeft: 4 },
  comparisonContainer: { marginTop: 8 },
  winnerBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, marginBottom: 16 },
  winnerText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginLeft: 8 },
  comparisonTable: { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' },
  comparisonRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.background },
  comparisonCell: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12 },
  winnerCell: { backgroundColor: colors.surfaceAlt },
  comparisonValue: { fontSize: 14, fontWeight: '600', color: colors.text, marginRight: 4 },
  winnerValue: { color: colors.success },
  comparisonLabelContainer: { width: 100, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', paddingVertical: 12 },
  comparisonLabel: { fontSize: 11, fontWeight: '500', color: colors.textSecondary, textAlign: 'center' },
  instructions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, padding: 16, borderRadius: 12, marginTop: 16 },
  instructionsText: { fontSize: 14, color: colors.text, marginLeft: 8, flex: 1 },
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scannerOverlay: { ...StyleSheet.absoluteFillObject },
  scannerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, backgroundColor: 'rgba(0,0,0,0.5)' },
  scannerTitle: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  searchModal: { flex: 1, backgroundColor: colors.background },
  searchHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surface },
  searchTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 12, margin: 16, height: 48 },
  searchInput: { flex: 1, fontSize: 16, marginLeft: 8, color: colors.text },
  searchResults: { flex: 1, paddingHorizontal: 16 },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 8 },
  searchResultImage: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  resultImage: { width: 44, height: 44, resizeMode: 'contain' },
  searchResultInfo: { flex: 1, marginLeft: 12 },
  searchResultName: { fontSize: 14, fontWeight: '500', color: colors.text },
  searchResultBrand: { fontSize: 12, color: colors.textSecondary },
  searchResultScore: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  searchResultScoreText: { color: '#FFF', fontWeight: '600', fontSize: 12 },
});
