// Progress Dashboard Screen - Track weight, health score, and calories
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { colors } from '../src/styles/colors';
import { useAuth } from '../src/contexts/AuthContext';
import { getUserProgressAPI, addWeightEntryAPI, UserProgressData } from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32;

interface UserProfile {
  sex: string;
  age: string;
  height: string;
  weight: string;
  targetWeight: string;
  activityLevel: string;
  goal: string;
  dailyCalories: number;
}

export default function ProgressDashboardScreen() {
  const router = useRouter();
  const { isPremium, user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [progressData, setProgressData] = useState<UserProgressData | null>(null);
  const [newWeight, setNewWeight] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90'>('30');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingWeight, setAddingWeight] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  const loadData = async () => {
    try {
      // Load user profile from local storage
      const profileData = await AsyncStorage.getItem('user_health_profile');
      if (profileData) {
        setProfile(JSON.parse(profileData));
      }

      // Fetch progress data from backend
      if (user?.email) {
        const data = await getUserProgressAPI(
          user.email,
          user.user_id || '',
          parseInt(selectedPeriod)
        );
        setProgressData(data);
        
        // Update local profile with backend data if available
        if (data.profile) {
          const updatedProfile = {
            ...data.profile,
            dailyCalories: data.profile.daily_calories,
            targetWeight: data.profile.target_weight?.toString(),
            activityLevel: data.profile.activity_level,
          };
          setProfile(updatedProfile as any);
        }
      }
    } catch (error) {
      console.log('Error loading progress data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [selectedPeriod]);

  const addWeight = async () => {
    if (!newWeight || addingWeight) return;
    
    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight < 30 || weight > 300) {
      Alert.alert('Erreur', 'Veuillez entrer un poids valide (30-300 kg)');
      return;
    }

    setAddingWeight(true);
    
    try {
      if (user?.email) {
        await addWeightEntryAPI(weight, user.email, user.user_id || '');
      }
      
      setNewWeight('');
      Alert.alert('Enregistre', `Poids de ${weight} kg enregistre !`);
      await loadData();
    } catch (error) {
      console.log('Error adding weight:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer le poids');
    } finally {
      setAddingWeight(false);
    }
  };

  // Get chart data from progress data
  const weightHistory = progressData?.weight_history || [];
  const dailyStats = progressData?.daily_stats || [];

  // Prepare chart data with proper sampling
  const getChartPoints = (data: any[], maxPoints: number = 7) => {
    if (data.length <= maxPoints) return data;
    const step = Math.ceil(data.length / maxPoints);
    return data.filter((_, i) => i % step === 0);
  };

  const weightChartPoints = getChartPoints(weightHistory);
  const weightChartLabels = weightChartPoints.map(w => w.date?.slice(5) || '');
  const weightChartData = weightChartPoints.map(w => w.weight || 0);

  const statsChartPoints = getChartPoints(dailyStats);
  const healthScoreLabels = statsChartPoints.map(s => s.date?.slice(5) || '');
  const healthScoreData = statsChartPoints.map(s => s.health_score || 0).filter(s => s > 0);

  // Summary stats
  const currentWeight = progressData?.current_weight || 0;
  const weightChange = progressData?.weight_change || 0;
  const avgHealthScore = progressData?.avg_health_score || 0;
  const totalScans = progressData?.total_scans || 0;
  const calorieTarget = progressData?.calorie_target || profile?.dailyCalories || 0;

  const chartConfig = {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    labelColor: () => colors.textSecondary,
    style: { borderRadius: 16 },
    propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary },
  };

  if (!isPremium) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.premiumRequired}>
          <Ionicons name="lock-closed" size={64} color={colors.textSecondary} />
          <Text style={styles.premiumTitle}>Fonctionnalite Premium</Text>
          <Text style={styles.premiumSubtitle}>Passez Premium pour suivre votre progression</Text>
          <TouchableOpacity style={styles.premiumButton} onPress={() => router.push('/premium')}>
            <Text style={styles.premiumButtonText}>Devenir Premium</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement de vos donnees...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ma Progression</Text>
        <TouchableOpacity onPress={() => router.push('/premium-onboarding')}>
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['7', '30', '90'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[styles.periodText, selectedPeriod === period && styles.periodTextActive]}>
                {period} jours
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{currentWeight > 0 ? `${currentWeight} kg` : '-- kg'}</Text>
            <Text style={styles.statLabel}>Poids actuel</Text>
            {weightChange !== 0 && (
              <View style={[styles.statBadge, { backgroundColor: weightChange <= 0 ? '#E8F5E9' : '#FFEBEE' }]}>
                <Ionicons 
                  name={weightChange <= 0 ? 'trending-down' : 'trending-up'} 
                  size={14} 
                  color={weightChange <= 0 ? '#4CAF50' : '#F44336'} 
                />
                <Text style={[styles.statBadgeText, { color: weightChange <= 0 ? '#4CAF50' : '#F44336' }]}>
                  {weightChange > 0 ? '+' : ''}{weightChange} kg
                </Text>
              </View>
            )}
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{avgHealthScore > 0 ? avgHealthScore : '--'}</Text>
            <Text style={styles.statLabel}>Score sante moyen</Text>
            <View style={[styles.statBadge, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="star" size={14} color="#2196F3" />
              <Text style={[styles.statBadgeText, { color: '#2196F3' }]}>7 derniers jours</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{calorieTarget > 0 ? calorieTarget : '--'}</Text>
            <Text style={styles.statLabel}>Objectif kcal/jour</Text>
            <View style={[styles.statBadge, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="flame" size={14} color="#FF9800" />
              <Text style={[styles.statBadgeText, { color: '#FF9800' }]}>Personnalise</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalScans}</Text>
            <Text style={styles.statLabel}>Produits scannes</Text>
            <View style={[styles.statBadge, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="barcode" size={14} color="#9C27B0" />
              <Text style={[styles.statBadgeText, { color: '#9C27B0' }]}>Total</Text>
            </View>
          </View>
        </View>

        {/* Add Weight */}
        <View style={styles.addWeightSection}>
          <Text style={styles.sectionTitle}>Enregistrer mon poids</Text>
          <View style={styles.addWeightRow}>
            <View style={styles.weightInputContainer}>
              <TextInput
                style={styles.weightInput}
                value={newWeight}
                onChangeText={setNewWeight}
                placeholder="Ex: 72.5"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
              <Text style={styles.weightUnit}>kg</Text>
            </View>
            <TouchableOpacity 
              style={[styles.addWeightButton, addingWeight && styles.addWeightButtonDisabled]} 
              onPress={addWeight}
              disabled={addingWeight}
            >
              {addingWeight ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="add" size={24} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Weight Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Evolution du poids</Text>
          {weightChartData.length > 1 ? (
            <LineChart
              data={{
                labels: weightChartLabels,
                datasets: [{ data: weightChartData, strokeWidth: 2 }],
              }}
              width={CHART_WIDTH}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          ) : (
            <View style={styles.noData}>
              <Ionicons name="analytics-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.noDataText}>
                {weightHistory.length === 0 
                  ? 'Enregistrez votre poids pour voir votre progression'
                  : 'Pas assez de donnees'}
              </Text>
            </View>
          )}
        </View>

        {/* Health Score Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Score sante moyen</Text>
          {healthScoreData.length > 1 ? (
            <LineChart
              data={{
                labels: healthScoreLabels,
                datasets: [{ data: healthScoreData, strokeWidth: 2 }],
              }}
              width={CHART_WIDTH}
              height={200}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
              }}
              bezier
              style={styles.chart}
            />
          ) : (
            <View style={styles.noData}>
              <Ionicons name="analytics-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.noDataText}>Scannez des produits pour voir vos statistiques</Text>
            </View>
          )}
        </View>

        {/* Profile Summary */}
        {profile && (
          <View style={styles.profileSummary}>
            <Text style={styles.sectionTitle}>Mon profil</Text>
            <View style={styles.profileCard}>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Objectif</Text>
                <Text style={styles.profileValue}>
                  {profile.goal === 'lose' ? 'Perdre du poids' : profile.goal === 'gain' ? 'Prendre du muscle' : 'Maintenir'}
                </Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Poids cible</Text>
                <Text style={styles.profileValue}>{profile.targetWeight} kg</Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Besoins caloriques</Text>
                <Text style={styles.profileValue}>{profile.dailyCalories} kcal/jour</Text>
              </View>
              <TouchableOpacity 
                style={styles.editProfileButton}
                onPress={() => router.push('/premium-onboarding')}
              >
                <Ionicons name="pencil" size={16} color={colors.primary} />
                <Text style={styles.editProfileText}>Modifier mon profil</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  scrollView: { flex: 1 },
  
  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: colors.textSecondary, marginTop: 12 },
  
  // Premium required
  premiumRequired: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  premiumTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: 20 },
  premiumSubtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginTop: 8 },
  premiumButton: { backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12, marginTop: 24 },
  premiumButtonText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  
  // Period selector
  periodSelector: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 16, backgroundColor: colors.surface, borderRadius: 12, padding: 4 },
  periodButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  periodButtonActive: { backgroundColor: colors.primary },
  periodText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  periodTextActive: { color: '#FFF' },
  
  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  statCard: { width: (SCREEN_WIDTH - 40) / 2, backgroundColor: colors.surface, borderRadius: 16, padding: 16 },
  statValue: { fontSize: 24, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  statBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  statBadgeText: { fontSize: 11, fontWeight: '500' },
  
  // Add weight
  addWeightSection: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
  addWeightRow: { flexDirection: 'row', gap: 12 },
  weightInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16 },
  weightInput: { flex: 1, fontSize: 18, fontWeight: '600', color: colors.text, paddingVertical: 14 },
  weightUnit: { fontSize: 16, color: colors.textSecondary },
  addWeightButton: { width: 52, height: 52, backgroundColor: colors.primary, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  addWeightButtonDisabled: { opacity: 0.6 },
  
  // Charts
  chartSection: { paddingHorizontal: 16, marginTop: 24 },
  chart: { borderRadius: 16, marginTop: 8 },
  noData: { height: 200, backgroundColor: colors.surface, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  noDataText: { fontSize: 14, color: colors.textSecondary, marginTop: 12, textAlign: 'center', paddingHorizontal: 20 },
  
  // Profile summary
  profileSummary: { paddingHorizontal: 16, marginTop: 24 },
  profileCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16 },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.background },
  profileLabel: { fontSize: 14, color: colors.textSecondary },
  profileValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  editProfileButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 16, marginTop: 8 },
  editProfileText: { fontSize: 14, fontWeight: '600', color: colors.primary },
});
