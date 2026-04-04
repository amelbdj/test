import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/store/authStore';
import { apiClient } from '../../src/api/client';
import { Drop } from '../../src/types';
import { Avatar } from '../../src/components/Avatar';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, updateUser, logout } = useAuthStore();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUserDrops = async () => {
    if (!user) return;
    try {
      const response = await apiClient.get(`/drops/user/${user.id}`);
      setDrops(response.data);
    } catch (error) {
      console.error('Error fetching drops:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserDrops();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserDrops();
  }, [user]);

  const handleChangePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Nous avons besoin de votre permission pour accéder à vos photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      try {
        const response = await apiClient.put('/profile', {
          profile_picture: `data:image/jpeg;base64,${result.assets[0].base64}`,
        });
        updateUser(response.data);
        Alert.alert('Succès', 'Photo de profil mise à jour');
      } catch (error) {
        Alert.alert('Erreur', 'Impossible de mettre à jour la photo');
      }
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const renderDropItem = ({ item }: { item: Drop }) => (
    <TouchableOpacity
      style={[styles.dropThumbnail, { backgroundColor: theme.surfaceVariant }]}
      onPress={() => router.push(`/drop/${item.id}`)}
      activeOpacity={0.8}
    >
      {item.is_revealed && item.media_data ? (
        <Image
          source={{
            uri: item.media_data.startsWith('data:')
              ? item.media_data
              : `data:image/jpeg;base64,${item.media_data}`,
          }}
          style={styles.dropImage}
        />
      ) : (
        <LinearGradient
          colors={[theme.surfaceVariant, theme.surface]}
          style={styles.lockedDrop}
        >
          <Ionicons name="lock-closed" size={22} color={theme.primary} />
        </LinearGradient>
      )}
    </TouchableOpacity>
  );

  if (!user || loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.placeholder} />
          <Text style={[styles.headerTitle, { color: theme.text }]}>Profil</Text>
          <TouchableOpacity 
            onPress={() => router.push('/settings')} 
            style={[styles.settingsButton, { backgroundColor: theme.surfaceVariant }]}
          >
            <Ionicons name="settings-outline" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <TouchableOpacity onPress={handleChangePhoto} style={styles.avatarContainer}>
            <Avatar source={user.profile_picture} name={user.username} size={100} showBorder />
            <View style={[styles.editBadge, { backgroundColor: theme.primary }]}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <Text style={[styles.username, { color: theme.text }]}>@{user.username}</Text>
          
          {user.bio ? (
            <Text style={[styles.bio, { color: theme.textSecondary }]}>{user.bio}</Text>
          ) : (
            <TouchableOpacity onPress={() => router.push('/edit-profile')}>
              <Text style={[styles.addBio, { color: theme.primary }]}>+ Ajouter une bio</Text>
            </TouchableOpacity>
          )}

          <View style={[styles.statsRow, { backgroundColor: theme.card }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{drops.length}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Drops</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{user.friends_count}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Amis</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <View style={styles.streakContainer}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <Text style={[styles.statValue, { color: theme.streak }]}>{user.streak}</Text>
              </View>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Streak</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.editButton, { borderColor: theme.border }]}
            onPress={() => router.push('/edit-profile')}
          >
            <Ionicons name="create-outline" size={18} color={theme.text} />
            <Text style={[styles.editButtonText, { color: theme.text }]}>Modifier le profil</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dropsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Mes Drops</Text>
          
          {drops.length === 0 ? (
            <View style={[styles.emptyDrops, { backgroundColor: theme.card }]}>
              <View style={[styles.emptyIconContainer, { backgroundColor: theme.primaryMuted }]}>
                <Ionicons name="images-outline" size={32} color={theme.primary} />
              </View>
              <Text style={[styles.emptyText, { color: theme.text }]}>
                Aucun Drop pour le moment
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
                Créez votre premier Drop !
              </Text>
            </View>
          ) : (
            <View style={styles.dropsGrid}>
              {drops.map((drop) => (
                <TouchableOpacity
                  key={drop.id}
                  style={[styles.dropThumbnail, { backgroundColor: theme.surfaceVariant }]}
                  onPress={() => router.push(`/drop/${drop.id}`)}
                  activeOpacity={0.8}
                >
                  {drop.is_revealed && drop.media_data ? (
                    <Image
                      source={{
                        uri: drop.media_data.startsWith('data:')
                          ? drop.media_data
                          : `data:image/jpeg;base64,${drop.media_data}`,
                      }}
                      style={styles.dropImage}
                    />
                  ) : (
                    <LinearGradient
                      colors={[theme.surfaceVariant, theme.surface]}
                      style={styles.lockedDrop}
                    >
                      <Ionicons name="lock-closed" size={22} color={theme.primary} />
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.errorMuted }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.error} />
          <Text style={[styles.logoutText, { color: theme.error }]}>Déconnexion</Text>
        </TouchableOpacity>
      </ScrollView>
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
  placeholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0F0F14',
  },
  username: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  bio: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 22,
  },
  addBio: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakEmoji: {
    fontSize: 20,
    marginRight: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  dropsSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  emptyDrops: {
    alignItems: 'center',
    paddingVertical: 40,
    borderRadius: 16,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  dropsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  dropThumbnail: {
    width: '32.5%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropImage: {
    width: '100%',
    height: '100%',
  },
  lockedDrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 32,
    marginBottom: 100,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
