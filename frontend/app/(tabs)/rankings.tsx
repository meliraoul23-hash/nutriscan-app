// Rankings Tab Screen
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/contexts/AppContext';
import { colors, getScoreColor } from '../../src/styles/colors';

export default function RankingsScreen() {
  const router = useRouter();
  const { rankings, fetchProduct, refreshing, onRefresh, fetchRankings } = useApp();

  const handleProductPress = (barcode: string) => {
    fetchProduct(barcode);
    router.push('/product');
  };

  // Filter products with score >= 85 (excellent products)
  const topProducts = rankings.filter(item => item.health_score >= 85).sort((a, b) => b.health_score - a.health_score);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.pageTitle}>Classement Santé</Text>
        <Text style={styles.pageSubtitle}>Les meilleurs produits (Score 85+)</Text>

        {rankings.length === 0 ? (
          <View style={styles.emptyStateLarge}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.emptyStateSubtext}>Chargement...</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchRankings}>
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : topProducts.length === 0 ? (
          <View style={styles.emptyStateLarge}>
            <Ionicons name="trophy-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>Chargement en cours...</Text>
            <Text style={styles.emptyStateSubtext}>Récupération des meilleurs produits</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchRankings}>
              <Text style={styles.retryButtonText}>Actualiser</Text>
            </TouchableOpacity>
          </View>
        ) : (
          topProducts.slice(0, 20).map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.rankingItem}
              onPress={() => handleProductPress(item.barcode)}
            >
              <View style={styles.rankingPosition}>
                <Text style={styles.rankingPositionText}>{index + 1}</Text>
              </View>
              <View style={styles.rankingImageContainer}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.rankingImage} />
                ) : (
                  <Ionicons name="leaf" size={24} color={colors.primary} />
                )}
              </View>
              <View style={styles.rankingInfo}>
                <Text style={styles.rankingName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.rankingBrand} numberOfLines={1}>{item.brand || ''}</Text>
              </View>
              <View style={[styles.rankingScore, { backgroundColor: getScoreColor(item.health_score) }]}>
                <Text style={styles.rankingScoreText}>{item.health_score}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 },
  pageSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 24 },
  emptyStateLarge: { alignItems: 'center', paddingVertical: 60 },
  emptyStateTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
  retryButton: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 16 },
  retryButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  rankingItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 8 },
  rankingPosition: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  rankingPositionText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  rankingImageContainer: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginLeft: 12 },
  rankingImage: { width: 44, height: 44, resizeMode: 'contain' },
  rankingInfo: { flex: 1, marginLeft: 12 },
  rankingName: { fontSize: 14, fontWeight: '500', color: colors.text },
  rankingBrand: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rankingScore: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  rankingScoreText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
