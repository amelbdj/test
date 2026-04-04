import React from 'react';
import { StyleSheet, View, Image, Dimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native';
import { useTheme } from '../hooks/useTheme';

const { width } = Dimensions.get('window');

interface BlurredDropProps {
  imageUri?: string;
  timeUntilReveal: string;
  onReveal?: () => void;
  isRevealing?: boolean;
}

export const BlurredDrop: React.FC<BlurredDropProps> = ({
  imageUri,
  timeUntilReveal,
  isRevealing = false,
}) => {
  const theme = useTheme();
  const blurIntensity = useSharedValue(80);
  const overlayOpacity = useSharedValue(1);
  const iconScale = useSharedValue(1);

  React.useEffect(() => {
    if (isRevealing) {
      blurIntensity.value = withTiming(0, { duration: 1500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
      overlayOpacity.value = withTiming(0, { duration: 1000 });
      iconScale.value = withSpring(0, { damping: 12 });
    }
  }, [isRevealing]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <View style={styles.container}>
      {imageUri ? (
        <>
          <Image
            source={{ uri: imageUri }}
            style={[
              styles.image,
              Platform.OS === 'web' && { filter: 'blur(20px)', transform: [{ scale: 1.1 }] } as any,
            ]}
            blurRadius={Platform.OS === 'android' ? 25 : Platform.OS === 'ios' ? 0 : 0}
          />
          {Platform.OS === 'ios' && (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          )}
          {Platform.OS === 'web' && (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />
          )}
        </>
      ) : (
        <LinearGradient
          colors={[theme.surfaceVariant, theme.surface]}
          style={styles.placeholder}
        />
      )}

      {/* Overlay with lock */}
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.gradient}
        />
        <Animated.View style={[styles.lockContainer, iconStyle]}>
          <View style={[styles.lockIconBg, { backgroundColor: theme.primaryMuted }]}>
            <Ionicons name="lock-closed" size={32} color={theme.primary} />
          </View>
          <Text style={[styles.revealText, { color: theme.text }]}>Révélation dans</Text>
          <Text style={[styles.countdown, { color: theme.primary }]}>{timeUntilReveal}</Text>
        </Animated.View>
      </Animated.View>

      {/* Animated particles/shimmer effect */}
      <View style={styles.shimmerContainer}>
        {[...Array(5)].map((_, i) => (
          <ShimmerParticle key={i} delay={i * 200} theme={theme} />
        ))}
      </View>
    </View>
  );
};

const ShimmerParticle: React.FC<{ delay: number; theme: any }> = ({ delay, theme }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(Math.random() * width);

  React.useEffect(() => {
    const animate = () => {
      opacity.value = withTiming(0.6, { duration: 1000 }, () => {
        opacity.value = withTiming(0, { duration: 1000 });
      });
      translateY.value = withTiming(-100, { duration: 2000 }, () => {
        translateY.value = 0;
      });
    };
    
    const timeout = setTimeout(animate, delay);
    const interval = setInterval(animate, 3000);
    
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [delay]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[styles.particle, style, { backgroundColor: theme.primary }]} />
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  lockContainer: {
    alignItems: 'center',
  },
  lockIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  revealText: {
    fontSize: 16,
    fontWeight: '500',
  },
  countdown: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  shimmerContainer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    bottom: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
