// Animated Score Gauge - Premium Semi-circular animated gauge
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { theme, getScoreGradient } from '../styles/theme';

interface AnimatedScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const AnimatedScoreGauge: React.FC<AnimatedScoreGaugeProps> = ({
  score,
  size = 160,
  strokeWidth = 12,
  showLabel = true,
  label = 'Score Santé',
  animated = true,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI; // Semi-circle
  const center = size / 2;

  useEffect(() => {
    // Score animation
    if (animated) {
      Animated.timing(animatedValue, {
        toValue: score,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

      // Gentle pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      animatedValue.setValue(score);
    }
  }, [score, animated]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: 'clamp',
  });

  const displayScore = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0', String(Math.round(score))],
    extrapolate: 'clamp',
  });

  const scoreColor = getScoreGradient(score);
  
  const getScoreText = (s: number): string => {
    if (s >= 80) return 'Excellent';
    if (s >= 60) return 'Bon';
    if (s >= 45) return 'Moyen';
    if (s >= 30) return 'Médiocre';
    return 'À éviter';
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      <Svg width={size} height={size / 2 + 20}>
        <Defs>
          <LinearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={theme.colors.nutriE} />
            <Stop offset="25%" stopColor={theme.colors.nutriD} />
            <Stop offset="50%" stopColor={theme.colors.nutriC} />
            <Stop offset="75%" stopColor={theme.colors.nutriB} />
            <Stop offset="100%" stopColor={theme.colors.nutriA} />
          </LinearGradient>
        </Defs>
        
        {/* Background arc */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme.colors.backgroundSecondary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          rotation={180}
          origin={`${center}, ${center}`}
        />
        
        {/* Animated progress arc */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          rotation={180}
          origin={`${center}, ${center}`}
        />
      </Svg>
      
      {/* Score display */}
      <View style={[styles.scoreContainer, { top: size / 4 }]}>
        <Animated.Text style={[styles.scoreNumber, { color: scoreColor }]}>
          {score}
        </Animated.Text>
        <Text style={styles.scoreMax}>/100</Text>
      </View>
      
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={[styles.statusText, { color: scoreColor }]}>
            {getScoreText(score)}
          </Text>
          <Text style={styles.labelText}>{label}</Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -2,
  },
  scoreMax: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginLeft: 2,
  },
  labelContainer: {
    alignItems: 'center',
    marginTop: -10,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  labelText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});

export default AnimatedScoreGauge;
