import React from 'react';
import { StyleSheet, Pressable, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

interface AnimatedPressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
  scaleValue?: number;
  disabled?: boolean;
  haptic?: 'light' | 'medium' | 'heavy' | 'none';
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  onPress,
  onLongPress,
  style,
  scaleValue = 0.97,
  disabled = false,
  haptic = 'light',
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web' && haptic !== 'none') {
      switch (haptic) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
      }
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(scaleValue, { damping: 15, stiffness: 400 });
    opacity.value = withTiming(0.9, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    opacity.value = withTiming(1, { duration: 100 });
  };

  const handlePress = () => {
    triggerHaptic();
    onPress?.();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onLongPress={onLongPress}
      disabled={disabled}
    >
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

// Animated Like Button with heart animation
interface LikeButtonProps {
  liked: boolean;
  onPress: () => void;
  size?: number;
  color?: string;
  likedColor?: string;
}

export const AnimatedLikeButton: React.FC<LikeButtonProps> = ({
  liked,
  onPress,
  size = 26,
  color = '#FAFAFA',
  likedColor = '#F472B6',
}) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const triggerAnimation = () => {
    scale.value = withSpring(1.3, { damping: 4, stiffness: 400 }, () => {
      scale.value = withSpring(1, { damping: 6, stiffness: 300 });
    });
    if (!liked) {
      rotation.value = withSpring(15, { damping: 8 }, () => {
        rotation.value = withSpring(-10, { damping: 8 }, () => {
          rotation.value = withSpring(0, { damping: 10 });
        });
      });
    }
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const Ionicons = require('@expo/vector-icons').Ionicons;

  return (
    <Pressable onPress={triggerAnimation}>
      <Animated.View style={animatedStyle}>
        <Ionicons
          name={liked ? 'heart' : 'heart-outline'}
          size={size}
          color={liked ? likedColor : color}
        />
      </Animated.View>
    </Pressable>
  );
};

// Fade In View
interface FadeInViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: ViewStyle;
}

export const FadeInView: React.FC<FadeInViewProps> = ({
  children,
  delay = 0,
  duration = 400,
  style,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  React.useEffect(() => {
    opacity.value = withTiming(1, { duration });
    translateY.value = withSpring(0, { damping: 15 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

// Stagger animation for lists
interface StaggerItemProps {
  children: React.ReactNode;
  index: number;
  style?: ViewStyle;
}

export const StaggerItem: React.FC<StaggerItemProps> = ({
  children,
  index,
  style,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);

  React.useEffect(() => {
    const delay = index * 80;
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
};
