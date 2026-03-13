// Product Card Component
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, getScoreColor } from '../styles/colors';

interface ProductCardProps {
  barcode: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  healthScore: number;
  nutriScore?: string;
  onPress?: () => void;
  showScore?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  name,
  brand,
  imageUrl,
  healthScore,
  onPress,
  showScore = true,
}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <Ionicons name="cube-outline" size={30} color={colors.textSecondary} />
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.brand} numberOfLines={1}>{brand || 'Marque inconnue'}</Text>
      </View>
      {showScore && (
        <View style={[styles.score, { backgroundColor: getScoreColor(healthScore) }]}>
          <Text style={styles.scoreText}>{healthScore}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  imageContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  brand: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  score: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default ProductCard;
