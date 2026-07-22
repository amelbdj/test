import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Alert,
  Keyboard,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { useTheme } from '../../src/hooks/useTheme';
import { apiClient } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { Drop, Comment } from '../../src/types';
import { Avatar } from '../../src/components/Avatar';
import { DropCardSkeleton } from '../../src/components/Skeleton';
import { AnimatedPressable, AnimatedLikeButton, FadeInView, StaggerItem } from '../../src/components/Animations';
import { resolveMediaUri } from '../../src/utils/media';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const { width } = Dimensions.get('window');

export default function DropDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id: dropId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [drop, setDrop] = useState<Drop | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<FlatList>(null);

  const fetchData = async () => {
    if (!dropId) return;
    try {
      const [feedRes, commentsRes] = await Promise.all([
        apiClient.get('/drops/feed'),
        apiClient.get(`/drops/${dropId}/comments`),
      ]);
      const foundDrop = feedRes.data.find((d: Drop) => d.id === dropId);
      setDrop(foundDrop || null);
      setComments(commentsRes.data);
    } catch (error) {
      console.error('Error fetching drop:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dropId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [dropId]);

  const handleLike = async () => {
    if (!drop) return;
    try {
      await apiClient.post(`/drops/${dropId}/like`);
      setDrop((prev) =>
        prev
          ? {
              ...prev,
              liked_by_user: !prev.liked_by_user,
              likes_count: prev.liked_by_user ? prev.likes_count - 1 : prev.likes_count + 1,
            }
          : null
      );
    } catch (error) {
      console.error('Error liking drop:', error);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || sending) return;

    setSending(true);
    try {
      const response = await apiClient.post(`/drops/${dropId}/comments`, {
        content: newComment.trim(),
      });
      setComments((prev) => [response.data, ...prev]);
      setNewComment('');
      Keyboard.dismiss();
      if (drop) {
        setDrop({ ...drop, comments_count: drop.comments_count + 1 });
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || "Impossible d'envoyer le commentaire");
    } finally {
      setSending(false);
    }
  };

  const imageUri = resolveMediaUri(drop?.media_url, drop?.media_data);
  const isVideo = drop?.media_type === 'video';

  const renderHeader = () => {
    if (!drop) return null;

    const timeAgo = formatDistanceToNow(new Date(drop.created_at), {
      addSuffix: true,
      locale: fr,
    });

    return (
      <View>
        <FadeInView>
          <View style={[styles.dropCard, { backgroundColor: theme.card }, theme.elevation.md]}>
            <View style={styles.dropHeader}>
              <AnimatedPressable style={styles.userInfo} haptic="light">
                <Avatar source={drop.user_profile_picture} name={drop.username} size={44} />
                <View style={styles.userTextContainer}>
                  <Text style={[styles.username, { color: theme.text }]}>{drop.username}</Text>
                  <Text style={[styles.timeAgo, { color: theme.textTertiary }]}>{timeAgo}</Text>
                </View>
              </AnimatedPressable>
            </View>

            {drop.is_revealed && imageUri ? (
              isVideo ? (
                <Video
                  source={{ uri: imageUri }}
                  style={styles.media}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={false}
                  isLooping
                  useNativeControls
                />
              ) : (
                <Image source={{ uri: imageUri }} style={styles.media} resizeMode="cover" />
              )
            ) : (
              <View style={[styles.lockedContainer, { backgroundColor: theme.surfaceVariant }]}>
                <View style={[styles.lockIcon, { backgroundColor: theme.primaryMuted }]}>
                  <Ionicons name="lock-closed" size={32} color={theme.primary} />
                </View>
                <Text style={[styles.lockedText, { color: theme.text }]}>
                  Ce Drop n&apos;est pas encore revele
                </Text>
              </View>
            )}

            {drop.is_revealed && (
              <>
                <View style={styles.actions}>
                  <View style={styles.actionsLeft}>
                    <View style={styles.actionItem}>
                      <AnimatedLikeButton
                        liked={drop.liked_by_user}
                        onPress={handleLike}
                        color={theme.text}
                        likedColor={theme.like || '#FF3B5C'}
                        size={28}
                      />
                      <Text style={[styles.actionCount, { color: theme.text }]}>
                        {drop.likes_count}
                      </Text>
                    </View>

                    <AnimatedPressable
                      style={styles.actionItem}
                      onPress={() => inputRef.current?.focus()}
                      haptic="light"
                    >
                      <Ionicons name="chatbubble-outline" size={24} color={theme.text} />
                      <Text style={[styles.actionCount, { color: theme.text }]}>
                        {drop.comments_count}
                      </Text>
                    </AnimatedPressable>

                    <AnimatedPressable style={styles.actionItem} haptic="light">
                      <Ionicons name="paper-plane-outline" size={24} color={theme.text} />
                    </AnimatedPressable>
                  </View>

                  <AnimatedPressable haptic="light">
                    <Ionicons name="bookmark-outline" size={24} color={theme.text} />
                  </AnimatedPressable>
                </View>

                {drop.likes_count > 0 && (
                  <Text style={[styles.likesText, { color: theme.text }]}>
                    {drop.likes_count} {drop.likes_count === 1 ? 'like' : 'likes'}
                  </Text>
                )}

                {drop.description ? (
                  <View style={styles.descriptionContainer}>
                    <Text style={[styles.descriptionUsername, { color: theme.text }]}>
                      {drop.username}
                    </Text>
                    <Text style={[styles.description, { color: theme.textSecondary }]}>
                      {' '}{drop.description}
                    </Text>
                  </View>
                ) : null}
              </>
            )}
          </View>
        </FadeInView>

        {drop.is_revealed && (
          <FadeInView delay={150}>
            <View style={styles.commentsSectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Commentaires ({comments.length})
              </Text>
            </View>
          </FadeInView>
        )}
      </View>
    );
  };

  const renderComment = ({ item, index }: { item: Comment; index: number }) => {
    const timeAgo = formatDistanceToNow(new Date(item.created_at), {
      addSuffix: true,
      locale: fr,
    });
    const isOwn = item.user_id === user?.id;

    return (
      <StaggerItem index={index}>
        <View style={[styles.commentCard, { backgroundColor: isOwn ? theme.primaryMuted : theme.card }]}>
          <Avatar source={item.user_profile_picture} name={item.username} size={36} />
          <View style={styles.commentContent}>
            <View style={styles.commentHeader}>
              <Text style={[styles.commentUsername, { color: theme.text }]}>{item.username}</Text>
              <Text style={[styles.commentTime, { color: theme.textTertiary }]}>{timeAgo}</Text>
            </View>
            <Text style={[styles.commentText, { color: theme.text }]}>{item.content}</Text>
          </View>
        </View>
      </StaggerItem>
    );
  };

  const renderEmpty = () => (
    <FadeInView delay={200}>
      <View style={styles.emptyComments}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.surfaceVariant }]}>
          <Ionicons name="chatbubble-outline" size={28} color={theme.textTertiary} />
        </View>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          Aucun commentaire
        </Text>
        <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
          Soyez le premier a commenter !
        </Text>
      </View>
    </FadeInView>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.header}>
          <AnimatedPressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.surfaceVariant }]}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </AnimatedPressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Drop</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <DropCardSkeleton />
      </SafeAreaView>
    );
  }

  if (!drop) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.header}>
          <AnimatedPressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.surfaceVariant }]}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </AnimatedPressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Drop</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.textTertiary} />
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>Drop introuvable</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Drop</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={scrollRef}
          data={drop.is_revealed ? comments : []}
          keyExtractor={(item) => item.id}
          renderItem={renderComment}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={drop.is_revealed ? renderEmpty : null}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          showsVerticalScrollIndicator={false}
        />

        {drop.is_revealed && (
          <FadeInView delay={300}>
            <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
              <Avatar source={user?.profile_picture ?? null} name={user?.username || ''} size={32} />
              <TextInput
                ref={inputRef}
                style={[styles.input, { backgroundColor: theme.surfaceVariant, color: theme.text }]}
                placeholder="Ajouter un commentaire..."
                placeholderTextColor={theme.textTertiary}
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={300}
              />
              <AnimatedPressable
                style={[
                  styles.sendButton,
                  { backgroundColor: newComment.trim() ? theme.primary : theme.surfaceVariant },
                ]}
                onPress={handleSendComment}
                disabled={!newComment.trim() || sending}
                haptic="medium"
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={newComment.trim() ? '#FFFFFF' : theme.textTertiary}
                />
              </AnimatedPressable>
            </View>
          </FadeInView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
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
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerPlaceholder: { width: 40 },
  listContent: { paddingBottom: 16 },
  dropCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  dropHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  userTextContainer: { marginLeft: 12 },
  username: { fontSize: 15, fontWeight: '700' },
  timeAgo: { fontSize: 12, marginTop: 2 },
  media: { width: '100%', aspectRatio: 1 },
  lockedContainer: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  lockedText: { fontSize: 16, fontWeight: '500' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionsLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { fontSize: 14, fontWeight: '600' },
  likesText: {
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '700',
    paddingBottom: 4,
  },
  descriptionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  descriptionUsername: { fontSize: 14, fontWeight: '700' },
  description: { fontSize: 14, lineHeight: 20 },
  commentsSectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  commentCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 16,
  },
  commentContent: { flex: 1, marginLeft: 10 },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentUsername: { fontSize: 14, fontWeight: '700' },
  commentTime: { fontSize: 11 },
  commentText: { fontSize: 14, marginTop: 4, lineHeight: 19 },
  emptyComments: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 32,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptySubtext: { fontSize: 13, marginTop: 4 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 80,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: { fontSize: 16, fontWeight: '500' },
});
