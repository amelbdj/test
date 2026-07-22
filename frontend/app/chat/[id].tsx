import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/hooks/useTheme';
import { apiClient } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { Message, Conversation } from '../../src/types';
import { Avatar } from '../../src/components/Avatar';
import { AnimatedPressable, FadeInView } from '../../src/components/Animations';
import { FriendCardSkeleton } from '../../src/components/Skeleton';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';

const { width } = Dimensions.get('window');

export default function ChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const response = await apiClient.get(`/conversations/${conversationId}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const fetchConversation = async () => {
    try {
      const response = await apiClient.get('/conversations');
      const conv = response.data.find((c: Conversation) => c.id === conversationId);
      setConversation(conv);
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  useEffect(() => {
    fetchConversation();
    fetchMessages();
    pollingRef.current = setInterval(fetchMessages, 5000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [conversationId, fetchMessages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const response = await apiClient.post(`/conversations/${conversationId}/messages`, {
        content: newMessage.trim(),
      });
      setMessages((prev) => [...prev, response.data]);
      setNewMessage('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const other = useMemo(() => {
    if (!conversation || !user) return { username: '', picture: null };
    const index = conversation.participants.findIndex((p) => p !== user.id);
    return {
      username: conversation.participant_usernames[index] || '',
      picture: conversation.participant_pictures[index] || null,
    };
  }, [conversation, user]);

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Hier ' + format(date, 'HH:mm');
    return format(date, 'dd/MM HH:mm');
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.sender_id === user?.id;
    const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.sender_id !== item.sender_id);
    const isLast = index === messages.length - 1 || messages[index + 1]?.sender_id !== item.sender_id;

    return (
      <View style={[styles.messageRow, isOwn && styles.ownMessageRow]}>
        {!isOwn && (
          <View style={styles.avatarSlot}>
            {showAvatar ? (
              <Avatar source={other.picture} name={other.username} size={28} />
            ) : null}
          </View>
        )}

        <View style={[styles.messageGroup, isOwn && styles.ownMessageGroup]}>
          {isOwn ? (
            <LinearGradient
              colors={[theme.gradientStart, theme.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.messageBubble,
                styles.ownBubble,
                !isLast && styles.messageBubbleGrouped,
              ]}
            >
              <Text style={styles.ownMessageText}>{item.content}</Text>
            </LinearGradient>
          ) : (
            <View
              style={[
                styles.messageBubble,
                { backgroundColor: theme.surfaceVariant },
                !isLast && styles.messageBubbleGrouped,
              ]}
            >
              <Text style={[styles.messageText, { color: theme.text }]}>{item.content}</Text>
            </View>
          )}

          {isLast && (
            <View style={[styles.timeRow, isOwn && styles.ownTimeRow]}>
              <Text style={[styles.messageTime, { color: theme.textTertiary }]}>
                {formatMessageTime(item.created_at)}
              </Text>
              {isOwn && (
                <Ionicons
                  name={item.read ? 'checkmark-done' : 'checkmark'}
                  size={14}
                  color={item.read ? theme.primary : theme.textTertiary}
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <AnimatedPressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.surfaceVariant }]}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </AnimatedPressable>
          <View style={styles.headerInfo}>
            <View style={[styles.skeletonAvatar, { backgroundColor: theme.surfaceVariant }]} />
            <View style={[styles.skeletonName, { backgroundColor: theme.surfaceVariant }]} />
          </View>
        </View>
        <View style={styles.skeletonMessages}>
          <FriendCardSkeleton />
          <FriendCardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <AnimatedPressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: theme.surfaceVariant }]}
          scaleValue={0.9}
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </AnimatedPressable>
        <AnimatedPressable style={styles.headerInfo} haptic="light">
          <Avatar source={other.picture} name={other.username} size={36} />
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerName, { color: theme.text }]}>{other.username}</Text>
            <View style={styles.onlineIndicator}>
              <View style={[styles.onlineDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.onlineText, { color: theme.textTertiary }]}>En ligne</Text>
            </View>
          </View>
        </AnimatedPressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <FadeInView delay={200}>
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIcon, { backgroundColor: theme.surfaceVariant }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={32} color={theme.textTertiary} />
                </View>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Commencez la conversation !
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
                  Envoyez un premier message
                </Text>
              </View>
            </FadeInView>
          }
        />

        <FadeInView delay={100}>
          <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surfaceVariant, color: theme.text }]}
              placeholder="Ecrire un message..."
              placeholderTextColor={theme.textTertiary}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
            />
            <AnimatedPressable
              style={[
                styles.sendButton,
                newMessage.trim()
                  ? {}
                  : { backgroundColor: theme.surfaceVariant },
              ]}
              onPress={handleSend}
              disabled={!newMessage.trim() || sending}
              haptic="medium"
            >
              {newMessage.trim() ? (
                <LinearGradient
                  colors={[theme.gradientStart, theme.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sendGradient}
                >
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                </LinearGradient>
              ) : (
                <Ionicons name="send" size={18} color={theme.textTertiary} />
              )}
            </AnimatedPressable>
          </View>
        </FadeInView>
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerTextContainer: {},
  headerName: { fontSize: 16, fontWeight: '700' },
  onlineIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  onlineText: { fontSize: 12 },
  skeletonAvatar: { width: 36, height: 36, borderRadius: 18 },
  skeletonName: { width: 100, height: 16, borderRadius: 8 },
  skeletonMessages: { padding: 16, gap: 12 },
  messagesList: { padding: 16, paddingBottom: 8 },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  ownMessageRow: {
    justifyContent: 'flex-end',
  },
  avatarSlot: {
    width: 32,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  messageGroup: {
    maxWidth: '75%',
    alignItems: 'flex-start',
  },
  ownMessageGroup: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  ownBubble: {},
  messageBubbleGrouped: {
    marginBottom: 0,
  },
  messageText: { fontSize: 15, lineHeight: 21 },
  ownMessageText: { fontSize: 15, lineHeight: 21, color: '#FFFFFF' },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  ownTimeRow: {},
  messageTime: { fontSize: 11 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sendGradient: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptySubtext: { fontSize: 13, marginTop: 4 },
});
