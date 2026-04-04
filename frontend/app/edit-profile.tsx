import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/hooks/useTheme';
import { useAuthStore } from '../src/store/authStore';
import { apiClient } from '../src/api/client';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { Avatar } from '../src/components/Avatar';

export default function EditProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);

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
      setPhotoLoading(true);
      try {
        const response = await apiClient.put('/profile', {
          profile_picture: `data:image/jpeg;base64,${result.assets[0].base64}`,
        });
        updateUser(response.data);
        Alert.alert('Succès', 'Photo de profil mise à jour');
      } catch (error) {
        Alert.alert('Erreur', 'Impossible de mettre à jour la photo');
      } finally {
        setPhotoLoading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Erreur', 'Le pseudo ne peut pas être vide');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.put('/profile', {
        username: username.trim(),
        bio: bio.trim(),
      });
      updateUser(response.data);
      Alert.alert('Succès', 'Profil mis à jour', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de mettre à jour le profil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={[styles.backButton, { backgroundColor: theme.surfaceVariant }]}
          >
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Modifier le profil</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TouchableOpacity 
            style={styles.avatarSection} 
            onPress={handleChangePhoto}
            disabled={photoLoading}
          >
            <Avatar 
              source={user?.profile_picture || null} 
              name={user?.username || ''} 
              size={100} 
              showBorder 
            />
            <View style={[styles.changePhotoButton, { backgroundColor: theme.primary }]}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>
            <Text style={[styles.changePhotoText, { color: theme.primary }]}>
              {photoLoading ? 'Chargement...' : 'Changer la photo'}
            </Text>
          </TouchableOpacity>

          <View style={[styles.formCard, { backgroundColor: theme.card }]}>
            <Input
              label="Pseudo"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              icon="at-outline"
            />

            <View style={styles.bioContainer}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>BIO</Text>
              <View style={[styles.bioInputContainer, { backgroundColor: theme.surfaceVariant }]}>
                <Ionicons name="document-text-outline" size={20} color={theme.textTertiary} style={styles.bioIcon} />
                <View style={styles.bioInputWrapper}>
                  <Input
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    placeholder="Parlez-nous de vous..."
                    style={styles.bioInput}
                  />
                </View>
              </View>
              <Text style={[styles.charCount, { color: theme.textTertiary }]}>
                {bio.length}/150
              </Text>
            </View>
          </View>

          <Button
            title="Enregistrer les modifications"
            onPress={handleSave}
            loading={loading}
            fullWidth
            size="large"
          />
        </ScrollView>
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
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: 32,
    right: '35%',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0F0F14',
  },
  changePhotoText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  formCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  bioContainer: {
    marginTop: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bioInputContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    paddingLeft: 16,
    paddingTop: 4,
  },
  bioIcon: {
    marginTop: 14,
  },
  bioInputWrapper: {
    flex: 1,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
  },
});
