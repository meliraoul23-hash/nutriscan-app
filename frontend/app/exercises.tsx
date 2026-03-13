// Exercises Screen
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '../src/contexts/AppContext';
import { colors } from '../src/styles/colors';

export default function ExercisesScreen() {
  const router = useRouter();
  const { exercises, healthGoals } = useApp();

  const getExerciseIcon = (icon: string) => {
    const iconMap: { [key: string]: string } = {
      'walk': 'walk',
      'run': 'bicycle',
      'swim': 'water',
      'yoga': 'body',
      'weights': 'barbell',
      'stretch': 'fitness',
    };
    return iconMap[icon] || 'fitness';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Exercices Recommandés</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {healthGoals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>Définissez vos objectifs</Text>
            <Text style={styles.emptyStateSubtext}>Ajoutez des objectifs santé pour voir des exercices personnalisés</Text>
            <TouchableOpacity style={styles.goToGoalsButton} onPress={() => router.push('/goals')}>
              <Text style={styles.goToGoalsButtonText}>Ajouter des objectifs</Text>
            </TouchableOpacity>
          </View>
        ) : exercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="sync-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>Chargement...</Text>
            <Text style={styles.emptyStateSubtext}>Récupération des exercices recommandés</Text>
          </View>
        ) : (
          <>
            <Text style={styles.intro}>
              Basé sur vos objectifs ({healthGoals.length} objectif{healthGoals.length > 1 ? 's' : ''}), voici les exercices recommandés :
            </Text>
            {exercises.map((exercise: any, index: number) => (
              <View key={index} style={styles.exerciseCard}>
                <View style={styles.exerciseIcon}>
                  <Ionicons name={getExerciseIcon(exercise.icon) as any} size={28} color={colors.primary} />
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseGoal}>Pour: {exercise.goal_type}</Text>
                  <View style={styles.exerciseDetails}>
                    <View style={styles.exerciseDetail}>
                      <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.exerciseDetailText}>{exercise.duration}</Text>
                    </View>
                    <View style={styles.exerciseDetail}>
                      <Ionicons name="flame-outline" size={14} color={colors.warning} />
                      <Text style={styles.exerciseDetailText}>{exercise.calories} kcal</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </>
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
  goToGoalsButton: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, marginTop: 20 },
  goToGoalsButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  intro: { fontSize: 14, color: colors.textSecondary, marginBottom: 16, lineHeight: 20 },
  exerciseCard: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12 },
  exerciseIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  exerciseInfo: { flex: 1, marginLeft: 16 },
  exerciseName: { fontSize: 16, fontWeight: '600', color: colors.text },
  exerciseGoal: { fontSize: 12, color: colors.primary, marginTop: 4 },
  exerciseDetails: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  exerciseDetail: { flexDirection: 'row', alignItems: 'center', marginRight: 16, marginTop: 4 },
  exerciseDetailText: { fontSize: 12, color: colors.textSecondary, marginLeft: 4 },
});
