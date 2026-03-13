// Score Circle Component
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, getScoreColor } from '../styles/colors';

interface ScoreCircleProps {
  score: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export const ScoreCircle: React.FC<ScoreCircleProps> = ({
  score,
  size = 'medium',
  showLabel = true,
}) => {
  const dimensions = {
    small: { outer: 60, inner: 52, fontSize: 20, borderWidth: 4 },
    medium: { outer: 100, inner: 88, fontSize: 32, borderWidth: 6 },
    large: { outer: 120, inner: 104, fontSize: 36, borderWidth: 8 },
  };

  const dim = dimensions[size];
  const scoreColor = getScoreColor(score);

  const getScoreLabel = (score: number): string => {
    if (score >= 70) return 'Excellent';
    if (score >= 50) return 'Moyen';
    return 'À éviter';
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.circle,
          {
            width: dim.outer,
            height: dim.outer,
            borderRadius: dim.outer / 2,
            borderWidth: dim.borderWidth,
            borderColor: scoreColor,
          },
        ]}
      >
        <Text style={[styles.scoreValue, { fontSize: dim.fontSize, color: scoreColor }]}>
          {score}
        </Text>
        <Text style={styles.scoreMax}>/100</Text>
      </View>
      {showLabel && (
        <Text style={[styles.label, { color: scoreColor }]}>{getScoreLabel(score)}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  scoreValue: {
    fontWeight: '700',
  },
  scoreMax: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
});

export default ScoreCircle;
