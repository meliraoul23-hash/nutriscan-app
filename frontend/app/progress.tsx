// Progress Dashboard Screen - Track weight, health score, and calories
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { colors } from '../src/styles/colors';
import { useAuth } from '../src/contexts/AuthContext';
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

interface WeightEntry {
  date: string;
  weight: number;
}

interface DailyStats {
  date: string;
  healthScore: number;
  calories: number;
  scans: number;
}

export default function ProgressDashboardScreen() {
  const router = useRouter();
  const { isPremium, user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [newWeight, setNewWeight] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90'>('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load user profile
      const profileData = await AsyncStorage.getItem('user_health_profile');
      if (profileData) {
        setProfile(JSON.parse(profileData));
      }

      // Load weight history
      const weightData = await AsyncStorage.getItem('weight_history');
      if (weightData) {
        setWeightHistory(JSON.parse(weightData));
      } else {
        // Generate mock data for demo
        const mockWeight = generateMockWeightData();
        setWeightHistory(mockWeight);
        await AsyncStorage.setItem('weight_history', JSON.stringify(mockWeight));
      }

      // Load daily stats
      const statsData = await AsyncStorage.getItem('daily_stats');
      if (statsData) {
        setDailyStats(JSON.parse(statsData));
      } else {
        // Generate mock data for demo
        const mockStats = generateMockStatsData();
        setDailyStats(mockStats);
        await AsyncStorage.setItem('daily_stats', JSON.stringify(mockStats));
      }
    } catch (error) {
      console.log('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockWeightData = (): WeightEntry[] => {
    const data: WeightEntry[] = [];
    const startWeight = 75;
    const today = new Date();
    
    for (let i = 90; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const variation = Math.random() * 0.8 - 0.4; // Random variation
      const trend = -0.05 * (90 - i); // Slight downward trend
      data.push({
        date: date.toISOString().split('T')[0],
        weight: Math.round((startWeight + trend + variation) * 10) / 10,
      });
    }
    return data;
  };

  const generateMockStatsData = (): DailyStats[] => {
    const data: DailyStats[] = [];
    const today = new Date();
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        healthScore: Math.round(60 + Math.random() * 30),
        calories: Math.round(1500 + Math.random() * 800),
        scans: Math.round(Math.random() * 8),
      });
    }
    return data;
  };

  const addWeight = async () => {
    if (!newWeight) return;
    
    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight < 30 || weight > 300) {
      Alert.alert('Erreur', 'Veuillez entrer un poids valide (30-300 kg)');
      return;
    }

    const newEntry: WeightEntry = {
      date: new Date().toISOString().split('T')[0],
      weight,
    };

    const updatedHistory = [...weightHistory.filter(w => w.date !== newEntry.date), newEntry];
    updatedHistory.sort((a, b) => a.date.localeCompare(b.date));
    
    setWeightHistory(updatedHistory);
    await AsyncStorage.setItem('weight_history', JSON.stringify(updatedHistory));
    setNewWeight('');
    Alert.alert('Enregistre', `Poids de ${weight} kg enregistre !`);
  };

  const getFilteredData = (data: any[], days: number) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return data.filter(d => new Date(d.date) >= cutoffDate);
  };

  const getChartData = (data: number[], labels: string[]) => ({
    labels,
    datasets: [{ data, strokeWidth: 2 }],
  });

  const filteredWeightHistory = getFilteredData(weightHistory, parseInt(selectedPeriod));
  const filteredDailyStats = getFilteredData(dailyStats, parseInt(selectedPeriod));

  // Prepare chart data
  const weightChartLabels = filteredWeightHistory.length > 7 
    ? filteredWeightHistory.filter((_, i) => i % Math.ceil(filteredWeightHistory.length / 7) === 0).map(w => w.date.slice(5))
    : filteredWeightHistory.map(w => w.date.slice(5));
  
  const weightChartData = filteredWeightHistory.length > 7
    ? filteredWeightHistory.filter((_, i) => i % Math.ceil(filteredWeightHistory.length / 7) === 0).map(w => w.weight)
    : filteredWeightHistory.map(w => w.weight);

  const healthScoreLabels = filteredDailyStats.length > 7
    ? filteredDailyStats.filter((_, i) => i % Math.ceil(filteredDailyStats.length / 7) === 0).map(s => s.date.slice(5))
    : filteredDailyStats.map(s => s.date.slice(5));

  const healthScoreData = filteredDailyStats.length > 7
    ? filteredDailyStats.filter((_, i) => i % Math.ceil(filteredDailyStats.length / 7) === 0).map(s => s.healthScore)
    : filteredDailyStats.map(s => s.healthScore);

  const caloriesData = filteredDailyStats.length > 7
    ? filteredDailyStats.filter((_, i) => i % Math.ceil(filteredDailyStats.length / 7) === 0).map(s => s.calories)
    : filteredDailyStats.map(s => s.calories);

  // Calculate stats
  const currentWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : 0;
  const startWeight = weightHistory.length > 0 ? weightHistory[0].weight : 0;
  const weightChange = Math.round((currentWeight - startWeight) * 10) / 10;
  const avgHealthScore = dailyStats.length > 0 
    ? Math.round(dailyStats.slice(-7).reduce((sum, s) => sum + s.healthScore, 0) / Math.min(7, dailyStats.length))
    : 0;
  const totalScans = dailyStats.reduce((sum, s) => sum + s.scans, 0);

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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
            <Text style={styles.statValue}>{currentWeight} kg</Text>
            <Text style={styles.statLabel}>Poids actuel</Text>
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
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{avgHealthScore}</Text>
            <Text style={styles.statLabel}>Score sante moyen</Text>
            <View style={[styles.statBadge, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="star" size={14} color="#2196F3" />
              <Text style={[styles.statBadgeText, { color: '#2196F3' }]}>7 derniers jours</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile?.dailyCalories || '-'}</Text>
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
            <TouchableOpacity style={styles.addWeightButton} onPress={addWeight}>
              <Ionicons name="add" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Weight Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Evolution du poids</Text>
          {weightChartData.length > 1 ? (
            <LineChart
              data={getChartData(weightChartData, weightChartLabels)}
              width={CHART_WIDTH}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          ) : (
            <View style={styles.noData}>
              <Ionicons name="analytics-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.noDataText}>Pas assez de donnees</Text>
            </View>
          )}
        </View>

        {/* Health Score Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Score sante moyen</Text>
          {healthScoreData.length > 1 ? (
            <LineChart
              data={getChartData(healthScoreData, healthScoreLabels)}
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

        {/* Calories Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Calories consommees</Text>
          {caloriesData.length > 1 ? (
            <LineChart
              data={getChartData(caloriesData, healthScoreLabels)}
              width={CHART_WIDTH}
              height={200}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
              }}
              bezier
              style={styles.chart}
            />
          ) : (
            <View style={styles.noData}>
              <Ionicons name="analytics-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.noDataText}>Pas de donnees de calories</Text>
            </View>
          )}
          {profile?.dailyCalories && (
            <View style={styles.targetLine}>
              <View style={styles.targetDot} />
              <Text style={styles.targetText}>Objectif: {profile.dailyCalories} kcal</Text>
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
  
  // Charts
  chartSection: { paddingHorizontal: 16, marginTop: 24 },
  chart: { borderRadius: 16, marginTop: 8 },
  noData: { height: 200, backgroundColor: colors.surface, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  noDataText: { fontSize: 14, color: colors.textSecondary, marginTop: 12 },
  targetLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  targetDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF9800' },
  targetText: { fontSize: 13, color: colors.textSecondary },
  
  // Profile summary
  profileSummary: { paddingHorizontal: 16, marginTop: 24 },
  profileCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16 },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.background },
  profileLabel: { fontSize: 14, color: colors.textSecondary },
  profileValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  editProfileButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 16, marginTop: 8 },
  editProfileText: { fontSize: 14, fontWeight: '600', color: colors.primary },
});
