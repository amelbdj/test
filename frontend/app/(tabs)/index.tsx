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
      <View style={[styles.dropCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.dropHeader}>
          <TouchableOpacity style={styles.userInfo}>
            <Avatar source={item.user_profile_picture} name={item.username} size={40} />
            <View style={styles.userTextContainer}>
              <Text style={[styles.username, { color: theme.text }]}>{item.username}</Text>
              <Text style={[styles.timeAgo, { color: theme.textTertiary }]}>{timeAgo}</Text>
            </View>
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
            <View style={[styles.blurredContainer, { backgroundColor: theme.surfaceVariant }]}>
              <View style={styles.blurredOverlay}>
                <Ionicons name="lock-closed" size={48} color={theme.primary} />
                <Text style={[styles.blurredText, { color: theme.text }]}>Révélation dans</Text>
                <Text style={[styles.countdownText, { color: theme.primary }]}>
                  {formatTimeUntilReveal()}
                </Text>
              </View>
            </View>
          )}
        </View>

        {item.is_revealed && (
          <>
            {item.description ? (
              <Text style={[styles.description, { color: theme.text }]}>{item.description}</Text>
            ) : null}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleLike(item.id)}
              >
                <Ionicons
                  name={item.liked_by_user ? 'heart' : 'heart-outline'}
                  size={24}
                  color={item.liked_by_user ? theme.error : theme.text}
                />
                <Text style={[styles.actionText, { color: theme.text }]}>
                  {item.likes_count}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push(`/drop/${item.id}`)}
              >
                <Ionicons name="chatbubble-outline" size={22} color={theme.text} />
                <Text style={[styles.actionText, { color: theme.text }]}>
                  {item.comments_count}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Chargement du feed..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Dropa</Text>
        <TouchableOpacity onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications-outline" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {revealStatus && !revealStatus.is_reveal_time && (
        <View style={[styles.revealBanner, { backgroundColor: theme.primary }]}>
          <Ionicons name="time-outline" size={20} color="#FFFFFF" />
          <Text style={styles.revealBannerText}>
            Prochaine révélation: Dimanche 20h ({formatTimeUntilReveal()})
          </Text>
        </View>
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={64} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  revealBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  revealBannerText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  dropCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  dropHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
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
    fontWeight: '600',
  },
  timeAgo: {
    fontSize: 12,
    marginTop: 2,
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
  blurredText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  countdownText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  description: {
    paddingHorizontal: 12,
    paddingTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    padding: 12,
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
