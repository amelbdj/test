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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/store/authStore';
import { apiClient } from '../../src/api/client';
import { Drop } from '../../src/types';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/Button';
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

  if (!user || loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/settings')} style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <TouchableOpacity onPress={handleChangePhoto} style={styles.avatarContainer}>
            <Avatar source={user.profile_picture} name={user.username} size={100} />
            <View style={[styles.editBadge, { backgroundColor: theme.primary }]}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <Text style={[styles.username, { color: theme.text }]}>@{user.username}</Text>
          
          {user.bio ? (
            <Text style={[styles.bio, { color: theme.textSecondary }]}>{user.bio}</Text>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{drops.length}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Drops</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{user.friends_count}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Amis</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.streakContainer}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>{user.streak}</Text>
              </View>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Streak</Text>
            </View>
          </View>

          <Button
            title="Modifier le profil"
            onPress={() => router.push('/edit-profile')}
            variant="outline"
            style={styles.editButton}
          />
        </View>

        <View style={styles.dropsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Mes Drops</Text>
          
          {drops.length === 0 ? (
            <View style={styles.emptyDrops}>
              <Ionicons name="images-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Aucun Drop pour le moment
              </Text>
            </View>
          ) : (
            <View style={styles.dropsGrid}>
              {drops.map((drop) => (
                <TouchableOpacity
                  key={drop.id}
                  style={[styles.dropThumbnail, { backgroundColor: theme.surfaceVariant }]}
                  onPress={() => router.push(`/drop/${drop.id}`)}
                >
                  {drop.is_revealed && drop.media_data ? (
                    <Image
                      source={{ uri: drop.media_data.startsWith('data:') ? drop.media_data : `data:image/jpeg;base64,${drop.media_data}` }}
                      style={styles.dropImage}
                    />
                  ) : (
                    <View style={styles.lockedDrop}>
                      <Ionicons name="lock-closed" size={24} color={theme.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, { borderColor: theme.error }]}
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
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  settingsButton: {
    padding: 8,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
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
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  bio: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E0E0E0',
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
    marginTop: 20,
    paddingHorizontal: 40,
  },
  dropsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyDrops: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
  dropsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  dropThumbnail: {
    width: '32.5%',
    aspectRatio: 1,
    borderRadius: 8,
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
    marginHorizontal: 16,
    marginTop: 32,
    marginBottom: 100,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
