// Healing Food Card Component
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import { HealingFood } from '../types';

interface HealingFoodCardProps {
  food: HealingFood;
  onPress: () => void;
}

export const HealingFoodCard: React.FC<HealingFoodCardProps> = ({ food, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.emoji}>{food.image}</Text>
      <Text style={styles.name}>{food.name}</Text>
      <Text style={styles.benefit} numberOfLines={2}>
        {food.benefits.slice(0, 2).join(', ')}
      </Text>
      <View style={styles.tapHint}>
        <Text style={styles.tapText}>Voir plus</Text>
        <Ionicons name="chevron-forward" size={12} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 140,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  benefit: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  tapText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
  },
});

export default HealingFoodCard;
