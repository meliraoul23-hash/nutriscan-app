// Skeleton Loader - Shimmer loading effect
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const translateX = useRef(new Animated.Value(-SCREEN_WIDTH)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(translateX, {
        toValue: SCREEN_WIDTH,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  return (
    <View
      style={[
        styles.skeleton,
        {
          width: typeof width === 'number' ? width : undefined,
          height,
          borderRadius,
        },
        typeof width === 'string' && { flex: 1 },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.5)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

// Product Card Skeleton
export const ProductCardSkeleton: React.FC = () => (
  <View style={styles.productCard}>
    <Skeleton width={60} height={60} borderRadius={12} />
    <View style={styles.productInfo}>
      <Skeleton width="70%" height={18} style={{ marginBottom: 8 }} />
      <Skeleton width="40%" height={14} />
    </View>
    <Skeleton width={44} height={44} borderRadius={22} />
  </View>
);

// Full Product Skeleton
export const ProductDetailSkeleton: React.FC = () => (
  <View style={styles.detailContainer}>
    {/* Header */}
    <View style={styles.detailHeader}>
      <Skeleton width={80} height={80} borderRadius={16} />
      <View style={styles.detailHeaderInfo}>
        <Skeleton width="80%" height={22} style={{ marginBottom: 8 }} />
        <Skeleton width="50%" height={16} />
      </View>
    </View>
    
    {/* Score Card */}
    <View style={styles.scoreCard}>
      <Skeleton width={140} height={140} borderRadius={70} style={{ marginBottom: 16 }} />
      <Skeleton width={120} height={20} style={{ marginBottom: 8 }} />
      <Skeleton width={80} height={16} />
    </View>
    
    {/* Info Cards */}
    <View style={styles.infoCards}>
      <Skeleton width="48%" height={100} borderRadius={16} />
      <Skeleton width="48%" height={100} borderRadius={16} />
    </View>
    
    {/* Section */}
    <View style={styles.section}>
      <Skeleton width={150} height={20} style={{ marginBottom: 16 }} />
      <Skeleton width="100%" height={60} borderRadius={12} style={{ marginBottom: 8 }} />
      <Skeleton width="100%" height={60} borderRadius={12} />
    </View>
  </View>
);

// Home Screen Skeleton
export const HomeScreenSkeleton: React.FC = () => (
  <View style={styles.homeContainer}>
    {/* Hero */}
    <View style={styles.heroSkeleton}>
      <Skeleton width={80} height={80} borderRadius={40} style={{ marginBottom: 16 }} />
      <Skeleton width={140} height={28} style={{ marginBottom: 8 }} />
      <Skeleton width={200} height={16} />
    </View>
    
    {/* Scan Button */}
    <Skeleton width="100%" height={56} borderRadius={16} style={{ marginBottom: 12 }} />
    <Skeleton width="100%" height={48} borderRadius={12} style={{ marginBottom: 24 }} />
    
    {/* Section */}
    <Skeleton width={120} height={20} style={{ marginBottom: 12 }} />
    <ProductCardSkeleton />
    <ProductCardSkeleton />
    <ProductCardSkeleton />
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: theme.colors.backgroundSecondary,
    overflow: 'hidden',
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    ...theme.shadows.card,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  detailContainer: {
    padding: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  detailHeaderInfo: {
    flex: 1,
    marginLeft: 16,
  },
  scoreCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    ...theme.shadows.card,
  },
  infoCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...theme.shadows.card,
  },
  homeContainer: {
    padding: 16,
  },
  heroSkeleton: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
  },
});

export default Skeleton;
