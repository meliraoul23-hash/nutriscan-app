// Premium Button - Animated button with haptic feedback
import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  View,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../styles/theme';

interface PremiumButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  hapticFeedback?: boolean;
  style?: any;
}

export const PremiumButton: React.FC<PremiumButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  hapticFeedback = true,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePress = async () => {
    if (hapticFeedback && Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  };

  const getButtonStyles = () => {
    const baseStyles = [styles.button, styles[`button_${size}`]];
    
    switch (variant) {
      case 'primary':
        baseStyles.push(styles.buttonPrimary);
        break;
      case 'secondary':
        baseStyles.push(styles.buttonSecondary);
        break;
      case 'outline':
        baseStyles.push(styles.buttonOutline);
        break;
      case 'ghost':
        baseStyles.push(styles.buttonGhost);
        break;
    }

    if (disabled || loading) {
      baseStyles.push(styles.buttonDisabled);
    }

    if (fullWidth) {
      baseStyles.push(styles.buttonFullWidth);
    }

    return baseStyles;
  };

  const getTextStyles = () => {
    const baseStyles = [styles.text, styles[`text_${size}`]];
    
    switch (variant) {
      case 'primary':
        baseStyles.push(styles.textPrimary);
        break;
      case 'secondary':
        baseStyles.push(styles.textSecondary);
        break;
      case 'outline':
        baseStyles.push(styles.textOutline);
        break;
      case 'ghost':
        baseStyles.push(styles.textGhost);
        break;
    }

    return baseStyles;
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, fullWidth && { width: '100%' }, style]}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
        style={getButtonStyles()}
      >
        {loading ? (
          <ActivityIndicator 
            size="small" 
            color={variant === 'primary' ? '#FFF' : theme.colors.primary} 
          />
        ) : (
          <View style={styles.content}>
            {icon && iconPosition === 'left' && (
              <View style={styles.iconLeft}>{icon}</View>
            )}
            <Text style={getTextStyles()}>{title}</Text>
            {icon && iconPosition === 'right' && (
              <View style={styles.iconRight}>{icon}</View>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Floating Action Button
interface FABProps {
  icon: React.ReactNode;
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  style?: any;
}

export const FloatingActionButton: React.FC<FABProps> = ({
  icon,
  onPress,
  size = 'md',
  color = theme.colors.primary,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePress = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    onPress();
  };

  const sizes = {
    sm: 48,
    md: 56,
    lg: 64,
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={[
          styles.fab,
          {
            width: sizes[size],
            height: sizes[size],
            borderRadius: sizes[size] / 2,
            backgroundColor: color,
          },
        ]}
      >
        {icon}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.lg,
    ...theme.shadows.md,
  },
  button_sm: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 40,
  },
  button_md: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 52,
  },
  button_lg: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    minHeight: 60,
  },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
  },
  buttonSecondary: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonFullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  text_sm: {
    fontSize: 14,
  },
  text_md: {
    fontSize: 16,
  },
  text_lg: {
    fontSize: 18,
  },
  textPrimary: {
    color: '#FFFFFF',
  },
  textSecondary: {
    color: theme.colors.text,
  },
  textOutline: {
    color: theme.colors.primary,
  },
  textGhost: {
    color: theme.colors.primary,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  fab: {
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
});

export default PremiumButton;
