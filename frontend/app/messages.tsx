import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/hooks/useTheme';
import { apiClient } from '../src/api/client';
import { Conversation } from '../src/types';
import { useAuthStore } from '../src/store/authStore';
import { LoadingSpinner } from '../src/components/LoadingSpinner';
import { Avatar } from '../src/components/Avatar';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function MessagesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = async () => {
    try {
      const response = await apiClient.get('/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations();
  }, []);

  const getOtherParticipant = (conv: Conversation) => {
    const index = conv.participants.findIndex((p) => p !== user?.id);
    return {
      id: conv.participants[index],
      username: conv.participant_usernames[index],
      picture: conv.participant_pictures[index],
    };
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const other = getOtherParticipant(item);
    const timeAgo = item.last_message_time
      ? formatDistanceToNow(new Date(item.last_message_time), { addSuffix: false, locale: fr })
      : '';

    return (
      <TouchableOpacity
        style={[styles.conversationCard, { backgroundColor: theme.card }, theme.elevation.sm]}
        onPress={() => router.push(`/chat/${item.id}`)}
        activeOpacity={0.7}
      >
        <Avatar source={other.picture} name={other.username} size={54} />
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.conversationName, { color: theme.text }]}>
              {other.username}
            </Text>
            {timeAgo && (
              <Text style={[styles.timeAgo, { color: theme.textTertiary }]}>{timeAgo}</Text>
            )}
          </View>
          {item.last_message && (
            <Text
              style={[
                styles.lastMessage,
                { color: item.unread_count > 0 ? theme.text : theme.textSecondary },
                item.unread_count > 0 && styles.unreadMessage,
              ]}
              numberOfLines={1}
            >
              {item.last_message}
            </Text>
          )}
        </View>
        {item.unread_count > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.unreadCount}>{item.unread_count}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Chargement..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backButton, { backgroundColor: theme.surfaceVariant }]}
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Messages</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
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
              <Ionicons name="chatbubbles-outline" size={40} color={theme.primary} />
            </View>
            <Text style={[styles.emptyText, { color: theme.text }]}>
              Aucune conversation
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
              Envoyez un message à un ami pour commencer
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  placeholder: {
    width: 40,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  conversationInfo: {
    flex: 1,
    marginLeft: 14,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeAgo: {
    fontSize: 12,
  },
  lastMessage: {
    fontSize: 14,
    marginTop: 4,
  },
  unreadMessage: {
    fontWeight: '600',
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
