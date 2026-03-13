// Color palette for NutriScan app

export const colors = {
  primary: '#4CAF50',
  primaryLight: '#81C784',
  primaryDark: '#388E3C',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  surfaceAlt: '#E8F5E9',
  text: '#212121',
  textSecondary: '#757575',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  premium: '#FFD700',
  scoreHigh: '#4CAF50',
  scoreMedium: '#FF9800',
  scoreLow: '#F44336',
};

// Helper functions
export const getScoreColor = (score: number): string => {
  if (score >= 70) return colors.scoreHigh;
  if (score >= 40) return colors.scoreMedium;
  return colors.scoreLow;
};

export const getNutriScoreColor = (grade: string): string => {
  const gradeColors: { [key: string]: string } = {
    'A': '#038141',
    'B': '#85BB2F',
    'C': '#FECB02',
    'D': '#EE8100',
    'E': '#E63E11',
  };
  return gradeColors[grade.toUpperCase()] || colors.textSecondary;
};

export const getAdditiveColor = (risk: string): string => {
  if (risk === 'high') return colors.error;
  if (risk === 'medium') return colors.warning;
  return colors.success;
};
