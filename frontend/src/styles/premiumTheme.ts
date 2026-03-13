// Premium Theme - iOS 18 Style with Glassmorphism & Bento Grid
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const premiumTheme = {
  // Color Modes
  light: {
    // Backgrounds
    background: '#F2F2F7',
    backgroundPrimary: '#FFFFFF',
    backgroundSecondary: '#F9FAFB',
    backgroundTertiary: '#F3F4F6',
    
    // Glass Effects
    glass: 'rgba(255, 255, 255, 0.70)',
    glassStrong: 'rgba(255, 255, 255, 0.85)',
    glassBorder: 'rgba(255, 255, 255, 0.20)',
    glassHighlight: 'rgba(255, 255, 255, 0.50)',
    
    // Text
    text: '#000000',
    textPrimary: '#1C1C1E',
    textSecondary: '#8E8E93',
    textTertiary: '#AEAEB2',
    textInverse: '#FFFFFF',
    
    // Accent Colors
    primary: '#34C759',
    primaryLight: '#30D158',
    secondary: '#007AFF',
    accent: '#5856D6',
    
    // Status
    success: '#34C759',
    warning: '#FF9F0A',
    error: '#FF3B30',
    info: '#5AC8FA',
    
    // Card backgrounds with transparency
    cardPrimary: 'rgba(255, 255, 255, 0.75)',
    cardSecondary: 'rgba(249, 250, 251, 0.80)',
  },
  
  dark: {
    // Backgrounds
    background: '#000000',
    backgroundPrimary: '#1C1C1E',
    backgroundSecondary: '#2C2C2E',
    backgroundTertiary: '#3A3A3C',
    
    // Glass Effects
    glass: 'rgba(28, 28, 30, 0.70)',
    glassStrong: 'rgba(28, 28, 30, 0.85)',
    glassBorder: 'rgba(255, 255, 255, 0.10)',
    glassHighlight: 'rgba(255, 255, 255, 0.08)',
    
    // Text
    text: '#FFFFFF',
    textPrimary: '#FFFFFF',
    textSecondary: '#8E8E93',
    textTertiary: '#636366',
    textInverse: '#000000',
    
    // Accent Colors
    primary: '#30D158',
    primaryLight: '#34C759',
    secondary: '#0A84FF',
    accent: '#5E5CE6',
    
    // Status
    success: '#30D158',
    warning: '#FF9F0A',
    error: '#FF453A',
    info: '#64D2FF',
    
    // Card backgrounds with transparency
    cardPrimary: 'rgba(44, 44, 46, 0.75)',
    cardSecondary: 'rgba(58, 58, 60, 0.80)',
  },
  
  // Nutri-Score Colors (same for both modes)
  nutriScore: {
    A: '#00C853',
    B: '#7CB342',
    C: '#FFB300',
    D: '#FF6D00',
    E: '#DD2C00',
  },
  
  // Health Score Gradient
  scoreGradient: {
    excellent: '#00C853',
    good: '#7CB342',
    average: '#FFB300',
    poor: '#FF6D00',
    bad: '#DD2C00',
  },
  
  // Typography - SF Pro Display style
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      semiBold: 'System',
      bold: 'System',
    },
    sizes: {
      xs: 11,
      sm: 13,
      base: 15,
      md: 17,
      lg: 20,
      xl: 24,
      '2xl': 28,
      '3xl': 34,
      '4xl': 40,
      '5xl': 48,
      hero: 60,
    },
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      semiBold: '600' as const,
      bold: '700' as const,
      heavy: '800' as const,
    },
    letterSpacing: {
      tight: -0.5,
      normal: 0,
      wide: 0.5,
      wider: 1,
    },
  },
  
  // Spacing (8pt grid)
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    '4xl': 48,
    '5xl': 64,
  },
  
  // Border Radius
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    full: 9999,
  },
  
  // Glassmorphism Shadows
  shadows: {
    glass: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 32,
      elevation: 8,
    },
    floating: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.12,
      shadowRadius: 40,
      elevation: 12,
    },
    soft: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 16,
      elevation: 4,
    },
    glow: (color: string) => ({
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 8,
    }),
  },
  
  // Bento Grid Dimensions
  bento: {
    gap: 12,
    // Card sizes relative to screen width
    small: (SCREEN_WIDTH - 48 - 24) / 3, // 3 cards per row with gaps
    medium: (SCREEN_WIDTH - 48 - 12) / 2, // 2 cards per row
    large: SCREEN_WIDTH - 48, // Full width with padding
    // Heights
    smallHeight: 100,
    mediumHeight: 140,
    largeHeight: 200,
  },
  
  // Animation
  animation: {
    duration: {
      instant: 100,
      fast: 200,
      normal: 300,
      slow: 500,
      stagger: 80,
    },
    spring: {
      damping: 15,
      stiffness: 150,
      mass: 0.5,
    },
  },
  
  // Screen dimensions
  screen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
};

// Helper functions
export const getScoreColor = (score: number, isDark: boolean = false): string => {
  const colors = premiumTheme.scoreGradient;
  if (score >= 80) return colors.excellent;
  if (score >= 60) return colors.good;
  if (score >= 45) return colors.average;
  if (score >= 30) return colors.poor;
  return colors.bad;
};

export const getNutriColor = (grade: string): string => {
  return premiumTheme.nutriScore[grade?.toUpperCase() as keyof typeof premiumTheme.nutriScore] || premiumTheme.nutriScore.C;
};

export const getAdditiveRiskColor = (risk: string): string => {
  switch (risk?.toLowerCase()) {
    case 'low': return premiumTheme.light.success;
    case 'medium': return premiumTheme.light.warning;
    case 'high': return premiumTheme.light.error;
    default: return premiumTheme.light.textSecondary;
  }
};

// Export for backward compatibility
export const colors = {
  primary: premiumTheme.light.primary,
  primaryLight: premiumTheme.light.primaryLight,
  background: premiumTheme.light.background,
  surface: premiumTheme.light.backgroundPrimary,
  surfaceAlt: premiumTheme.light.backgroundSecondary,
  text: premiumTheme.light.textPrimary,
  textSecondary: premiumTheme.light.textSecondary,
  success: premiumTheme.light.success,
  warning: premiumTheme.light.warning,
  error: premiumTheme.light.error,
  premium: '#F59E0B',
  border: 'rgba(0,0,0,0.08)',
};

export const theme = premiumTheme;
export const getScoreGradient = getScoreColor;
export const getNutriScoreColor = getNutriColor;
export const getAdditiveColor = getAdditiveRiskColor;
