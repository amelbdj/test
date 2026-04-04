import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { apiClient } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { Drop, Comment } from '../../src/types';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { Avatar } from '../../src/components/Avatar';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

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
              likes_count: prev.liked_by_user
                ? prev.likes_count - 1
                : prev.likes_count + 1,
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
      if (drop) {
        setDrop({ ...drop, comments_count: drop.comments_count + 1 });
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Impossible d\'envoyer le commentaire');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!drop) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Drop</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>Drop introuvable</Text>
        </View>
      </SafeAreaView>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(drop.created_at), {
    addSuffix: true,
    locale: fr,
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Drop</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
        >
          <View style={[styles.dropCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.dropHeader}>
              <Avatar source={drop.user_profile_picture} name={drop.username} size={40} />
              <View style={styles.userTextContainer}>
                <Text style={[styles.username, { color: theme.text }]}>{drop.username}</Text>
                <Text style={[styles.timeAgo, { color: theme.textTertiary }]}>{timeAgo}</Text>
              </View>
            </View>

            {drop.is_revealed && drop.media_data ? (
              <Image
                source={{ uri: drop.media_data.startsWith('data:') ? drop.media_data : `data:image/jpeg;base64,${drop.media_data}` }}
                style={styles.media}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.lockedContainer, { backgroundColor: theme.surfaceVariant }]}>
                <Ionicons name="lock-closed" size={48} color={theme.primary} />
                <Text style={[styles.lockedText, { color: theme.text }]}>
                  Ce Drop n'est pas encore révélé
                </Text>
              </View>
            )}

            {drop.is_revealed && drop.description ? (
              <Text style={[styles.description, { color: theme.text }]}>{drop.description}</Text>
            ) : null}

            {drop.is_revealed && (
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                  <Ionicons
                    name={drop.liked_by_user ? 'heart' : 'heart-outline'}
                    size={24}
                    color={drop.liked_by_user ? theme.error : theme.text}
                  />
                  <Text style={[styles.actionText, { color: theme.text }]}>
                    {drop.likes_count}
                  </Text>
                </TouchableOpacity>

                <View style={styles.actionButton}>
                  <Ionicons name="chatbubble-outline" size={22} color={theme.text} />
                  <Text style={[styles.actionText, { color: theme.text }]}>
                    {drop.comments_count}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {drop.is_revealed && (
            <View style={styles.commentsSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Commentaires</Text>

              {comments.length === 0 ? (
                <Text style={[styles.noComments, { color: theme.textSecondary }]}>
                  Aucun commentaire. Soyez le premier !
                </Text>
              ) : (
                comments.map((comment) => (
                  <View
                    key={comment.id}
                    style={[styles.commentCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                  >
                    <Avatar source={comment.user_profile_picture} name={comment.username} size={36} />
                    <View style={styles.commentContent}>
                      <Text style={[styles.commentUsername, { color: theme.text }]}>
                        {comment.username}
                      </Text>
                      <Text style={[styles.commentText, { color: theme.text }]}>
                        {comment.content}
                      </Text>
                      <Text style={[styles.commentTime, { color: theme.textTertiary }]}>
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>

        {drop.is_revealed && (
          <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surfaceVariant, color: theme.text }]}
              placeholder="Ajouter un commentaire..."
              placeholderTextColor={theme.textTertiary}
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={300}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: newComment.trim() ? theme.primary : theme.surfaceVariant },
              ]}
              onPress={handleSendComment}
              disabled={!newComment.trim() || sending}
            >
              <Ionicons
                name="send"
                size={18}
                color={newComment.trim() ? '#FFFFFF' : theme.textTertiary}
              />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  dropCard: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  dropHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
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
  media: {
    width: '100%',
    aspectRatio: 1,
  },
  lockedContainer: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
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
  commentsSection: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  noComments: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  commentCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  commentContent: {
    flex: 1,
    marginLeft: 10,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
  },
  commentText: {
    fontSize: 14,
    marginTop: 2,
    lineHeight: 18,
  },
  commentTime: {
    fontSize: 11,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
  },
});
