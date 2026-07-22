import React from 'react';
import { StyleSheet, Pressable, ViewStyle, StyleProp } from 'react-native';
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
  style?: StyleProp<ViewStyle>;
  scaleValue?: number;
  disabled?: boolean;
  haptic?: 'light' | 'medium' | 'heavy' | 'none';
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  onPress,
  onLongPress,
  style,
  scaleValue = 0.99,
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
    scale.value = withTiming(scaleValue, { duration: 60 });
    opacity.value = withTiming(0.96, { duration: 60 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 60 });
    opacity.value = withTiming(1, { duration: 60 });
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
  style?: StyleProp<ViewStyle>;
}

export const FadeInView: React.FC<FadeInViewProps> = ({
  children,
  delay = 0,
  duration = 180,
  style,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(6);

  React.useEffect(() => {
    opacity.value = withTiming(1, { duration });
    translateY.value = withTiming(0, { duration });
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
  style?: StyleProp<ViewStyle>;
}

export const StaggerItem: React.FC<StaggerItemProps> = ({
  children,
  index,
  style,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: 180 });
    translateY.value = withTiming(0, { duration: 180 });
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
