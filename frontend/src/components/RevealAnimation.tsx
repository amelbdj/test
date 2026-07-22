import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { AnimatedPressable } from './Animations';

const { width, height } = Dimensions.get('window');

interface RevealAnimationProps {
  visible: boolean;
  onComplete: () => void;
  weekStats?: {
    dropsCount: number;
    streak: number;
    isPerfectWeek: boolean;
  };
}

export const RevealAnimation: React.FC<RevealAnimationProps> = ({
  visible,
  onComplete,
  weekStats,
}) => {
  const theme = useTheme();
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);
  const lockScale = useSharedValue(1);
  const lockRotation = useSharedValue(0);
  const lockOpacity = useSharedValue(1);
  const unlockProgress = useSharedValue(0);
  const shinePosition = useSharedValue(-width);
  const textOpacity = useSharedValue(0);
  const statsOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Start animation sequence
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, { damping: 12, stiffness: 100 });

      // Lock shake animation
      lockRotation.value = withSequence(
        withTiming(10, { duration: 100 }),
        withTiming(-10, { duration: 100 }),
        withTiming(10, { duration: 100 }),
        withTiming(-10, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );

      // Unlock animation after shake
      setTimeout(() => {
        lockScale.value = withSpring(1.3, { damping: 8 });
        lockOpacity.value = withTiming(0, { duration: 400 });
        unlockProgress.value = withTiming(1, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
        
        // Shine effect
        shinePosition.value = withTiming(width * 2, { duration: 800 });
        
        // Haptic feedback
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // Show text
        textOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
        
        // Show stats
        statsOpacity.value = withDelay(800, withTiming(1, { duration: 500 }));
      }, 600);
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const lockStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: lockScale.value },
      { rotate: `${lockRotation.value}deg` },
    ],
    opacity: lockOpacity.value,
  }));

  const unlockStyle = useAnimatedStyle(() => ({
    opacity: unlockProgress.value,
    transform: [{ scale: interpolate(unlockProgress.value, [0, 1], [0.5, 1]) }],
  }));

  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shinePosition.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: interpolate(textOpacity.value, [0, 1], [20, 0]) }],
  }));

  const statsStyle = useAnimatedStyle(() => ({
    opacity: statsOpacity.value,
    transform: [{ translateY: interpolate(statsOpacity.value, [0, 1], [30, 0]) }],
  }));

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible}>
      <View style={[styles.blurContainer, Platform.OS === 'web' && { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
        {Platform.OS !== 'web' ? (
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
        ) : null}
        <Animated.View style={[styles.content, containerStyle]}>
          {/* Lock Icon */}
          <Animated.View style={[styles.lockContainer, lockStyle]}>
            <LinearGradient
              colors={[theme.gradientStart, theme.gradientEnd]}
              style={styles.lockGradient}
            >
              <Ionicons name="lock-closed" size={60} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>

          {/* Unlocked Icon */}
          <Animated.View style={[styles.unlockedContainer, unlockStyle]}>
            <LinearGradient
              colors={[theme.gradientStart, theme.gradientEnd]}
              style={styles.lockGradient}
            >
              <Ionicons name="lock-open" size={60} color="#FFFFFF" />
            </LinearGradient>
            {/* Shine effect */}
            <Animated.View style={[styles.shine, shineStyle]} />
          </Animated.View>

          {/* Text */}
          <Animated.View style={[styles.textContainer, textStyle]}>
            <Text style={[styles.revealTitle, { color: theme.text }]}>C&apos;est l&apos;heure ! 🎉</Text>
            <Text style={[styles.revealSubtitle, { color: theme.textSecondary }]}>
              Vos Drops sont maintenant révélés
            </Text>
          </Animated.View>

          {/* Weekly Stats */}
          {weekStats && (
            <Animated.View style={[styles.statsContainer, statsStyle, { backgroundColor: theme.card }]}>
              <Text style={[styles.statsTitle, { color: theme.textSecondary }]}>RÉSUMÉ DE LA SEMAINE</Text>
              
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.text }]}>{weekStats.dropsCount}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Drops</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                <View style={styles.statItem}>
                  <View style={styles.streakValue}>
                    <Text style={styles.fireEmoji}>🔥</Text>
                    <Text style={[styles.statValue, { color: theme.streak }]}>{weekStats.streak}</Text>
                  </View>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Streak</Text>
                </View>
              </View>

              {weekStats.isPerfectWeek && (
                <View style={[styles.perfectWeekBadge, { backgroundColor: theme.successMuted }]}>
                  <Text style={styles.perfectWeekEmoji}>⭐</Text>
                  <Text style={[styles.perfectWeekText, { color: theme.success }]}>Semaine parfaite !</Text>
                </View>
              )}
            </Animated.View>
          )}

          {/* Continue Button */}
          <Animated.View style={statsStyle}>
            <AnimatedPressable onPress={onComplete} haptic="medium">
              <LinearGradient
                colors={[theme.gradientStart, theme.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.continueButton}
              >
                <Text style={styles.continueText}>Découvrir les Drops</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </LinearGradient>
            </AnimatedPressable>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 24,
  },
  lockContainer: {
    position: 'absolute',
    top: height * 0.15,
  },
  unlockedContainer: {
    marginTop: 40,
    overflow: 'hidden',
  },
  lockGradient: {
    width: 120,
    height: 120,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.3)',
    transform: [{ skewX: '-20deg' }],
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  revealTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  revealSubtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  statsContainer: {
    width: width - 48,
    borderRadius: 20,
    padding: 24,
    marginTop: 32,
    alignItems: 'center',
  },
  statsTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 50,
  },
  streakValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fireEmoji: {
    fontSize: 28,
    marginRight: 4,
  },
  perfectWeekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 8,
  },
  perfectWeekEmoji: {
    fontSize: 18,
  },
  perfectWeekText: {
    fontSize: 15,
    fontWeight: '700',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginTop: 32,
    gap: 10,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
