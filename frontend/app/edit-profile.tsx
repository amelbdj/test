import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/hooks/useTheme';
import { useAuthStore } from '../src/store/authStore';
import { apiClient } from '../src/api/client';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { TouchableOpacity } from 'react-native';

export default function EditProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [loading, setLoading] = useState(false);

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
      Alert.alert('Succès', 'Profil mis à jour');
      router.back();
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de mettre à jour le profil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Modifier le profil</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Input
            label="Pseudo"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            icon="person-outline"
          />

          <View style={styles.bioContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Bio</Text>
            <Input
              value={bio}
              onChangeText={setBio}
              multiline
              placeholder="Parlez-nous de vous..."
              style={styles.bioInput}
            />
            <Text style={[styles.charCount, { color: theme.textTertiary }]}>
              {bio.length}/150
            </Text>
          </View>

          <Button
            title="Enregistrer"
            onPress={handleSave}
            loading={loading}
            fullWidth
            size="large"
            style={styles.saveButton}
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
  content: {
    padding: 16,
  },
  bioContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  bioInput: {
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  saveButton: {
    marginTop: 24,
  },
});
