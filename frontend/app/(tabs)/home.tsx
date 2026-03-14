// Home Screen - Simplified Premium Design
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../src/contexts/AuthContext';
import { useApp } from '../../src/contexts/AppContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Colors
const COLORS = {
  primary: '#34C759',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  glass: 'rgba(255, 255, 255, 0.85)',
  success: '#34C759',
  warning: '#FF9F0A',
  error: '#FF3B30',
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#00C853';
  if (score >= 60) return '#7CB342';
  if (score >= 45) return '#FFB300';
  if (score >= 30) return '#FF6D00';
  return '#DD2C00';
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { scanHistory, healingFoods, fetchProduct, refreshData, loading } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const handleScanPress = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    router.push('/scanner');
  };

  const handleProductPress = async (barcode: string) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await fetchProduct(barcode);
    router.push('/product');
  };

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()} 👋</Text>
            <Text style={styles.userName}>{user?.email?.split('@')[0] || 'Bienvenue'}</Text>
          </View>
          <TouchableOpacity style={styles.coachBtn} onPress={() => router.push('/coach')}>
            <LinearGradient colors={['#9C27B0', '#7B1FA2']} style={styles.coachGradient}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Scan Button */}
        <TouchableOpacity style={styles.scanCard} onPress={handleScanPress} activeOpacity={0.9}>
          <LinearGradient colors={[COLORS.primary, '#27AE60']} style={styles.scanGradient}>
            <View style={styles.scanIcon}>
              <Ionicons name="scan" size={32} color="#FFF" />
            </View>
            <View style={styles.scanText}>
              <Text style={styles.scanTitle}>Scanner un produit</Text>
              <Text style={styles.scanSubtitle}>Découvrez son score santé</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/compare')}>
            <View style={[styles.quickIcon, { backgroundColor: '#007AFF20' }]}>
              <Ionicons name="git-compare" size={22} color="#007AFF" />
            </View>
            <Text style={styles.quickLabel}>Comparer</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/fridge-score')}>
            <View style={[styles.quickIcon, { backgroundColor: '#5856D620' }]}>
              <Text style={{ fontSize: 20 }}>🧊</Text>
            </View>
            <Text style={styles.quickLabel}>Mon Frigo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/preferences')}>
            <View style={[styles.quickIcon, { backgroundColor: '#FF9F0A20' }]}>
              <Ionicons name="settings" size={22} color="#FF9F0A" />
            </View>
            <Text style={styles.quickLabel}>Préférences</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/premium')}>
            <View style={[styles.quickIcon, { backgroundColor: '#FFD70020' }]}>
              <Ionicons name="diamond" size={22} color="#FFB300" />
            </View>
            <Text style={styles.quickLabel}>Premium</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Scans */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Scans récents</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
              <Text style={styles.seeAll}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          {!scanHistory || scanHistory.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="scan-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>Aucun scan</Text>
              <Text style={styles.emptySubtitle}>Scannez votre premier produit</Text>
            </View>
          ) : (
            scanHistory.slice(0, 5).map((item: any, index: number) => (
              <TouchableOpacity
                key={`${item.barcode}-${index}`}
                style={styles.productCard}
                onPress={() => handleProductPress(item.barcode)}
                activeOpacity={0.7}
              >
                <View style={styles.productImage}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.productImg} />
                  ) : (
                    <Ionicons name="cube-outline" size={24} color={COLORS.textSecondary} />
                  )}
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{item.product_name}</Text>
                  <Text style={styles.productBrand}>{item.brand || 'Marque'}</Text>
                </View>
                <View style={[styles.scoreCircle, { backgroundColor: getScoreColor(item.health_score || 50) }]}>
                  <Text style={styles.scoreText}>{item.health_score || '--'}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Healing Foods */}
        {healingFoods && healingFoods.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Aliments bienfaisants</Text>
              <View style={styles.leafBadge}>
                <Ionicons name="leaf" size={12} color="#FFF" />
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {healingFoods.slice(0, 8).map((food: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={styles.healingCard}
                  onPress={() => food.barcode && handleProductPress(food.barcode)}
                  activeOpacity={0.8}
                >
                  <View style={styles.healingImage}>
                    {food.image && food.image.length < 5 ? (
                      <Text style={styles.healingEmoji}>{food.image}</Text>
                    ) : food.image_url ? (
                      <Image source={{ uri: food.image_url }} style={styles.healingImg} />
                    ) : (
                      <Ionicons name="leaf" size={28} color={COLORS.primary} />
                    )}
                  </View>
                  <View style={styles.healingInfo}>
                    <Text style={styles.healingName} numberOfLines={2}>{food.name}</Text>
                    {food.health_score ? (
                      <View style={[styles.healingScore, { backgroundColor: getScoreColor(food.health_score) }]}>
                        <Text style={styles.healingScoreText}>{food.health_score}</Text>
                      </View>
                    ) : food.benefits && food.benefits.length > 0 ? (
                      <Text style={styles.healingBenefit} numberOfLines={1}>{food.benefits[0]}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  coachBtn: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  coachGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  scanGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  scanIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanText: {
    flex: 1,
    marginLeft: 16,
  },
  scanTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  scanSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 4,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  leafBadge: {
    backgroundColor: COLORS.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  productImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  productImg: {
    width: 52,
    height: 52,
    resizeMode: 'contain',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  productBrand: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  healingCard: {
    width: 140,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  healingImage: {
    width: '100%',
    height: 90,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  healingImg: {
    width: '100%',
    height: 90,
    resizeMode: 'cover',
  },
  healingInfo: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  healingName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  healingScore: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  healingScoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  healingEmoji: {
    fontSize: 40,
  },
  healingBenefit: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '500',
  },
});
