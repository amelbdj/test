import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { apiClient } from '../../src/api/client';
import { Button } from '../../src/components/Button';

export default function CreateDropScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [media, setMedia] = useState<{ uri: string; base64: string; type: 'image' | 'video' } | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
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
      setMedia({
        uri: result.assets[0].uri,
        base64: `data:image/jpeg;base64,${result.assets[0].base64}`,
        type: 'image',
      });
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Nous avons besoin de votre permission pour utiliser la caméra.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setMedia({
        uri: result.assets[0].uri,
        base64: `data:image/jpeg;base64,${result.assets[0].base64}`,
        type: 'image',
      });
    }
  };

  const handleSubmit = async () => {
    if (!media) {
      Alert.alert('Erreur', 'Veuillez sélectionner une photo');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/drops', {
        media_data: media.base64,
        media_type: media.type,
        description: description.trim(),
      });

      Alert.alert(
        'Drop créé ! 🎉',
        'Votre Drop sera révélé dimanche à 20h',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de créer le Drop');
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
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Nouveau Drop</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              Sera révélé dimanche à 20h
            </Text>
          </View>

          {media ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: media.uri }} style={styles.preview} />
              <TouchableOpacity
                style={[styles.removeButton, { backgroundColor: theme.error }]}
                onPress={() => setMedia(null)}
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={[styles.lockedOverlay, { backgroundColor: theme.overlay }]}>
                <Ionicons name="lock-closed" size={32} color={theme.primary} />
                <Text style={[styles.lockedText, { color: theme.text }]}>Aperçu flouté</Text>
              </View>
            </View>
          ) : (
            <View style={styles.mediaButtons}>
              <TouchableOpacity
                style={[styles.mediaButton, { backgroundColor: theme.card }]}
                onPress={takePhoto}
              >
                <View style={[styles.mediaIconContainer, { backgroundColor: theme.primaryMuted }]}>
                  <Ionicons name="camera" size={32} color={theme.primary} />
                </View>
                <Text style={[styles.mediaButtonText, { color: theme.text }]}>Prendre une photo</Text>
                <Text style={[styles.mediaButtonSubtext, { color: theme.textTertiary }]}>Utilisez votre caméra</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mediaButton, { backgroundColor: theme.card }]}
                onPress={pickImage}
              >
                <View style={[styles.mediaIconContainer, { backgroundColor: theme.secondaryMuted }]}>
                  <Ionicons name="images" size={32} color={theme.secondary} />
                </View>
                <Text style={[styles.mediaButtonText, { color: theme.text }]}>Galerie</Text>
                <Text style={[styles.mediaButtonSubtext, { color: theme.textTertiary }]}>Choisissez une photo</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.descriptionCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>DESCRIPTION</Text>
            <TextInput
              style={[
                styles.descriptionInput,
                { backgroundColor: theme.surfaceVariant, color: theme.text },
              ]}
              placeholder="Ajoutez une description... (optionnel)"
              placeholderTextColor={theme.textTertiary}
              multiline
              maxLength={200}
              value={description}
              onChangeText={setDescription}
            />
            <Text style={[styles.charCount, { color: theme.textTertiary }]}>
              {description.length}/200
            </Text>
          </View>

          <View style={[styles.infoBox, { backgroundColor: theme.primaryMuted }]}>
            <Ionicons name="information-circle" size={22} color={theme.primary} />
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              Votre Drop sera flouté jusqu'à la révélation de dimanche 20h. Seuls vos amis pourront le voir.
            </Text>
          </View>

          <Button
            title={media ? "Publier le Drop" : "Sélectionnez une photo"}
            onPress={handleSubmit}
            loading={loading}
            disabled={!media}
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
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  previewContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  lockedOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lockedText: {
    fontSize: 15,
    fontWeight: '600',
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  mediaButton: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  mediaIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  mediaButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  mediaButtonSubtext: {
    fontSize: 13,
    marginTop: 4,
  },
  descriptionCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  descriptionInput: {
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 14,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
