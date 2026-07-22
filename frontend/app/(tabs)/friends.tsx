import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/hooks/useTheme';
import { apiClient } from '../../src/api/client';
import { Friend, FriendRequest, SearchUser } from '../../src/types';
import { Avatar } from '../../src/components/Avatar';
import { FriendCardSkeleton } from '../../src/components/Skeleton';
import { AnimatedPressable, FadeInView, StaggerItem } from '../../src/components/Animations';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';

type TabType = 'friends' | 'requests' | 'search';

export default function FriendsScreen() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);

  const fetchData = async () => {
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        apiClient.get('/friends'),
        apiClient.get('/friends/requests'),
      ]);
      setFriends(friendsRes.data);
      setRequests(requestsRes.data);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await apiClient.get(`/users/search?q=${query}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await apiClient.post(`/friends/request/${userId}`);
      setSearchResults((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, request_pending: true } : user
        )
      );
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await apiClient.post(`/friends/accept/${requestId}`);
      fetchData();
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await apiClient.post(`/friends/reject/${requestId}`);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const renderFriend = ({ item, index }: { item: Friend; index: number }) => (
    <StaggerItem index={index}>
      <View style={[styles.friendCard, { backgroundColor: theme.card }, theme.elevation.sm]}>
        <Avatar source={item.profile_picture} name={item.username} size={52} />
        <View style={styles.friendInfo}>
          <Text style={[styles.friendName, { color: theme.text }]}>{item.username}</Text>
          {item.streak > 0 && (
            <View style={[styles.streakBadge, { backgroundColor: theme.streakMuted }]}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={[styles.streakText, { color: theme.streak }]}>
                {item.streak}
              </Text>
            </View>
          )}
        </View>
      </View>
    </StaggerItem>
  );

  const renderRequest = ({ item, index }: { item: FriendRequest; index: number }) => (
    <StaggerItem index={index}>
      <View style={[styles.requestCard, { backgroundColor: theme.card }, theme.elevation.sm]}>
        <Avatar source={item.from_profile_picture} name={item.from_username} size={52} />
        <View style={styles.requestInfo}>
          <Text style={[styles.friendName, { color: theme.text }]}>{item.from_username}</Text>
          <Text style={[styles.requestLabel, { color: theme.textSecondary }]}>Veut être votre ami</Text>
        </View>
        <View style={styles.requestActions}>
          <AnimatedPressable
            style={[styles.acceptButton, { backgroundColor: theme.successMuted }]}
            onPress={() => handleAcceptRequest(item.id)}
            haptic="medium"
            scaleValue={0.9}
          >
            <Ionicons name="checkmark" size={20} color={theme.success} />
          </AnimatedPressable>
          <AnimatedPressable
            style={[styles.rejectButton, { backgroundColor: theme.errorMuted }]}
            onPress={() => handleRejectRequest(item.id)}
            haptic="light"
            scaleValue={0.9}
          >
            <Ionicons name="close" size={20} color={theme.error} />
          </AnimatedPressable>
        </View>
      </View>
    </StaggerItem>
  );

  const renderSearchResult = ({ item, index }: { item: SearchUser; index: number }) => (
    <StaggerItem index={index}>
      <View style={[styles.friendCard, { backgroundColor: theme.card }, theme.elevation.sm]}>
        <Avatar source={item.profile_picture} name={item.username} size={52} />
        <View style={styles.friendInfo}>
          <Text style={[styles.friendName, { color: theme.text }]}>{item.username}</Text>
          {item.is_friend ? (
            <View style={[styles.statusBadge, { backgroundColor: theme.successMuted }]}>
              <Text style={[styles.statusText, { color: theme.success }]}>Ami</Text>
            </View>
          ) : item.request_pending ? (
            <View style={[styles.statusBadge, { backgroundColor: theme.surfaceVariant }]}>
              <Text style={[styles.statusText, { color: theme.textTertiary }]}>En attente</Text>
            </View>
          ) : (
            <AnimatedPressable
              style={styles.addButton}
              onPress={() => handleSendRequest(item.id)}
              haptic="medium"
            >
              <LinearGradient
                colors={[theme.gradientStart, theme.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.addButtonGradient}
              >
                <Ionicons name="person-add" size={16} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Ajouter</Text>
              </LinearGradient>
            </AnimatedPressable>
          )}
        </View>
      </View>
    </StaggerItem>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Amis</Text>
        </View>
        <View style={styles.listContent}>
          <FriendCardSkeleton />
          <FriendCardSkeleton />
          <FriendCardSkeleton />
          <FriendCardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Amis</Text>
      </View>

      <View style={[styles.tabs, { backgroundColor: theme.card }, theme.elevation.sm]}>
        {(['friends', 'requests', 'search'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && [styles.activeTab, { backgroundColor: theme.primaryMuted }],
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? theme.primary : theme.textSecondary },
              ]}
            >
              {tab === 'friends' 
                ? `Amis (${friends.length})` 
                : tab === 'requests' 
                  ? `Demandes${requests.length > 0 ? ` (${requests.length})` : ''}`
                  : 'Rechercher'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'search' && (
        <View style={[styles.searchContainer, { backgroundColor: theme.card }, theme.elevation.sm]}>
          <Ionicons name="search" size={20} color={theme.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Rechercher un utilisateur..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {activeTab === 'friends' && (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={renderFriend}
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
                <Ionicons name="people-outline" size={40} color={theme.primary} />
              </View>
              <Text style={[styles.emptyText, { color: theme.text }]}>
                Aucun ami pour le moment
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
                Recherchez des utilisateurs pour les ajouter
              </Text>
            </View>
          }
        />
      )}

      {activeTab === 'requests' && (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequest}
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
                <Ionicons name="mail-outline" size={40} color={theme.primary} />
              </View>
              <Text style={[styles.emptyText, { color: theme.text }]}>
                Aucune demande en attente
              </Text>
            </View>
          }
        />
      )}

      {activeTab === 'search' && (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderSearchResult}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            searchQuery.length >= 2 ? (
              searching ? (
                <LoadingSpinner message="Recherche..." />
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    Aucun résultat
                  </Text>
                </View>
              )
            ) : (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconContainer, { backgroundColor: theme.primaryMuted }]}>
                  <Ionicons name="search" size={40} color={theme.primary} />
                </View>
                <Text style={[styles.emptyText, { color: theme.text }]}>
                  Rechercher un utilisateur
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
                  Tapez au moins 2 caractères
                </Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 4,
    borderRadius: 14,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    height: 52,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  streakEmoji: {
    fontSize: 14,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '700',
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  requestInfo: {
    flex: 1,
    marginLeft: 14,
  },
  requestLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
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
  },
});
