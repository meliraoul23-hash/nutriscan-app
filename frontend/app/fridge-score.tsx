// Fridge Score - Viral Feature 🧊
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { fetchFridgeScoreAPI } from '../src/services/api';
import { colors } from '../src/styles/colors';

interface FridgeScore {
  score: number;
  grade: string;
  total_products: number;
  healthy_products: number;
  unhealthy_products: number;
  average_nutri_score: string;
  top_healthy: Array<{ name: string; score: number }>;
  needs_improvement: Array<{ name: string; score: number }>;
  tips: string[];
  share_text: string;
}

export default function FridgeScoreScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FridgeScore | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadFridgeScore();
  }, []);

  useEffect(() => {
    if (data && data.score > 0) {
      // Animate score counter
      Animated.timing(scoreAnim, {
        toValue: data.score,
        duration: 1500,
        useNativeDriver: false,
      }).start();
      
      // Fade in content
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        delay: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [data]);

  const loadFridgeScore = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFridgeScoreAPI(user?.email, user?.user_id);
      setData(result);
    } catch (err) {
      console.log('Error loading fridge score:', err);
      setError('Impossible de calculer le score');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!data) return;
    
    try {
      await Share.share({
        message: data.share_text,
        title: 'Mon Score Frigo NutriScan',
      });
    } catch (err) {
      console.log('Share error:', err);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return '#4CAF50';
      case 'B': return '#8BC34A';
      case 'C': return '#FFC107';
      case 'D': return '#FF9800';
      case 'E': return '#F44336';
      default: return colors.textSecondary;
    }
  };

  const getGradeEmoji = (grade: string) => {
    switch (grade) {
      case 'A': return '🏆';
      case 'B': return '✨';
      case 'C': return '💪';
      case 'D': return '📈';
      case 'E': return '🎯';
      default: return '❓';
    }
  };

  const getScoreMessage = (score: number) => {
    if (score >= 80) return "Excellent ! Votre frigo est exemplaire !";
    if (score >= 65) return "Très bien ! Quelques améliorations possibles.";
    if (score >= 50) return "Correct. Vous pouvez faire mieux !";
    if (score >= 35) return "À améliorer. Ajoutez des produits sains.";
    return "Attention ! Privilégiez les produits frais.";
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="snow" size={60} color={colors.primary} />
          <Text style={styles.loadingText}>Analyse de votre frigo...</Text>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Score Frigo</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color={colors.error} />
          <Text style={styles.errorText}>{error || 'Erreur inconnue'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadFridgeScore}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const animatedScore = scoreAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0', String(data.score)],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Score Frigo</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Ionicons name="share-social" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.fridgeIcon}>
            <Text style={styles.fridgeEmoji}>🧊</Text>
          </View>
          
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNumber}>{data.score}</Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>

          <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(data.grade) }]}>
            <Text style={styles.gradeEmoji}>{getGradeEmoji(data.grade)}</Text>
            <Text style={styles.gradeText}>Note {data.grade}</Text>
          </View>

          <Text style={styles.scoreMessage}>{getScoreMessage(data.score)}</Text>
        </View>

        {/* Stats Row */}
        <Animated.View style={[styles.statsRow, { opacity: fadeAnim }]}>
          <View style={styles.statCard}>
            <Ionicons name="cube-outline" size={24} color={colors.primary} />
            <Text style={styles.statNumber}>{data.total_products}</Text>
            <Text style={styles.statLabel}>Produits</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="leaf" size={24} color="#4CAF50" />
            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{data.healthy_products}</Text>
            <Text style={styles.statLabel}>Sains</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="warning" size={24} color="#F44336" />
            <Text style={[styles.statNumber, { color: '#F44336' }]}>{data.unhealthy_products}</Text>
            <Text style={styles.statLabel}>À éviter</Text>
          </View>
        </Animated.View>

        {/* Top Healthy Products */}
        {data.top_healthy.length > 0 && (
          <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>🌟 Vos Champions</Text>
            {data.top_healthy.map((item, index) => (
              <View key={index} style={styles.productItem}>
                <View style={styles.productRank}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                <View style={[styles.productScore, { backgroundColor: '#4CAF50' }]}>
                  <Text style={styles.productScoreText}>{item.score}</Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Products to Improve */}
        {data.needs_improvement.length > 0 && (
          <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>📈 À Améliorer</Text>
            {data.needs_improvement.map((item, index) => (
              <View key={index} style={styles.productItem}>
                <Ionicons name="alert-circle" size={20} color="#FF9800" />
                <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                <View style={[styles.productScore, { backgroundColor: '#FF9800' }]}>
                  <Text style={styles.productScoreText}>{item.score}</Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Tips */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>💡 Conseils</Text>
          {data.tips.map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Share Button */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-social" size={22} color="#FFF" />
          <Text style={styles.shareButtonText}>Partager mon score</Text>
        </TouchableOpacity>

        <Text style={styles.viralText}>
          🔥 Défie tes amis ! Qui a le meilleur frigo ?
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  shareBtn: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    marginTop: 16,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scoreCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  fridgeIcon: {
    marginBottom: 8,
  },
  fridgeEmoji: {
    fontSize: 50,
  },
  scoreCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 12,
  },
  scoreNumber: {
    fontSize: 72,
    fontWeight: '800',
    color: colors.text,
  },
  scoreMax: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  gradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    marginBottom: 16,
  },
  gradeEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  gradeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  scoreMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  productRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  productName: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    marginLeft: 8,
  },
  productScore: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  productScoreText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  tipItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  viralText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
});
