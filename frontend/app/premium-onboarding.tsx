// Premium Onboarding Screen - Collect user profile for personalized AI advice
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../src/styles/colors';
import { useAuth } from '../src/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentaire', desc: 'Travail de bureau, peu de mouvement', multiplier: 1.2 },
  { id: 'light', label: 'Peu actif', desc: 'Marche legere, travail debout', multiplier: 1.375 },
  { id: 'moderate', label: 'Actif', desc: 'Exercice modere 3-5x/semaine', multiplier: 1.55 },
  { id: 'very', label: 'Tres actif', desc: 'Sport intense 6-7x/semaine', multiplier: 1.725 },
];

const GOALS = [
  { id: 'lose', label: 'Perdre du poids', icon: 'trending-down', color: '#4CAF50' },
  { id: 'maintain', label: 'Maintenir', icon: 'swap-horizontal', color: '#2196F3' },
  { id: 'gain', label: 'Prendre du muscle', icon: 'trending-up', color: '#FF9800' },
];

interface UserProfile {
  sex: 'male' | 'female' | null;
  age: string;
  height: string;
  weight: string;
  targetWeight: string;
  activityLevel: string;
  goal: string;
}

export default function PremiumOnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile>({
    sex: null,
    age: '',
    height: '',
    weight: '',
    targetWeight: '',
    activityLevel: '',
    goal: '',
  });

  const totalSteps = 4;

  // Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor equation
  const calculateBMR = () => {
    const weight = parseFloat(profile.weight);
    const height = parseFloat(profile.height);
    const age = parseInt(profile.age);
    
    if (!weight || !height || !age) return 0;
    
    if (profile.sex === 'male') {
      return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
    } else {
      return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
    }
  };

  // Calculate TDEE (Total Daily Energy Expenditure)
  const calculateTDEE = () => {
    const bmr = calculateBMR();
    const activity = ACTIVITY_LEVELS.find(a => a.id === profile.activityLevel);
    if (!activity) return bmr;
    return Math.round(bmr * activity.multiplier);
  };

  // Calculate daily calorie target based on goal
  const calculateCalorieTarget = () => {
    const tdee = calculateTDEE();
    if (profile.goal === 'lose') return tdee - 500; // Deficit for weight loss
    if (profile.goal === 'gain') return tdee + 300; // Surplus for muscle gain
    return tdee; // Maintain
  };

  const saveProfile = async () => {
    try {
      const completeProfile = {
        ...profile,
        bmr: calculateBMR(),
        tdee: calculateTDEE(),
        dailyCalories: calculateCalorieTarget(),
        createdAt: new Date().toISOString(),
        userId: user?.user_id,
      };
      
      await AsyncStorage.setItem('user_health_profile', JSON.stringify(completeProfile));
      await AsyncStorage.setItem('premium_onboarding_complete', 'true');
      
      Alert.alert(
        'Profil enregistre !',
        `Vos besoins caloriques journaliers sont estimes a ${completeProfile.dailyCalories} kcal.`,
        [{ text: 'Continuer', onPress: () => router.replace('/(tabs)/home') }]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil.');
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return profile.sex !== null;
      case 1: return profile.age && profile.height && profile.weight;
      case 2: return profile.targetWeight && profile.activityLevel;
      case 3: return profile.goal;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      saveProfile();
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Quel est votre sexe ?</Text>
            <Text style={styles.stepSubtitle}>Pour calculer vos besoins caloriques</Text>
            
            <View style={styles.sexOptions}>
              <TouchableOpacity
                style={[styles.sexCard, profile.sex === 'male' && styles.sexCardSelected]}
                onPress={() => setProfile({ ...profile, sex: 'male' })}
              >
                <View style={[styles.sexIcon, profile.sex === 'male' && styles.sexIconSelected]}>
                  <Ionicons name="male" size={40} color={profile.sex === 'male' ? '#FFF' : colors.primary} />
                </View>
                <Text style={[styles.sexLabel, profile.sex === 'male' && styles.sexLabelSelected]}>Homme</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.sexCard, profile.sex === 'female' && styles.sexCardSelected]}
                onPress={() => setProfile({ ...profile, sex: 'female' })}
              >
                <View style={[styles.sexIcon, profile.sex === 'female' && styles.sexIconSelected]}>
                  <Ionicons name="female" size={40} color={profile.sex === 'female' ? '#FFF' : '#E91E63'} />
                </View>
                <Text style={[styles.sexLabel, profile.sex === 'female' && styles.sexLabelSelected]}>Femme</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Vos mensurations</Text>
            <Text style={styles.stepSubtitle}>Pour personnaliser vos recommandations</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Age</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={profile.age}
                  onChangeText={(text) => setProfile({ ...profile, age: text })}
                  keyboardType="numeric"
                  placeholder="25"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={styles.inputUnit}>ans</Text>
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Taille</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={profile.height}
                  onChangeText={(text) => setProfile({ ...profile, height: text })}
                  keyboardType="numeric"
                  placeholder="175"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={styles.inputUnit}>cm</Text>
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Poids actuel</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={profile.weight}
                  onChangeText={(text) => setProfile({ ...profile, weight: text })}
                  keyboardType="numeric"
                  placeholder="70"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={styles.inputUnit}>kg</Text>
              </View>
            </View>
          </View>
        );
      
      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Votre mode de vie</Text>
            <Text style={styles.stepSubtitle}>Pour ajuster vos besoins energetiques</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Poids objectif</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={profile.targetWeight}
                  onChangeText={(text) => setProfile({ ...profile, targetWeight: text })}
                  keyboardType="numeric"
                  placeholder="65"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={styles.inputUnit}>kg</Text>
              </View>
            </View>
            
            <Text style={[styles.inputLabel, { marginTop: 20 }]}>Niveau d'activite</Text>
            <View style={styles.activityList}>
              {ACTIVITY_LEVELS.map((activity) => (
                <TouchableOpacity
                  key={activity.id}
                  style={[styles.activityItem, profile.activityLevel === activity.id && styles.activityItemSelected]}
                  onPress={() => setProfile({ ...profile, activityLevel: activity.id })}
                >
                  <View style={styles.activityContent}>
                    <Text style={[styles.activityLabel, profile.activityLevel === activity.id && styles.activityLabelSelected]}>
                      {activity.label}
                    </Text>
                    <Text style={styles.activityDesc}>{activity.desc}</Text>
                  </View>
                  {profile.activityLevel === activity.id && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      
      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Votre objectif</Text>
            <Text style={styles.stepSubtitle}>Nous adapterons vos conseils en consequence</Text>
            
            <View style={styles.goalsGrid}>
              {GOALS.map((goal) => (
                <TouchableOpacity
                  key={goal.id}
                  style={[styles.goalCard, profile.goal === goal.id && styles.goalCardSelected]}
                  onPress={() => setProfile({ ...profile, goal: goal.id })}
                >
                  <View style={[styles.goalIcon, { backgroundColor: goal.color + '20' }]}>
                    <Ionicons name={goal.icon as any} size={32} color={goal.color} />
                  </View>
                  <Text style={[styles.goalLabel, profile.goal === goal.id && styles.goalLabelSelected]}>
                    {goal.label}
                  </Text>
                  {profile.goal === goal.id && (
                    <View style={styles.goalCheck}>
                      <Ionicons name="checkmark" size={16} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            {profile.goal && (
              <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>Votre resume</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Metabolisme de base (BMR)</Text>
                  <Text style={styles.summaryValue}>{calculateBMR()} kcal</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Depense totale (TDEE)</Text>
                  <Text style={styles.summaryValue}>{calculateTDEE()} kcal</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryRowHighlight]}>
                  <Text style={styles.summaryLabelBold}>Objectif calorique</Text>
                  <Text style={styles.summaryValueBold}>{calculateCalorieTarget()} kcal/jour</Text>
                </View>
              </View>
            )}
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 0 ? setStep(step - 1) : router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          {[...Array(totalSteps)].map((_, i) => (
            <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
          ))}
        </View>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/home')}>
          <Text style={styles.skipText}>Passer</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderStep()}
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!canProceed()}
        >
          <Text style={styles.nextButtonText}>
            {step === totalSteps - 1 ? 'Terminer' : 'Continuer'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  progressContainer: { flexDirection: 'row', gap: 8 },
  progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.surface },
  progressDotActive: { backgroundColor: colors.primary, width: 24 },
  skipText: { fontSize: 14, color: colors.textSecondary },
  scrollView: { flex: 1 },
  stepContent: { paddingHorizontal: 24, paddingTop: 20 },
  stepTitle: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 8 },
  stepSubtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 32 },
  
  // Sex selection
  sexOptions: { flexDirection: 'row', gap: 16 },
  sexCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  sexCardSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
  sexIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  sexIconSelected: { backgroundColor: colors.primary },
  sexLabel: { fontSize: 18, fontWeight: '600', color: colors.text },
  sexLabelSelected: { color: colors.primary },
  
  // Input fields
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 16 },
  input: { flex: 1, fontSize: 24, fontWeight: '600', color: colors.text, paddingVertical: 16 },
  inputUnit: { fontSize: 16, color: colors.textSecondary, marginLeft: 8 },
  
  // Activity levels
  activityList: { gap: 12 },
  activityItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 2, borderColor: 'transparent' },
  activityItemSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
  activityContent: { flex: 1 },
  activityLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
  activityLabelSelected: { color: colors.primary },
  activityDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  
  // Goals
  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  goalCard: { width: (SCREEN_WIDTH - 60) / 2, backgroundColor: colors.surface, borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 2, borderColor: 'transparent', position: 'relative' },
  goalCardSelected: { borderColor: colors.primary },
  goalIcon: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  goalLabel: { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center' },
  goalLabelSelected: { color: colors.primary },
  goalCheck: { position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  
  // Summary
  summaryBox: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, marginTop: 24 },
  summaryTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.background },
  summaryRowHighlight: { backgroundColor: colors.surfaceAlt, marginHorizontal: -20, paddingHorizontal: 20, marginBottom: -20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginTop: 8, borderBottomWidth: 0 },
  summaryLabel: { fontSize: 14, color: colors.textSecondary },
  summaryValue: { fontSize: 16, fontWeight: '600', color: colors.text },
  summaryLabelBold: { fontSize: 15, fontWeight: '600', color: colors.text },
  summaryValueBold: { fontSize: 18, fontWeight: '700', color: colors.primary },
  
  // Bottom
  bottomContainer: { padding: 20, paddingBottom: 32 },
  nextButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 16, gap: 8 },
  nextButtonDisabled: { backgroundColor: colors.surface },
  nextButtonText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
});
