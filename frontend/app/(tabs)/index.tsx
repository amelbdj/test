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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { apiClient } from '../../src/api/client';
import { Drop, RevealStatus } from '../../src/types';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { Avatar } from '../../src/components/Avatar';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const { width } = Dimensions.get('window');

export default function FeedScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revealStatus, setRevealStatus] = useState<RevealStatus | null>(null);

  const fetchFeed = async () => {
    try {
      const [dropsRes, revealRes] = await Promise.all([
        apiClient.get('/drops/feed'),
        apiClient.get('/reveal/status'),
      ]);
      setDrops(dropsRes.data);
      setRevealStatus(revealRes.data);
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

  const renderDrop = ({ item }: { item: Drop }) => {
    const timeAgo = formatDistanceToNow(new Date(item.created_at), {
      addSuffix: true,
      locale: fr,
    });

    return (
      <View style={[styles.dropCard, { backgroundColor: theme.card }]}>
        <View style={styles.dropHeader}>
          <TouchableOpacity style={styles.userInfo}>
            <Avatar source={item.user_profile_picture} name={item.username} size={44} />
            <View style={styles.userTextContainer}>
              <Text style={[styles.username, { color: theme.text }]}>{item.username}</Text>
              <Text style={[styles.timeAgo, { color: theme.textTertiary }]}>{timeAgo}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.moreButton, { backgroundColor: theme.surfaceVariant }]}>
            <Ionicons name="ellipsis-horizontal" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.mediaContainer}>
          {item.is_revealed ? (
            item.media_data ? (
              <Image
                source={{ uri: item.media_data.startsWith('data:') ? item.media_data : `data:image/jpeg;base64,${item.media_data}` }}
                style={styles.media}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.mediaPlaceholder, { backgroundColor: theme.surfaceVariant }]}>
                <Ionicons name="image" size={48} color={theme.textTertiary} />
              </View>
            )
          ) : (
            <LinearGradient
              colors={[theme.surfaceVariant, theme.surface]}
              style={styles.blurredContainer}
            >
              <View style={styles.blurredOverlay}>
                <View style={[styles.lockIconContainer, { backgroundColor: theme.primaryMuted }]}>
                  <Ionicons name="lock-closed" size={32} color={theme.primary} />
                </View>
                <Text style={[styles.blurredText, { color: theme.text }]}>Révélation dans</Text>
                <Text style={[styles.countdownText, { color: theme.primary }]}>
                  {formatTimeUntilReveal()}
                </Text>
              </View>
            </LinearGradient>
          )}
        </View>

        {item.is_revealed && (
          <>
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleLike(item.id)}
              >
                <Ionicons
                  name={item.liked_by_user ? 'heart' : 'heart-outline'}
                  size={26}
                  color={item.liked_by_user ? theme.like : theme.text}
                />
                <Text style={[styles.actionText, { color: theme.text }]}>
                  {item.likes_count}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push(`/drop/${item.id}`)}
              >
                <Ionicons name="chatbubble-outline" size={24} color={theme.text} />
                <Text style={[styles.actionText, { color: theme.text }]}>
                  {item.comments_count}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="paper-plane-outline" size={24} color={theme.text} />
              </TouchableOpacity>
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
    );
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Chargement du feed..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Dropa</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={[styles.iconButton, { backgroundColor: theme.surfaceVariant }]}
            onPress={() => router.push('/messages')}
          >
            <Ionicons name="chatbubbles-outline" size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.iconButton, { backgroundColor: theme.surfaceVariant }]}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {revealStatus && !revealStatus.is_reveal_time && (
        <LinearGradient
          colors={[theme.gradientStart, theme.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.revealBanner}
        >
          <Ionicons name="time-outline" size={18} color="#FFFFFF" />
          <Text style={styles.revealBannerText}>
            Prochaine révélation: Dimanche 20h
          </Text>
          <View style={styles.countdownBadge}>
            <Text style={styles.countdownBadgeText}>{formatTimeUntilReveal()}</Text>
          </View>
        </LinearGradient>
      )}

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
        }
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
  blurredOverlay: {
    alignItems: 'center',
  },
  lockIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  blurredText: {
    fontSize: 16,
    fontWeight: '500',
  },
  countdownText: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
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
});
