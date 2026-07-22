import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { apiClient } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { AnimatedPressable, FadeInView } from '../../src/components/Animations';
import { showAlert } from '../../src/utils/alert';

type MediaType = 'image' | 'video';

interface MediaState {
  uri: string;
  base64?: string;
  type: MediaType;
  filename?: string;
}

export default function CreateDropScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [media, setMedia] = useState<MediaState | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const videoRef = useRef<Video>(null);

  const pickMedia = async (type: 'photo' | 'video' | 'both') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission requise', 'Nous avons besoin de votre permission pour acceder a vos medias.');
        return;
      }

      const mediaTypes = type === 'photo'
        ? ImagePicker.MediaTypeOptions.Images
        : type === 'video'
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.All;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsEditing: type !== 'video',
        aspect: type === 'video' ? undefined : [1, 1],
        quality: 0.7,
        base64: type !== 'video',
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const isVideo = asset.type === 'video' || (asset.uri && asset.uri.match(/\.(mp4|mov|webm|avi)$/i));

        if (isVideo) {
          setMedia({
            uri: asset.uri,
            type: 'video',
            filename: asset.fileName || 'video.mp4',
          });
        } else if (asset.base64) {
          setMedia({
            uri: asset.uri,
            base64: `data:image/jpeg;base64,${asset.base64}`,
            type: 'image',
          });
        }
      }
    } catch (error) {
      console.error('Media picker error:', error);
      showAlert('Erreur', 'Impossible de selectionner le media.');
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      showAlert('Non disponible', 'La camera n\'est pas disponible depuis un navigateur. Utilisez "Photo" pour choisir un fichier.');
      return;
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission requise', 'Nous avons besoin de votre permission pour utiliser la camera.');
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
    } catch (error) {
      console.error('Camera error:', error);
      showAlert('Erreur', 'Impossible d\'utiliser la camera.');
    }
  };

  const handleSubmit = async () => {
    if (!media) {
      showAlert('Erreur', 'Veuillez selectionner un media');
      return;
    }

    setLoading(true);
    try {
      if (media.type === 'video') {
        // Upload video file to server
        setUploadProgress('Upload de la video...');
        const formData = new FormData();
        if (Platform.OS === 'web') {
          // On web, media.uri is a blob: URL - FormData needs a real Blob/File,
          // not the {uri, type, name} shorthand object React Native uses natively.
          const fileBlob = await (await fetch(media.uri)).blob();
          formData.append('file', fileBlob, media.filename || 'video.mp4');
        } else {
          formData.append('file', {
            uri: media.uri,
            type: 'video/mp4',
            name: media.filename || 'video.mp4',
          } as any);
        }

        const uploadRes = await apiClient.post('/upload/media', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setUploadProgress('Creation du Drop...');
        await apiClient.post('/drops', {
          media_url: uploadRes.data.media_url,
          media_type: 'video',
          description: description.trim(),
        });
      } else {
        // Image: send as base64
        setUploadProgress('Creation du Drop...');
        await apiClient.post('/drops', {
          media_data: media.base64,
          media_type: 'image',
          description: description.trim(),
        });
      }

      router.replace('/(tabs)?dropCreated=1');
    } catch (error: any) {
      console.error('Create drop error:', error);
      showAlert('Erreur', error.response?.data?.detail || 'Impossible de creer le Drop');
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <FadeInView>
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Nouveau Drop</Text>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                Sera revele dimanche a 20h
              </Text>
            </View>
          </FadeInView>

          {media ? (
            <FadeInView>
              <View style={styles.previewContainer}>
                {media.type === 'video' ? (
                  <Video
                    ref={videoRef}
                    source={{ uri: media.uri }}
                    style={styles.preview}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    isLooping
                    useNativeControls
                  />
                ) : (
                  <Image source={{ uri: media.uri }} style={styles.preview} />
                )}

                <AnimatedPressable
                  style={[styles.removeButton, { backgroundColor: theme.error }]}
                  onPress={() => setMedia(null)}
                  scaleValue={0.9}
                >
                  <Ionicons name="close" size={22} color="#FFFFFF" />
                </AnimatedPressable>

                <View style={[styles.mediaTypeBadge, { backgroundColor: media.type === 'video' ? '#FF6B35' : theme.primary }]}>
                  <Ionicons name={media.type === 'video' ? 'videocam' : 'image'} size={14} color="#FFF" />
                  <Text style={styles.mediaTypeBadgeText}>
                    {media.type === 'video' ? 'Video' : 'Photo'}
                  </Text>
                </View>

                <View style={[styles.lockedOverlay, { backgroundColor: theme.overlay }]}>
                  <Ionicons name="lock-closed" size={24} color={theme.primary} />
                  <Text style={[styles.lockedText, { color: theme.text }]}>Sera floute jusqu&apos;au reveal</Text>
                </View>
              </View>
            </FadeInView>
          ) : (
            <FadeInView delay={100}>
              <View style={styles.mediaButtons}>
                <AnimatedPressable
                  style={[styles.mediaButton, { backgroundColor: theme.card }, theme.elevation.sm]}
                  onPress={takePhoto}
                  scaleValue={0.97}
                >
                  <View style={[styles.mediaIconContainer, { backgroundColor: theme.primaryMuted }]}>
                    <Ionicons name="camera" size={32} color={theme.primary} />
                  </View>
                  <Text style={[styles.mediaButtonText, { color: theme.text }]}>Camera</Text>
                  <Text style={[styles.mediaButtonSubtext, { color: theme.textTertiary }]}>Prendre une photo</Text>
                </AnimatedPressable>

                <AnimatedPressable
                  style={[styles.mediaButton, { backgroundColor: theme.card }, theme.elevation.sm]}
                  onPress={() => pickMedia('photo')}
                  scaleValue={0.97}
                >
                  <View style={[styles.mediaIconContainer, { backgroundColor: theme.secondaryMuted }]}>
                    <Ionicons name="images" size={32} color={theme.secondary} />
                  </View>
                  <Text style={[styles.mediaButtonText, { color: theme.text }]}>Photo</Text>
                  <Text style={[styles.mediaButtonSubtext, { color: theme.textTertiary }]}>Depuis la galerie</Text>
                </AnimatedPressable>
              </View>

              <AnimatedPressable
                style={[styles.videoButton, { backgroundColor: theme.card }, theme.elevation.sm]}
                onPress={() => pickMedia('video')}
                scaleValue={0.98}
              >
                <LinearGradient
                  colors={['#FF6B35', '#FF3B5C']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.videoIconContainer}
                >
                  <Ionicons name="videocam" size={24} color="#FFF" />
                </LinearGradient>
                <View style={styles.videoButtonTextContainer}>
                  <Text style={[styles.mediaButtonText, { color: theme.text }]}>Video</Text>
                  <Text style={[styles.mediaButtonSubtext, { color: theme.textTertiary }]}>Max 60 secondes depuis la galerie</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
              </AnimatedPressable>
            </FadeInView>
          )}

          <FadeInView delay={200}>
            <View style={[styles.descriptionCard, { backgroundColor: theme.card }, theme.elevation.sm]}>
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
          </FadeInView>

          <FadeInView delay={300}>
            <View style={[styles.infoBox, { backgroundColor: theme.primaryMuted }]}>
              <Ionicons name="information-circle" size={22} color={theme.primary} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                Votre Drop sera floute jusqu&apos;a la revelation de dimanche 20h. Seuls vos amis pourront le voir.
              </Text>
            </View>
          </FadeInView>

          {uploadProgress ? (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.progressText, { color: theme.textSecondary }]}>{uploadProgress}</Text>
            </View>
          ) : null}

          <Button
            title={media ? (media.type === 'video' ? "Publier la Video" : "Publier la Photo") : "Selectionnez un media"}
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
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 15, marginTop: 4 },
  previewContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  preview: { width: '100%', height: '100%' },
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
  mediaTypeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  mediaTypeBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  lockedOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lockedText: { fontSize: 14, fontWeight: '600' },
  mediaButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
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
  mediaButtonText: { fontSize: 15, fontWeight: '600' },
  mediaButtonSubtext: { fontSize: 12, marginTop: 4, textAlign: 'center' },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 20,
    gap: 14,
  },
  videoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoButtonTextContainer: { flex: 1 },
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
    marginBottom: 16,
    gap: 12,
  },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20 },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  progressText: { fontSize: 14 },
});
