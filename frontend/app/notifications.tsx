import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../src/hooks/useTheme';
import { apiClient } from '../src/api/client';
import { Notification } from '../src/types';
import { FriendCardSkeleton } from '../src/components/Skeleton';
import { AnimatedPressable, FadeInView, StaggerItem } from '../src/components/Animations';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const response = await apiClient.get('/notifications');
      setNotifications(response.data);
      await apiClient.post('/notifications/read');
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, []);

  const getNotifConfig = (type: Notification['type']) => {
    switch (type) {
      case 'friend_request':
        return { icon: 'person-add' as const, gradient: ['#7C5CFC', '#A78BFA'] as [string, string], label: 'Demande' };
      case 'friend_accepted':
        return { icon: 'people' as const, gradient: ['#10B981', '#34D399'] as [string, string], label: 'Amis' };
      case 'like':
        return { icon: 'heart' as const, gradient: ['#FF3B5C', '#FF6B8A'] as [string, string], label: 'Like' };
      case 'comment':
        return { icon: 'chatbubble' as const, gradient: ['#3B82F6', '#60A5FA'] as [string, string], label: 'Commentaire' };
      case 'message':
        return { icon: 'mail' as const, gradient: ['#8B5CF6', '#A78BFA'] as [string, string], label: 'Message' };
      case 'reveal':
        return { icon: 'eye' as const, gradient: ['#F59E0B', '#FBBF24'] as [string, string], label: 'Revelation' };
      default:
        return { icon: 'notifications' as const, gradient: ['#6B7280', '#9CA3AF'] as [string, string], label: 'Notification' };
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    switch (notification.type) {
      case 'friend_request':
      case 'friend_accepted':
        router.push('/(tabs)/friends');
        break;
      case 'like':
      case 'comment':
        if (notification.related_id) {
          router.push(`/drop/${notification.related_id}`);
        }
        break;
      case 'message':
        if (notification.related_id) {
          router.push(`/chat/${notification.related_id}`);
        }
        break;
    }
  };

  const renderNotification = ({ item, index }: { item: Notification; index: number }) => {
    const timeAgo = formatDistanceToNow(new Date(item.created_at), {
      addSuffix: true,
      locale: fr,
    });
    const config = getNotifConfig(item.type);

    return (
      <StaggerItem index={index}>
        <AnimatedPressable
          style={[
            styles.notificationCard,
            { backgroundColor: item.read ? theme.card : theme.surfaceVariant },
            theme.elevation.sm,
          ]}
          onPress={() => handleNotificationPress(item)}
          scaleValue={0.98}
          haptic="light"
        >
          <LinearGradient
            colors={config.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconContainer}
          >
            <Ionicons name={config.icon} size={18} color="#FFFFFF" />
          </LinearGradient>

          <View style={styles.notificationContent}>
            <View style={styles.notifHeader}>
              <Text style={[styles.notificationTitle, { color: theme.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              {!item.read && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
            </View>
            <Text style={[styles.notificationMessage, { color: theme.textSecondary }]} numberOfLines={2}>
              {item.message}
            </Text>
            <Text style={[styles.timeAgo, { color: theme.textTertiary }]}>{timeAgo}</Text>
          </View>

          <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
        </AnimatedPressable>
      </StaggerItem>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.header}>
          <AnimatedPressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.surfaceVariant }]}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </AnimatedPressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Notifications</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.skeletonContainer}>
          <FriendCardSkeleton />
          <FriendCardSkeleton />
          <FriendCardSkeleton />
          <FriendCardSkeleton />
          <FriendCardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <AnimatedPressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: theme.surfaceVariant }]}
          scaleValue={0.9}
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </AnimatedPressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Notifications</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {unreadCount > 0 && (
        <FadeInView>
          <View style={[styles.unreadBanner, { backgroundColor: theme.primaryMuted }]}>
            <Ionicons name="notifications" size={16} color={theme.primary} />
            <Text style={[styles.unreadBannerText, { color: theme.primary }]}>
              {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''} notification{unreadCount > 1 ? 's' : ''}
            </Text>
          </View>
        </FadeInView>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <FadeInView delay={200}>
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.surfaceVariant }]}>
                <Ionicons name="notifications-outline" size={40} color={theme.textTertiary} />
              </View>
              <Text style={[styles.emptyText, { color: theme.text }]}>
                Aucune notification
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
                Les likes, commentaires et messages apparaitront ici
              </Text>
            </View>
          </FadeInView>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerPlaceholder: { width: 40 },
  skeletonContainer: { paddingHorizontal: 16, paddingTop: 8 },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  unreadBannerText: { fontSize: 14, fontWeight: '600' },
  listContent: { padding: 16, paddingBottom: 100 },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: { flex: 1, marginLeft: 12, marginRight: 8 },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notificationTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notificationMessage: { fontSize: 13, marginTop: 3, lineHeight: 18 },
  timeAgo: { fontSize: 11, marginTop: 4 },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: { fontSize: 18, fontWeight: '700' },
  emptySubtext: { fontSize: 14, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 },
});
