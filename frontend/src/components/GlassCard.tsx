// Glass Card - Glassmorphism effect component
import React, { useRef } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { premiumTheme } from '../styles/premiumTheme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  borderGradient?: boolean;
  size?: 'small' | 'medium' | 'large' | 'custom';
  animated?: boolean;
  delay?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  onPress,
  intensity = 50,
  tint = 'light',
  borderGradient = true,
  size = 'custom',
  animated = true,
  delay = 0,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(animated ? 0 : 1)).current;
  const translateYAnim = useRef(new Animated.Value(animated ? 20 : 0)).current;

  React.useEffect(() => {
    if (animated) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 400,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [animated, delay]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      ...premiumTheme.animation.spring,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      ...premiumTheme.animation.spring,
    }).start();
  };

  const handlePress = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return { width: premiumTheme.bento.small, height: premiumTheme.bento.smallHeight };
      case 'medium':
        return { width: premiumTheme.bento.medium, height: premiumTheme.bento.mediumHeight };
      case 'large':
        return { width: premiumTheme.bento.large, height: premiumTheme.bento.largeHeight };
      default:
        return {};
    }
  };

  const content = (
    <Animated.View
      style={[
        styles.container,
        getSizeStyle(),
        {
          transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
          opacity: opacityAnim,
        },
        style,
      ]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={intensity} tint={tint} style={styles.blurContainer}>
          <View style={[styles.innerContainer, borderGradient && styles.borderGradient]}>
            {children}
          </View>
        </BlurView>
      ) : (
        <View style={[styles.androidContainer, borderGradient && styles.borderGradient]}>
          {children}
        </View>
      )}
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

// Bento Grid Container
interface BentoGridProps {
  children: React.ReactNode;
  style?: any;
}

export const BentoGrid: React.FC<BentoGridProps> = ({ children, style }) => {
  return (
    <View style={[styles.bentoGrid, style]}>
      {children}
    </View>
  );
};

// Bento Row
export const BentoRow: React.FC<BentoGridProps> = ({ children, style }) => {
  return (
    <View style={[styles.bentoRow, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: premiumTheme.radius.xl,
    overflow: 'hidden',
    ...premiumTheme.shadows.glass,
  },
  blurContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: premiumTheme.radius.xl,
  },
  innerContainer: {
    flex: 1,
    padding: premiumTheme.spacing.base,
  },
  androidContainer: {
    flex: 1,
    backgroundColor: premiumTheme.light.glass,
    padding: premiumTheme.spacing.base,
    borderRadius: premiumTheme.radius.xl,
  },
  borderGradient: {
    borderWidth: 1,
    borderColor: premiumTheme.light.glassBorder,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: premiumTheme.bento.gap,
    paddingHorizontal: premiumTheme.spacing.base,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: premiumTheme.bento.gap,
    marginBottom: premiumTheme.bento.gap,
  },
});

export default GlassCard;
