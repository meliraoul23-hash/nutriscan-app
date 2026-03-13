// Premium Design System - NutriScan
// Neubrutalist meets Apple Minimalist

export const theme = {
  // Color Palette
  colors: {
    // Backgrounds
    background: '#FFFFFF',
    backgroundSecondary: '#F9FAFB',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    
    // Primary - Vibrant Healthy Green
    primary: '#2ECC71',
    primaryLight: '#A8E6CF',
    primaryDark: '#27AE60',
    
    // Status Colors
    success: '#2ECC71',
    warning: '#F39C12',
    error: '#E74C3C',
    info: '#3498DB',
    
    // Nutri-Score Colors
    nutriA: '#2ECC71',
    nutriB: '#A8D08D',
    nutriC: '#F39C12',
    nutriD: '#E67E22',
    nutriE: '#E74C3C',
    
    // Text
    text: '#1A1A2E',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    textInverse: '#FFFFFF',
    
    // Premium
    premium: '#F59E0B',
    premiumGold: '#FFD700',
    
    // Borders
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    
    // Overlays
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
    frostedGlass: 'rgba(255, 255, 255, 0.85)',
  },

  // Typography
  typography: {
    // Font Family (Inter-like system fonts)
    fontFamily: {
      regular: 'System',
      medium: 'System',
      semiBold: 'System',
      bold: 'System',
    },
    
    // Font Sizes
    sizes: {
      xs: 11,
      sm: 13,
      base: 15,
      md: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
      '5xl': 48,
    },
    
    // Font Weights
    weights: {
      regular: '400',
      medium: '500',
      semiBold: '600',
      bold: '700',
      extraBold: '800',
    },
    
    // Line Heights
    lineHeights: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
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
    none: 0,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    full: 9999,
  },

  // Shadows (Neumorphism-inspired)
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 8,
    },
    // Soft neumorphic shadow
    soft: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 4,
    },
    // Card shadow
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
  },

  // Animation
  animation: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500,
    },
    easing: 'ease-in-out',
  },
};

// Score color gradient function
export const getScoreGradient = (score: number): string => {
  if (score >= 80) return theme.colors.nutriA;
  if (score >= 60) return theme.colors.nutriB;
  if (score >= 45) return theme.colors.nutriC;
  if (score >= 30) return theme.colors.nutriD;
  return theme.colors.nutriE;
};

// Nutri-Score color
export const getNutriScoreColor = (grade: string): string => {
  const gradeColors: Record<string, string> = {
    A: theme.colors.nutriA,
    B: theme.colors.nutriB,
    C: theme.colors.nutriC,
    D: theme.colors.nutriD,
    E: theme.colors.nutriE,
  };
  return gradeColors[grade?.toUpperCase()] || theme.colors.nutriC;
};

// Additive risk color
export const getAdditiveColor = (risk: string): string => {
  const riskColors: Record<string, string> = {
    low: theme.colors.success,
    medium: theme.colors.warning,
    high: theme.colors.error,
  };
  return riskColors[risk?.toLowerCase()] || theme.colors.textSecondary;
};

// Legacy export for backward compatibility
export const colors = {
  primary: theme.colors.primary,
  primaryLight: theme.colors.primaryLight,
  background: theme.colors.background,
  surface: theme.colors.surface,
  surfaceAlt: theme.colors.backgroundSecondary,
  text: theme.colors.text,
  textSecondary: theme.colors.textSecondary,
  success: theme.colors.success,
  warning: theme.colors.warning,
  error: theme.colors.error,
  premium: theme.colors.premium,
  border: theme.colors.border,
};

export { getScoreGradient as getScoreColor };
