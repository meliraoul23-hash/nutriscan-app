// History Tab Screen
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/contexts/AppContext';
import { colors, getScoreColor } from '../../src/styles/colors';

export default function HistoryScreen() {
  const router = useRouter();
  const { history, fetchProduct } = useApp();

  const handleProductPress = (barcode: string) => {
    fetchProduct(barcode);
    router.push('/product');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Historique des scans</Text>
        {history.length === 0 ? (
          <View style={styles.emptyStateLarge}>
            <Ionicons name="time-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>Aucun historique</Text>
            <Text style={styles.emptyStateSubtext}>Scannez des produits pour les voir ici</Text>
          </View>
        ) : (
          history.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.historyItem}
              onPress={() => handleProductPress(item.barcode)}
            >
              <View style={styles.historyImageContainer}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.historyImage} />
                ) : (
                  <Ionicons name="cube-outline" size={40} color={colors.textSecondary} />
                )}
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyName} numberOfLines={1}>{item.product_name}</Text>
                <Text style={styles.historyBrand} numberOfLines={1}>{item.brand || 'Marque inconnue'}</Text>
                <Text style={styles.historyDate}>
                  {new Date(item.timestamp).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              <View style={[styles.historyScore, { backgroundColor: getScoreColor(item.health_score) }]}>
                <Text style={styles.historyScoreText}>{item.health_score}</Text>
                <Text style={styles.historyScoreLabel}>/100</Text>
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
  pageTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 24 },
  emptyStateLarge: { alignItems: 'center', paddingVertical: 60 },
  emptyStateTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
  historyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
  historyImageContainer: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  historyImage: { width: 60, height: 60, resizeMode: 'contain' },
  historyInfo: { flex: 1, marginLeft: 12 },
  historyName: { fontSize: 16, fontWeight: '500', color: colors.text },
  historyBrand: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  historyDate: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  historyScore: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  historyScoreText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  historyScoreLabel: { color: '#FFF', fontSize: 10 },
});
