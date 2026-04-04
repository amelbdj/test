import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';

const { width } = Dimensions.get('window');

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width: w = '100%',
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const theme = useTheme();
  const opacity = useSharedValue(0.3);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: w as any,
          height,
          borderRadius,
          backgroundColor: theme.surfaceVariant,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

export const DropCardSkeleton: React.FC = () => {
  const theme = useTheme();

  return (
    <View style={[styles.dropCard, { backgroundColor: theme.card }]}>
      <View style={styles.header}>
        <Skeleton width={44} height={44} borderRadius={22} />
        <View style={styles.headerText}>
          <Skeleton width={120} height={16} borderRadius={8} />
          <Skeleton width={80} height={12} borderRadius={6} style={{ marginTop: 6 }} />
        </View>
      </View>
      <Skeleton width="100%" height={width - 40} borderRadius={0} />
      <View style={styles.actions}>
        <Skeleton width={60} height={24} borderRadius={12} />
        <Skeleton width={60} height={24} borderRadius={12} />
      </View>
    </View>
  );
};

export const FriendCardSkeleton: React.FC = () => {
  const theme = useTheme();

  return (
    <View style={[styles.friendCard, { backgroundColor: theme.card }]}>
      <Skeleton width={52} height={52} borderRadius={26} />
      <View style={styles.friendInfo}>
        <Skeleton width={140} height={18} borderRadius={9} />
      </View>
      <Skeleton width={70} height={28} borderRadius={14} />
    </View>
  );
};

export const ProfileSkeleton: React.FC = () => {
  const theme = useTheme();

  return (
    <View style={styles.profileContainer}>
      <Skeleton width={100} height={100} borderRadius={50} />
      <Skeleton width={150} height={24} borderRadius={12} style={{ marginTop: 16 }} />
      <Skeleton width={200} height={16} borderRadius={8} style={{ marginTop: 8 }} />
      <View style={[styles.statsRow, { backgroundColor: theme.card }]}>
        <Skeleton width={60} height={40} borderRadius={8} />
        <Skeleton width={60} height={40} borderRadius={8} />
        <Skeleton width={60} height={40} borderRadius={8} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dropCard: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  headerText: {
    marginLeft: 12,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 20,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileContainer: {
    alignItems: 'center',
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 24,
    padding: 20,
    borderRadius: 16,
    width: '100%',
    justifyContent: 'space-around',
  },
});
