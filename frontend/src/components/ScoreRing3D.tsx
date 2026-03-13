// 3D Animated Score Ring - Premium iOS style
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { premiumTheme, getScoreColor } from '../styles/premiumTheme';

interface ScoreRing3DProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  animated?: boolean;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const ScoreRing3D: React.FC<ScoreRing3DProps> = ({
  score,
  size = 200,
  strokeWidth = 16,
  showLabel = true,
  animated = true,
}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  useEffect(() => {
    if (animated) {
      // Score progress animation
      Animated.timing(progressAnim, {
        toValue: score,
        duration: 1800,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: false,
      }).start();

      // Continuous pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
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

      // Glow animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.6,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      progressAnim.setValue(score);
    }
  }, [score, animated]);

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: 'clamp',
  });

  const scoreColor = getScoreColor(score);
  const scoreColorLight = getScoreColor(Math.min(100, score + 20));

  const getScoreGrade = (s: number): string => {
    if (s >= 80) return 'Excellent';
    if (s >= 60) return 'Bon';
    if (s >= 45) return 'Moyen';
    if (s >= 30) return 'Médiocre';
    return 'À éviter';
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: size + 40,
            height: size + 40,
            borderRadius: (size + 40) / 2,
            backgroundColor: scoreColor,
            opacity: glowAnim,
          },
        ]}
      />

      {/* Background shadow ring */}
      <View style={[styles.shadowRing, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 }]} />

      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={scoreColorLight} />
            <Stop offset="50%" stopColor={scoreColor} />
            <Stop offset="100%" stopColor={scoreColor} />
          </LinearGradient>
          <LinearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <Stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
          </LinearGradient>
        </Defs>

        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#bgGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />

        {/* Progress ring */}
        <G rotation={-90} origin={`${center}, ${center}`}>
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#ringGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
          />
        </G>

        {/* Inner highlight for 3D effect */}
        <Circle
          cx={center}
          cy={center}
          r={radius - strokeWidth / 2 - 2}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={1}
          fill="none"
        />
      </Svg>

      {/* Score display */}
      <View style={[styles.scoreContainer, { width: size, height: size }]}>
        <Text style={[styles.scoreNumber, { color: scoreColor }]}>{score}</Text>
        <Text style={styles.scoreLabel}>/100</Text>
        {showLabel && (
          <Text style={[styles.gradeText, { color: scoreColor }]}>{getScoreGrade(score)}</Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  shadowRing: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.03)',
    ...premiumTheme.shadows.soft,
  },
  svg: {
    zIndex: 1,
  },
  scoreContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  scoreNumber: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -3,
  },
  scoreLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: premiumTheme.light.textSecondary,
    marginTop: -8,
  },
  gradeText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    letterSpacing: 0.5,
  },
});

export default ScoreRing3D;
