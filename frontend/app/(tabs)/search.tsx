// Search Tab Screen - Fixed with instant search
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../src/contexts/AppContext';
import { searchProductsAPI } from '../../src/services/api';

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

export default function SearchScreen() {
  const router = useRouter();
  const { fetchProduct } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Debounced search - search after 500ms of typing
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearched(false);
      return;
    }

    const timer = setTimeout(() => {
      searchProducts();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchProducts = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchProductsAPI(searchQuery.trim());
      setSearchResults(data.products || []);
    } catch (error) {
      console.log('Search error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProductPress = async (barcode: string) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      await fetchProduct(barcode);
      router.push('/product');
    } catch (error) {
      console.log('Error fetching product:', error);
    }
  };

  const renderItem = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.resultItem} 
      onPress={() => handleProductPress(item.barcode)}
      activeOpacity={0.7}
    >
      <View style={styles.resultImageContainer}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.resultImage} />
        ) : (
          <Ionicons name="cube-outline" size={28} color={COLORS.textSecondary} />
        )}
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultName} numberOfLines={1}>{item.name || item.product_name}</Text>
        <Text style={styles.resultBrand} numberOfLines={1}>{item.brand || 'Marque inconnue'}</Text>
      </View>
      <View style={[styles.resultScore, { backgroundColor: getScoreColor(item.health_score || 50) }]}>
        <Text style={styles.resultScoreText}>{item.health_score || '--'}</Text>
      </View>
    </TouchableOpacity>
  ), []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un produit..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={searchProducts}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setSearched(false); }}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Recherche en cours...</Text>
        </View>
      ) : searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item, index) => item.barcode || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : searched ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={56} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Aucun résultat</Text>
          <Text style={styles.emptySubtitle}>Essayez avec un autre mot-clé</Text>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={56} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Rechercher un produit</Text>
          <Text style={styles.emptySubtitle}>Tapez au moins 2 caractères</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.surface, 
    borderRadius: 14, 
    paddingHorizontal: 14, 
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: { 
    flex: 1, 
    fontSize: 16, 
    marginLeft: 10, 
    color: COLORS.text 
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyState: { 
    alignItems: 'center', 
    paddingVertical: 80 
  },
  emptyTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: COLORS.text, 
    marginTop: 16 
  },
  emptySubtitle: { 
    fontSize: 14, 
    color: COLORS.textSecondary, 
    marginTop: 8, 
    textAlign: 'center' 
  },
  resultItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.surface, 
    borderRadius: 14, 
    padding: 14, 
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  resultImageContainer: { 
    width: 52, 
    height: 52, 
    borderRadius: 12, 
    backgroundColor: COLORS.background, 
    justifyContent: 'center', 
    alignItems: 'center', 
    overflow: 'hidden' 
  },
  resultImage: { 
    width: 52, 
    height: 52, 
    resizeMode: 'contain' 
  },
  resultInfo: { 
    flex: 1, 
    marginLeft: 12 
  },
  resultName: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: COLORS.text 
  },
  resultBrand: { 
    fontSize: 13, 
    color: COLORS.textSecondary, 
    marginTop: 2 
  },
  resultScore: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  resultScoreText: { 
    color: '#FFF', 
    fontWeight: '700', 
    fontSize: 15 
  },
});
