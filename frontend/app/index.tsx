import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import axios from 'axios';
import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');

// Get backend URL
const getApiUrl = () => {
  const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL 
    || process.env.EXPO_PUBLIC_BACKEND_URL 
    || '';
  return `${backendUrl}/api`;
};

const API_URL = getApiUrl();

// Types
interface Product {
  barcode: string;
  name: string;
  brand: string;
  image_url: string;
  health_score: number;
  nutri_score: string;
  nutri_score_grade: string;
  nova_group: number;
  additives: Additive[];
  nutrients: Nutrients;
  categories: string[];
  pro_tip: string;
  found: boolean;
}

interface Additive {
  code: string;
  name: string;
  risk: 'high' | 'medium' | 'low';
  description: string;
}

interface Nutrients {
  energy_kcal: number;
  fat: number;
  saturated_fat: number;
  carbohydrates: number;
  sugars: number;
  fiber: number;
  proteins: number;
  salt: number;
}

interface Alternative {
  barcode: string;
  name: string;
  brand: string;
  image_url: string;
  health_score: number;
  nutri_score: string;
}

interface ScanHistory {
  id: string;
  barcode: string;
  product_name: string;
  brand: string;
  image_url: string;
  health_score: number;
  nutri_score: string;
  timestamp: string;
}

// Color scheme
const colors = {
  primary: '#4CAF50',
  primaryLight: '#81C784',
  primaryDark: '#388E3C',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  text: '#212121',
  textSecondary: '#757575',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  scoreHigh: '#4CAF50',
  scoreMedium: '#FF9800',
  scoreLow: '#F44336',
};

// Helper functions
const getScoreColor = (score: number): string => {
  if (score >= 70) return colors.scoreHigh;
  if (score >= 40) return colors.scoreMedium;
  return colors.scoreLow;
};

const getNutriScoreColor = (grade: string): string => {
  const gradeColors: { [key: string]: string } = {
    'A': '#038141',
    'B': '#85BB2F',
    'C': '#FECB02',
    'D': '#EE8100',
    'E': '#E63E11',
  };
  return gradeColors[grade.toUpperCase()] || colors.textSecondary;
};

const getAdditiveColor = (risk: string): string => {
  if (risk === 'high') return colors.error;
  if (risk === 'medium') return colors.warning;
  return colors.success;
};

export default function NutriScanApp() {
  // State
  const [currentScreen, setCurrentScreen] = useState<'home' | 'scanner' | 'product'>('home');
  const [product, setProduct] = useState<Product | null>(null);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [history, setHistory] = useState<ScanHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Fetch history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/history`);
      setHistory(response.data);
    } catch (error) {
      console.log('Error fetching history:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  }, []);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    await fetchProduct(data);
  };

  const fetchProduct = async (barcode: string) => {
    setLoading(true);
    try {
      // Fetch product
      const response = await axios.get(`${API_URL}/product/${barcode}`);
      const productData = response.data;
      setProduct(productData);

      if (productData.found) {
        // Save to history
        await axios.post(`${API_URL}/history`, {
          barcode: productData.barcode,
          product_name: productData.name,
          brand: productData.brand,
          image_url: productData.image_url,
          health_score: productData.health_score,
          nutri_score: productData.nutri_score,
        });

        // Fetch alternatives if score is below 70
        if (productData.health_score < 70) {
          try {
            const altResponse = await axios.get(`${API_URL}/alternatives/${barcode}`);
            setAlternatives(altResponse.data);
          } catch (e) {
            setAlternatives([]);
          }
        } else {
          setAlternatives([]);
        }

        // Refresh history
        fetchHistory();
      }

      setCurrentScreen('product');
    } catch (error) {
      console.log('Error fetching product:', error);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const openScanner = () => {
    setScanned(false);
    setCurrentScreen('scanner');
  };

  const goHome = () => {
    setCurrentScreen('home');
    setProduct(null);
    setAlternatives([]);
    setScanned(false);
  };

  // Render Home Screen
  const renderHomeScreen = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.logoContainer}>
          <Ionicons name="leaf" size={48} color={colors.primary} />
        </View>
        <Text style={styles.title}>NutriScan</Text>
        <Text style={styles.subtitle}>Scan. Analyze. Eat Better.</Text>
      </View>

      {/* Scan Button */}
      <TouchableOpacity style={styles.scanButton} onPress={openScanner} activeOpacity={0.8}>
        <View style={styles.scanButtonInner}>
          <Ionicons name="barcode-outline" size={32} color="#FFF" />
          <Text style={styles.scanButtonText}>Scan a Product</Text>
        </View>
      </TouchableOpacity>

      {/* Recent Scans */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Recent Scans</Text>
        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>No recent scans</Text>
            <Text style={styles.emptyStateSubtext}>Scan your first product to get started!</Text>
          </View>
        ) : (
          history.slice(0, 5).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.historyItem}
              onPress={() => fetchProduct(item.barcode)}
              activeOpacity={0.7}
            >
              <View style={styles.historyImageContainer}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.historyImage} />
                ) : (
                  <Ionicons name="cube-outline" size={30} color={colors.textSecondary} />
                )}
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyName} numberOfLines={1}>
                  {item.product_name}
                </Text>
                <Text style={styles.historyBrand} numberOfLines={1}>
                  {item.brand || 'Unknown brand'}
                </Text>
              </View>
              <View
                style={[
                  styles.historyScore,
                  { backgroundColor: getScoreColor(item.health_score) },
                ]}
              >
                <Text style={styles.historyScoreText}>{item.health_score}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );

  // Render Scanner Screen
  const renderScannerScreen = () => {
    if (!permission) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.centered}>
          <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.permissionText}>Camera access is required</Text>
          <Text style={styles.permissionSubtext}>
            Please allow camera access to scan product barcodes
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={goHome}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.scannerContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />

        {/* Scanner Overlay */}
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerOverlayTop} />
          <View style={styles.scannerOverlayMiddle}>
            <View style={styles.scannerOverlaySide} />
            <View style={styles.scannerFrame}>
              <View style={[styles.scannerCorner, styles.scannerCornerTL]} />
              <View style={[styles.scannerCorner, styles.scannerCornerTR]} />
              <View style={[styles.scannerCorner, styles.scannerCornerBL]} />
              <View style={[styles.scannerCorner, styles.scannerCornerBR]} />
            </View>
            <View style={styles.scannerOverlaySide} />
          </View>
          <View style={styles.scannerOverlayBottom}>
            <Text style={styles.scannerHint}>Position barcode within the frame</Text>
          </View>
        </View>

        {/* Loading indicator */}
        {loading && (
          <View style={styles.scannerLoading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.scannerLoadingText}>Analyzing product...</Text>
          </View>
        )}

        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={goHome}>
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>
    );
  };

  // Render Product Screen
  const renderProductScreen = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading product...</Text>
        </View>
      );
    }

    if (!product) {
      return (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.errorText}>Error loading product</Text>
          <TouchableOpacity style={styles.retryButton} onPress={goHome}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!product.found) {
      return (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.notFoundTitle}>Product Not Found</Text>
          <Text style={styles.notFoundText}>
            This product isn't in our database yet.
          </Text>
          <TouchableOpacity style={styles.scanAgainButton} onPress={openScanner}>
            <Text style={styles.scanAgainButtonText}>Scan Another Product</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={goHome}>
            <Text style={styles.backButtonText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.productScrollContent}>
        {/* Header */}
        <View style={styles.productHeader}>
          <TouchableOpacity style={styles.productBackButton} onPress={goHome}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.productHeaderTitle}>Product Details</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Product Info */}
        <View style={styles.productCard}>
          <View style={styles.productInfoRow}>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={styles.productImage} />
            ) : (
              <View style={styles.productImagePlaceholder}>
                <Ionicons name="cube-outline" size={50} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.productTextInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productBrand}>{product.brand}</Text>
            </View>
          </View>
        </View>

        {/* Health Score */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreTitle}>Health Score</Text>
          <View style={styles.scoreCircleContainer}>
            <View
              style={[
                styles.scoreCircle,
                { borderColor: getScoreColor(product.health_score) },
              ]}
            >
              <Text
                style={[
                  styles.scoreValue,
                  { color: getScoreColor(product.health_score) },
                ]}
              >
                {product.health_score}
              </Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
          </View>
          <Text style={styles.scoreDescription}>
            {product.health_score >= 70
              ? 'Excellent choice!'
              : product.health_score >= 40
              ? 'Moderate - Consider alternatives'
              : 'Poor - Look for better options'}
          </Text>
        </View>

        {/* Pro Tip */}
        <View style={styles.proTipCard}>
          <View style={styles.proTipHeader}>
            <Ionicons name="bulb-outline" size={20} color={colors.primary} />
            <Text style={styles.proTipTitle}>Pro Tip</Text>
          </View>
          <Text style={styles.proTipText}>{product.pro_tip}</Text>
        </View>

        {/* Nutri-Score and NOVA */}
        <View style={styles.badgesRow}>
          {product.nutri_score && (
            <View style={styles.badgeCard}>
              <Text style={styles.badgeLabel}>Nutri-Score</Text>
              <View
                style={[
                  styles.nutriScoreBadge,
                  { backgroundColor: getNutriScoreColor(product.nutri_score) },
                ]}
              >
                <Text style={styles.nutriScoreText}>{product.nutri_score}</Text>
              </View>
            </View>
          )}
          {product.nova_group > 0 && (
            <View style={styles.badgeCard}>
              <Text style={styles.badgeLabel}>NOVA Group</Text>
              <View style={styles.novaBadge}>
                <Text style={styles.novaText}>{product.nova_group}</Text>
              </View>
              <Text style={styles.novaDescription}>
                {product.nova_group === 1
                  ? 'Unprocessed'
                  : product.nova_group === 2
                  ? 'Processed ingredients'
                  : product.nova_group === 3
                  ? 'Processed'
                  : 'Ultra-processed'}
              </Text>
            </View>
          )}
        </View>

        {/* Nutrients */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Nutritional Values (per 100g)</Text>
          <View style={styles.nutrientGrid}>
            <View style={styles.nutrientItem}>
              <Text style={styles.nutrientValue}>{product.nutrients.energy_kcal || 0}</Text>
              <Text style={styles.nutrientLabel}>Calories</Text>
            </View>
            <View style={styles.nutrientItem}>
              <Text style={styles.nutrientValue}>{product.nutrients.proteins || 0}g</Text>
              <Text style={styles.nutrientLabel}>Protein</Text>
            </View>
            <View style={styles.nutrientItem}>
              <Text style={styles.nutrientValue}>{product.nutrients.carbohydrates || 0}g</Text>
              <Text style={styles.nutrientLabel}>Carbs</Text>
            </View>
            <View style={styles.nutrientItem}>
              <Text style={styles.nutrientValue}>{product.nutrients.fat || 0}g</Text>
              <Text style={styles.nutrientLabel}>Fat</Text>
            </View>
            <View style={styles.nutrientItem}>
              <Text
                style={[
                  styles.nutrientValue,
                  product.nutrients.sugars > 10 && { color: colors.error },
                ]}
              >
                {product.nutrients.sugars || 0}g
              </Text>
              <Text style={styles.nutrientLabel}>Sugars</Text>
            </View>
            <View style={styles.nutrientItem}>
              <Text style={styles.nutrientValue}>{product.nutrients.fiber || 0}g</Text>
              <Text style={styles.nutrientLabel}>Fiber</Text>
            </View>
          </View>
        </View>

        {/* Additives */}
        {product.additives.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionCardTitle}>Additives</Text>
            <View style={styles.additivesList}>
              {product.additives.map((additive, index) => (
                <View key={index} style={styles.additiveItem}>
                  <View
                    style={[
                      styles.additiveIndicator,
                      { backgroundColor: getAdditiveColor(additive.risk) },
                    ]}
                  />
                  <View style={styles.additiveInfo}>
                    <Text style={styles.additiveCode}>{additive.code}</Text>
                    <Text style={styles.additiveName}>{additive.name}</Text>
                    <Text style={styles.additiveDescription}>{additive.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Alternatives */}
        {alternatives.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionCardTitle}>Healthier Alternatives</Text>
            {alternatives.map((alt, index) => (
              <TouchableOpacity
                key={index}
                style={styles.alternativeItem}
                onPress={() => fetchProduct(alt.barcode)}
                activeOpacity={0.7}
              >
                <View style={styles.alternativeImageContainer}>
                  {alt.image_url ? (
                    <Image source={{ uri: alt.image_url }} style={styles.alternativeImage} />
                  ) : (
                    <Ionicons name="cube-outline" size={24} color={colors.textSecondary} />
                  )}
                </View>
                <View style={styles.alternativeInfo}>
                  <Text style={styles.alternativeName} numberOfLines={1}>
                    {alt.name}
                  </Text>
                  <Text style={styles.alternativeBrand} numberOfLines={1}>
                    {alt.brand}
                  </Text>
                </View>
                <View
                  style={[
                    styles.alternativeScore,
                    { backgroundColor: getScoreColor(alt.health_score) },
                  ]}
                >
                  <Text style={styles.alternativeScoreText}>{alt.health_score}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Scan Another Button */}
        <TouchableOpacity style={styles.scanAnotherButton} onPress={openScanner}>
          <Ionicons name="barcode-outline" size={24} color="#FFF" />
          <Text style={styles.scanAnotherButtonText}>Scan Another Product</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {currentScreen === 'home' && renderHomeScreen()}
      {currentScreen === 'scanner' && renderScannerScreen()}
      {currentScreen === 'product' && renderProductScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  productScrollContent: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },

  // Scan Button
  scanButton: {
    marginBottom: 30,
  },
  scanButtonInner: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  scanButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },

  // Section
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: colors.surface,
    borderRadius: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.text,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },

  // History Item
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  historyImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  historyImage: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  historyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  historyName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  historyBrand: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  historyScore: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyScoreText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // Scanner
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  scannerOverlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scannerOverlayMiddle: {
    flexDirection: 'row',
  },
  scannerOverlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scannerFrame: {
    width: 280,
    height: 180,
    position: 'relative',
  },
  scannerCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.primary,
  },
  scannerCornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  scannerCornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  scannerCornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  scannerCornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scannerOverlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 30,
  },
  scannerHint: {
    color: '#FFF',
    fontSize: 16,
  },
  scannerLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerLoadingText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Permission
  permissionText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  permissionSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 16,
    paddingVertical: 10,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 16,
  },

  // Product Screen
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  productBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  productCard: {
    backgroundColor: '#FFF',
    padding: 20,
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  productInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    resizeMode: 'contain',
    backgroundColor: colors.surface,
  },
  productImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productTextInfo: {
    flex: 1,
    marginLeft: 16,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  productBrand: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // Score Card
  scoreCard: {
    backgroundColor: '#FFF',
    padding: 24,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 16,
  },
  scoreCircleContainer: {
    marginVertical: 8,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: '700',
  },
  scoreMax: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  scoreDescription: {
    fontSize: 16,
    color: colors.text,
    marginTop: 16,
    fontWeight: '500',
  },

  // Pro Tip
  proTipCard: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  proTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  proTipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  proTipText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },

  // Badges Row
  badgesRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  badgeCard: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  nutriScoreBadge: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nutriScoreText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
  },
  novaBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  novaText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  novaDescription: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },

  // Section Card
  sectionCard: {
    backgroundColor: '#FFF',
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },

  // Nutrients Grid
  nutrientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  nutrientItem: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  nutrientValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  nutrientLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // Additives
  additivesList: {
    gap: 12,
  },
  additiveItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  additiveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
  },
  additiveInfo: {
    flex: 1,
  },
  additiveCode: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  additiveName: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  additiveDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Alternatives
  alternativeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  alternativeImageContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  alternativeImage: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  alternativeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  alternativeName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  alternativeBrand: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  alternativeScore: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alternativeScoreText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },

  // Buttons
  scanAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginVertical: 20,
    paddingVertical: 16,
    borderRadius: 12,
  },
  scanAnotherButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.error,
    marginTop: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  notFoundText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  scanAgainButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
  },
  scanAgainButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
