// Search Tab Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/contexts/AppContext';
import { searchProductsAPI } from '../../src/services/api';
import { colors, getScoreColor } from '../../src/styles/colors';

export default function SearchScreen() {
  const router = useRouter();
  const { fetchProduct } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const searchProducts = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await searchProductsAPI(searchQuery);
      setSearchResults(data.products || []);
    } catch (error) {
      console.log('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductPress = async (barcode: string) => {
    await fetchProduct(barcode);
    router.push('/product');
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => handleProductPress(item.barcode)}>
      <View style={styles.resultImageContainer}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.resultImage} />
        ) : (
          <Ionicons name="cube-outline" size={30} color={colors.textSecondary} />
        )}
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.resultBrand} numberOfLines={1}>{item.brand || 'Marque inconnue'}</Text>
      </View>
      <View style={[styles.resultScore, { backgroundColor: getScoreColor(item.health_score) }]}>
        <Text style={styles.resultScoreText}>{item.health_score}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un produit..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={searchProducts}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : searchResults.length === 0 ? (
        <View style={styles.emptyStateLarge}>
          <Ionicons name="search-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyStateTitle}>Rechercher un aliment</Text>
          <Text style={styles.emptyStateSubtext}>Tapez le nom d'un produit pour le trouver</Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item, index) => item.barcode || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 12, marginHorizontal: 16, marginVertical: 16, height: 48 },
  searchInput: { flex: 1, fontSize: 16, marginLeft: 8, color: colors.text },
  emptyStateLarge: { alignItems: 'center', paddingVertical: 60 },
  emptyStateTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
  resultItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 8 },
  resultImageContainer: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  resultImage: { width: 48, height: 48, resizeMode: 'contain' },
  resultInfo: { flex: 1, marginLeft: 12 },
  resultName: { fontSize: 14, fontWeight: '500', color: colors.text },
  resultBrand: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  resultScore: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  resultScoreText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
