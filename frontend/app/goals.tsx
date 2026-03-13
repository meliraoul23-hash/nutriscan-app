// Goals Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { useApp } from '../src/contexts/AppContext';
import { addHealthGoalAPI, removeHealthGoalAPI } from '../src/services/api';
import { colors } from '../src/styles/colors';

const GOAL_OPTIONS = [
  { type: 'weight_loss', name: 'Perte de poids', icon: 'trending-down', color: colors.primary },
  { type: 'muscle_gain', name: 'Prise de muscle', icon: 'barbell', color: colors.warning },
  { type: 'energy', name: 'Plus d\'énergie', icon: 'flash', color: '#FF9800' },
  { type: 'digestion', name: 'Meilleure digestion', icon: 'leaf', color: colors.success },
  { type: 'sleep', name: 'Mieux dormir', icon: 'moon', color: '#9C27B0' },
  { type: 'immunity', name: 'Renforcer l\'immunité', icon: 'shield-checkmark', color: '#2196F3' },
];

export default function GoalsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { healthGoals, setHealthGoals, fetchHealthGoals } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<typeof GOAL_OPTIONS[0] | null>(null);

  const handleAddGoal = async () => {
    if (!user || !selectedGoal) return;
    
    try {
      await addHealthGoalAPI(selectedGoal.type, selectedGoal.name, user.email, user.user_id);
      await fetchHealthGoals();
      setShowAddModal(false);
      setSelectedGoal(null);
    } catch (error) {
      console.log('Error adding goal:', error);
    }
  };

  const handleRemoveGoal = async (goalId: string) => {
    if (!user) return;
    
    Alert.alert(
      'Supprimer l\'objectif',
      'Êtes-vous sûr de vouloir supprimer cet objectif ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeHealthGoalAPI(goalId, user.email, user.user_id);
              setHealthGoals((prev: any[]) => prev.filter((g: any) => g.id !== goalId));
            } catch (error) {
              console.log('Error removing goal:', error);
            }
          },
        },
      ]
    );
  };

  const getGoalIcon = (type: string) => {
    return GOAL_OPTIONS.find(g => g.type === type)?.icon || 'flag';
  };

  const getGoalColor = (type: string) => {
    return GOAL_OPTIONS.find(g => g.type === type)?.color || colors.primary;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Mes Objectifs Santé</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Exercises Link */}
        <TouchableOpacity style={styles.exercisesLink} onPress={() => router.push('/exercises')}>
          <Ionicons name="fitness" size={24} color="#FFF" />
          <Text style={styles.exercisesLinkText}>Voir mes exercices recommandés</Text>
          <Ionicons name="chevron-forward" size={20} color="#FFF" />
        </TouchableOpacity>

        {/* Goals List */}
        {healthGoals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="flag-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>Aucun objectif</Text>
            <Text style={styles.emptyStateSubtext}>Définissez vos objectifs santé pour obtenir des recommandations personnalisées</Text>
          </View>
        ) : (
          healthGoals.map((goal: any) => (
            <View key={goal.id} style={styles.goalCard}>
              <View style={[styles.goalIcon, { backgroundColor: getGoalColor(goal.type) + '20' }]}>
                <Ionicons name={getGoalIcon(goal.type) as any} size={24} color={getGoalColor(goal.type)} />
              </View>
              <View style={styles.goalInfo}>
                <Text style={styles.goalName}>{goal.name}</Text>
              </View>
              <TouchableOpacity onPress={() => handleRemoveGoal(goal.id)}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Add Goal Button */}
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color="#FFF" />
          <Text style={styles.addButtonText}>Ajouter un objectif</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Goal Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir un objectif</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.goalOptionsGrid}>
                {GOAL_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.type}
                    style={[
                      styles.goalOption,
                      selectedGoal?.type === option.type && styles.goalOptionSelected,
                    ]}
                    onPress={() => setSelectedGoal(option)}
                  >
                    <Ionicons name={option.icon as any} size={32} color={option.color} />
                    <Text style={styles.goalOptionText}>{option.name}</Text>
                    {selectedGoal?.type === option.type && (
                      <View style={styles.checkmark}>
                        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.confirmButton, !selectedGoal && styles.confirmButtonDisabled]}
                onPress={handleAddGoal}
                disabled={!selectedGoal}
              >
                <Text style={styles.confirmButtonText}>Ajouter cet objectif</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  exercisesLink: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 16, padding: 16, marginBottom: 20 },
  exercisesLinkText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#FFF', marginLeft: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyStateTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
  goalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12 },
  goalIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  goalInfo: { flex: 1, marginLeft: 12 },
  goalName: { fontSize: 16, fontWeight: '600', color: colors.text },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, marginTop: 20 },
  addButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.surface },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  modalBody: { padding: 20 },
  goalOptionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  goalOption: { width: '48%', backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  goalOptionSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
  goalOptionText: { fontSize: 13, fontWeight: '500', color: colors.text, marginTop: 8, textAlign: 'center' },
  checkmark: { position: 'absolute', top: 8, right: 8 },
  confirmButton: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  confirmButtonDisabled: { opacity: 0.5 },
  confirmButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
