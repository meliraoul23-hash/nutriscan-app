// Favorites Screen
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { useApp } from '../src/contexts/AppContext';
import { removeFromFavoritesAPI } from '../src/services/api';
import { colors, getScoreColor } from '../src/styles/colors';

export default function FavoritesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { favorites, fetchProduct, setFavorites, fetchFavorites } = useApp();

  const handleProductPress = (barcode: string) => {
    fetchProduct(barcode);
    router.push('/product');
  };

  const handleRemoveFavorite = async (barcode: string) => {
    if (!user) return;
    
    Alert.alert(
      'Supprimer des favoris',
      'Êtes-vous sûr de vouloir supprimer ce produit de vos favoris ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFromFavoritesAPI(barcode, user.email, user.user_id);
              setFavorites((prev: any[]) => prev.filter((f: any) => f.barcode !== barcode));
            } catch (error) {
              console.log('Error removing favorite:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Mes Favoris</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {favorites.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>Aucun favori</Text>
            <Text style={styles.emptyStateSubtext}>Ajoutez des produits à vos favoris pour les retrouver facilement</Text>
          </View>
        ) : (
          favorites.map((item: any, index: number) => (
            <TouchableOpacity
              key={index}
              style={styles.favoriteItem}
              onPress={() => handleProductPress(item.barcode)}
            >
              <View style={styles.favoriteImageContainer}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.favoriteImage} />
                ) : (
                  <Ionicons name="cube-outline" size={30} color={colors.textSecondary} />
                )}
              </View>
              <View style={styles.favoriteInfo}>
                <Text style={styles.favoriteName} numberOfLines={1}>{item.product_name}</Text>
                <Text style={styles.favoriteBrand} numberOfLines={1}>{item.brand || 'Marque inconnue'}</Text>
              </View>
              <View style={[styles.favoriteScore, { backgroundColor: getScoreColor(item.health_score) }]}>
                <Text style={styles.favoriteScoreText}>{item.health_score}</Text>
              </View>
              <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveFavorite(item.barcode)}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
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
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyStateTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
  favoriteItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 12 },
  favoriteImageContainer: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  favoriteImage: { width: 48, height: 48, resizeMode: 'contain' },
  favoriteInfo: { flex: 1, marginLeft: 12 },
  favoriteName: { fontSize: 14, fontWeight: '500', color: colors.text },
  favoriteBrand: { fontSize: 12, color: colors.textSecondary },
  favoriteScore: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  favoriteScoreText: { color: '#FFF', fontWeight: '600', fontSize: 12 },
  removeButton: { padding: 8, marginLeft: 8 },
});
