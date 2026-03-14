// History Tab Screen - Fixed
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/contexts/AppContext';
import { useAuth } from '../../src/contexts/AuthContext';

// Colors
const COLORS = {
  primary: '#34C759',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#00C853';
  if (score >= 60) return '#7CB342';
  if (score >= 45) return '#FFB300';
  if (score >= 30) return '#FF6D00';
  return '#DD2C00';
};

export default function HistoryScreen() {
  const router = useRouter();
  const { history, fetchProduct, productLoading } = useApp();
  const { isPremium } = useAuth();

  const handleProductPress = async (barcode: string) => {
    try {
      await fetchProduct(barcode);
      router.push('/product');
    } catch (error) {
      console.log('Error fetching product:', error);
    }
  };

  // Limit history for free users
  const displayHistory = isPremium ? history : (history || []).slice(0, 5);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Historique des scans</Text>
        
        {productLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : !history || history.length === 0 ? (
          <View style={styles.emptyStateLarge}>
            <Ionicons name="time-outline" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyStateTitle}>Aucun historique</Text>
            <Text style={styles.emptyStateSubtext}>Scannez des produits pour les voir ici</Text>
          </View>
        ) : (
          <>
            {displayHistory.map((item: any, index: number) => (
              <TouchableOpacity
                key={`${item.barcode}-${index}`}
                style={styles.historyItem}
                onPress={() => handleProductPress(item.barcode)}
                activeOpacity={0.7}
              >
                <View style={styles.historyImageContainer}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.historyImage} />
                  ) : (
                    <Ionicons name="cube-outline" size={32} color={COLORS.textSecondary} />
                  )}
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyName} numberOfLines={1}>{item.product_name}</Text>
                  <Text style={styles.historyBrand} numberOfLines={1}>{item.brand || 'Marque inconnue'}</Text>
                  {item.timestamp && (
                    <Text style={styles.historyDate}>
                      {new Date(item.timestamp).toLocaleDateString('fr-FR')}
                    </Text>
                  )}
                </View>
                <View style={[styles.historyScore, { backgroundColor: getScoreColor(item.health_score || 50) }]}>
                  <Text style={styles.historyScoreText}>{item.health_score || '--'}</Text>
                </View>
              </TouchableOpacity>
            ))}
            
            {/* Premium upsell for free users */}
            {!isPremium && history.length > 5 && (
              <TouchableOpacity style={styles.premiumCard} onPress={() => router.push('/premium')}>
                <Ionicons name="lock-closed" size={24} color="#FFB300" />
                <View style={styles.premiumInfo}>
                  <Text style={styles.premiumTitle}>Voir tout l'historique</Text>
                  <Text style={styles.premiumSubtitle}>+{history.length - 5} produits caches</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#FFB300" />
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
  loadingContainer: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 16 },
  emptyStateLarge: { alignItems: 'center', paddingVertical: 60 },
  emptyStateTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' },
  historyItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.surface, 
    borderRadius: 16, 
    padding: 14, 
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  historyImageContainer: { 
    width: 56, 
    height: 56, 
    borderRadius: 12, 
    backgroundColor: COLORS.background, 
    justifyContent: 'center', 
    alignItems: 'center', 
    overflow: 'hidden' 
  },
  historyImage: { width: 56, height: 56, resizeMode: 'contain' },
  historyInfo: { flex: 1, marginLeft: 12 },
  historyName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  historyBrand: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  historyDate: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  historyScore: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  historyScoreText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  premiumInfo: { flex: 1, marginLeft: 12 },
  premiumTitle: { fontSize: 15, fontWeight: '600', color: '#F57F17' },
  premiumSubtitle: { fontSize: 13, color: '#FFA000', marginTop: 2 },
});
