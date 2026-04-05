import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { apiClient } from '../../src/api/client';
import { Drop, RevealStatus } from '../../src/types';
import { Avatar } from '../../src/components/Avatar';
import { DropCardSkeleton } from '../../src/components/Skeleton';
import { BlurredDrop } from '../../src/components/BlurredDrop';
import { AnimatedPressable, AnimatedLikeButton, FadeInView, StaggerItem } from '../../src/components/Animations';
import { RevealAnimation } from '../../src/components/RevealAnimation';
import { usePushNotifications } from '../../src/hooks/usePushNotifications';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const { width } = Dimensions.get('window');

export default function FeedScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { notification } = usePushNotifications();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revealStatus, setRevealStatus] = useState<RevealStatus | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const fetchFeed = async () => {
    try {
      const [dropsRes, revealRes, notifsRes] = await Promise.all([
        apiClient.get('/drops/feed'),
        apiClient.get('/reveal/status'),
        apiClient.get('/notifications/unread-count'),
      ]);
      setDrops(dropsRes.data);
      setRevealStatus(revealRes.data);
      setUnreadNotifs(notifsRes.data.count || 0);
    } catch (error) {
      console.error('Error fetching feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFeed();
  }, []);

  const handleLike = async (dropId: string) => {
    try {
      await apiClient.post(`/drops/${dropId}/like`);
      setDrops((prev) =>
        prev.map((drop) =>
          drop.id === dropId
            ? {
                ...drop,
                liked_by_user: !drop.liked_by_user,
                likes_count: drop.liked_by_user
                  ? drop.likes_count - 1
                  : drop.likes_count + 1,
              }
            : drop
        )
      );
    } catch (error) {
      console.error('Error liking drop:', error);
    }
  };

  const formatTimeUntilReveal = () => {
    if (!revealStatus) return '';
    const seconds = revealStatus.seconds_until_reveal;
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}j ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const renderDrop = ({ item, index }: { item: Drop; index: number }) => {
    const timeAgo = formatDistanceToNow(new Date(item.created_at), {
      addSuffix: true,
      locale: fr,
    });

    // Resolve image URI: prefer media_url (ImageKit), fallback to base64
    const mediaUrl = item.media_url;
    const imageUri = mediaUrl
      ? mediaUrl
      : item.media_data
        ? item.media_data.startsWith('data:')
          ? item.media_data
          : `data:image/jpeg;base64,${item.media_data}`
        : undefined;

    const isVideo = item.media_type === 'video';

    return (
      <StaggerItem index={index}>
        <View style={[styles.dropCard, { backgroundColor: theme.card }]}>
          <View style={styles.dropHeader}>
            <AnimatedPressable style={styles.userInfo} haptic="light">
              <Avatar source={item.user_profile_picture} name={item.username} size={44} />
              <View style={styles.userTextContainer}>
                <Text style={[styles.username, { color: theme.text }]}>{item.username}</Text>
                <Text style={[styles.timeAgo, { color: theme.textTertiary }]}>{timeAgo}</Text>
              </View>
            </AnimatedPressable>
            <AnimatedPressable
              style={[styles.moreButton, { backgroundColor: theme.surfaceVariant }]}
              scaleValue={0.9}
              haptic="light"
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={theme.textSecondary} />
            </AnimatedPressable>
          </View>

          <View style={styles.mediaContainer}>
            {item.is_revealed ? (
              isVideo && imageUri ? (
                <Video
                  source={{ uri: imageUri }}
                  style={styles.media}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={false}
                  isLooping
                  useNativeControls
                />
              ) : imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.media}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.mediaPlaceholder, { backgroundColor: theme.surfaceVariant }]}>
                  <Ionicons name="image" size={48} color={theme.textTertiary} />
                </View>
              )
            ) : (
              <BlurredDrop
                imageUri={imageUri}
                timeUntilReveal={formatTimeUntilReveal()}
              />
            )}
            {isVideo && item.is_revealed && (
              <View style={styles.videoIndicator}>
                <Ionicons name="videocam" size={14} color="#FFF" />
              </View>
            )}
          </View>

          {item.is_revealed && (
            <>
              <View style={styles.actions}>
                <View style={styles.actionButton}>
                  <AnimatedLikeButton
                    liked={item.liked_by_user}
                    onPress={() => handleLike(item.id)}
                    color={theme.text}
                    likedColor={theme.like}
                  />
                  <Text style={[styles.actionText, { color: theme.text }]}>
                    {item.likes_count}
                  </Text>
                </View>

                <AnimatedPressable
                  style={styles.actionButton}
                  onPress={() => router.push(`/drop/${item.id}`)}
                  haptic="light"
                >
                  <Ionicons name="chatbubble-outline" size={24} color={theme.text} />
                  <Text style={[styles.actionText, { color: theme.text }]}>
                    {item.comments_count}
                  </Text>
                </AnimatedPressable>

                <AnimatedPressable style={styles.actionButton} haptic="light">
                  <Ionicons name="paper-plane-outline" size={24} color={theme.text} />
                </AnimatedPressable>
              </View>

              {item.description ? (
                <View style={styles.descriptionContainer}>
                  <Text style={[styles.descriptionUsername, { color: theme.text }]}>
                    {item.username}
                  </Text>
                  <Text style={[styles.description, { color: theme.textSecondary }]}>
                    {item.description}
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </View>
      </StaggerItem>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Dropa</Text>
        </View>
        <View style={styles.listContent}>
          <DropCardSkeleton />
          <DropCardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <FadeInView>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Dropa</Text>
          <View style={styles.headerRight}>
            <AnimatedPressable 
              style={[styles.iconButton, { backgroundColor: theme.surfaceVariant }]}
              onPress={() => router.push('/messages')}
              scaleValue={0.9}
            >
              <Ionicons name="chatbubbles-outline" size={22} color={theme.text} />
            </AnimatedPressable>
            <AnimatedPressable 
              style={[styles.iconButton, { backgroundColor: theme.surfaceVariant }]}
              onPress={() => router.push('/notifications')}
              scaleValue={0.9}
            >
              <Ionicons name="notifications-outline" size={22} color={theme.text} />
              {unreadNotifs > 0 && (
                <View style={[styles.notifBadge, { backgroundColor: theme.like || '#FF3B5C' }]}>
                  <Text style={styles.notifBadgeText}>
                    {unreadNotifs > 9 ? '9+' : unreadNotifs}
                  </Text>
                </View>
              )}
            </AnimatedPressable>
          </View>
        </View>
      </FadeInView>

      {revealStatus && !revealStatus.is_reveal_time && (
        <FadeInView delay={100}>
          <AnimatedPressable scaleValue={0.98}>
            <LinearGradient
              colors={[theme.gradientStart, theme.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.revealBanner}
            >
              <Ionicons name="time-outline" size={18} color="#FFFFFF" />
              <Text style={styles.revealBannerText}>
                Prochaine revelation: Dimanche 20h
              </Text>
              <View style={styles.countdownBadge}>
                <Text style={styles.countdownBadgeText}>{formatTimeUntilReveal()}</Text>
              </View>
            </LinearGradient>
          </AnimatedPressable>
        </FadeInView>
      )}

      <FadeInView delay={150}>
        <AnimatedPressable
          style={[styles.weeklySummaryButton, { backgroundColor: theme.card }]}
          onPress={() => router.push('/weekly-summary')}
          scaleValue={0.98}
          haptic="light"
        >
          <View style={styles.weeklySummaryIcon}>
            <Text style={{ fontSize: 20 }}>📊</Text>
          </View>
          <View style={styles.weeklySummaryTextContainer}>
            <Text style={[styles.weeklySummaryTitle, { color: theme.text }]}>Resume Hebdo</Text>
            <Text style={[styles.weeklySummarySubtitle, { color: theme.textTertiary }]}>Voir vos stats de la semaine</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
        </AnimatedPressable>
      </FadeInView>

      <FlatList
        data={drops}
        keyExtractor={(item) => item.id}
        renderItem={renderDrop}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <FadeInView delay={200}>
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: theme.primaryMuted }]}>
                <Ionicons name="images-outline" size={48} color={theme.primary} />
              </View>
              <Text style={[styles.emptyText, { color: theme.text }]}>
                Aucun Drop pour le moment
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
                Ajoutez des amis ou créez votre premier Drop !
              </Text>
            </View>
          </FadeInView>
        }
      />

      <RevealAnimation
        visible={showReveal}
        onComplete={() => {
          setShowReveal(false);
          fetchFeed();
        }}
        weekStats={{
          dropsCount: drops.filter(d => !d.is_revealed).length || 0,
          streak: 0,
          isPerfectWeek: false,
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  revealBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 14,
    gap: 8,
  },
  revealBannerText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  countdownBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countdownBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  dropCard: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  dropHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userTextContainer: {
    marginLeft: 12,
  },
  username: {
    fontSize: 15,
    fontWeight: '700',
  },
  timeAgo: {
    fontSize: 13,
    marginTop: 2,
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaContainer: {
    width: '100%',
    aspectRatio: 1,
  },
  media: {
    width: '100%',
    height: '100%',
  },
  mediaPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurredContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 12,
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  descriptionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  descriptionUsername: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtext: {
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
  },
  videoIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  weeklySummaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    gap: 12,
  },
  weeklySummaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weeklySummaryTextContainer: { flex: 1 },
  weeklySummaryTitle: { fontSize: 15, fontWeight: '600' },
  weeklySummarySubtitle: { fontSize: 12, marginTop: 1 },
});
