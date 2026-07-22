import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme, useThemeMode } from '../src/hooks/useTheme';
import { useAuthStore } from '../src/store/authStore';

type ThemeMode = 'light' | 'dark' | 'system';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { mode, setMode } = useThemeMode();
  const { logout, user } = useAuthStore();

  const themeOptions: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'light', label: 'Clair', icon: 'sunny' },
    { value: 'dark', label: 'Sombre', icon: 'moon' },
    { value: 'system', label: 'Système', icon: 'phone-portrait' },
  ];

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

  const handleAbout = () => {
    Alert.alert(
      'À propos de Dropa',
      'Dropa v1.0.0\n\nUne application sociale où vos moments sont révélés chaque dimanche à 20h.\n\nCréez du suspense, partagez avec vos amis !',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backButton, { backgroundColor: theme.surfaceVariant }]}
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Paramètres</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={[styles.profileCard, { backgroundColor: theme.card }, theme.elevation.sm]}>
          <View style={styles.profileInfo}>
            <LinearGradient
              colors={[theme.gradientStart, theme.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileAvatar}
            >
              <Text style={styles.avatarInitials}>
                {user?.username.slice(0, 2).toUpperCase()}
              </Text>
            </LinearGradient>
            <View>
              <Text style={[styles.profileName, { color: theme.text }]}>@{user?.username}</Text>
              <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>{user?.email}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.editProfileButton, { backgroundColor: theme.surfaceVariant }]}
            onPress={() => router.push('/edit-profile')}
          >
            <Text style={[styles.editProfileText, { color: theme.text }]}>Modifier</Text>
          </TouchableOpacity>
        </View>

        {/* Theme Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>APPARENCE</Text>
        <View style={[styles.section, { backgroundColor: theme.card }, theme.elevation.sm]}>
          {themeOptions.map((option, index) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.themeOption,
                index < themeOptions.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
              ]}
              onPress={() => setMode(option.value)}
            >
              <View style={styles.themeOptionLeft}>
                <View style={[styles.iconContainer, { backgroundColor: theme.surfaceVariant }]}>
                  <Ionicons name={option.icon} size={18} color={theme.text} />
                </View>
                <Text style={[styles.themeOptionText, { color: theme.text }]}>
                  {option.label}
                </Text>
              </View>
              {mode === option.value && (
                <View style={[styles.checkContainer, { backgroundColor: theme.primaryMuted }]}>
                  <Ionicons name="checkmark" size={18} color={theme.primary} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Account Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>COMPTE</Text>
        <View style={[styles.section, { backgroundColor: theme.card }, theme.elevation.sm]}>
          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: theme.border }]} 
            onPress={() => router.push('/edit-profile')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.surfaceVariant }]}>
                <Ionicons name="person-outline" size={18} color={theme.text} />
              </View>
              <Text style={[styles.menuItemText, { color: theme.text }]}>Modifier le profil</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>INFORMATIONS</Text>
        <View style={[styles.section, { backgroundColor: theme.card }, theme.elevation.sm]}>
          <TouchableOpacity style={styles.menuItem} onPress={handleAbout}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.surfaceVariant }]}>
                <Ionicons name="information-circle-outline" size={18} color={theme.text} />
              </View>
              <Text style={[styles.menuItemText, { color: theme.text }]}>À propos</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.errorMuted }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.error} />
          <Text style={[styles.logoutText, { color: theme.error }]}>Déconnexion</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textTertiary }]}>
            Dropa v1.0.0
          </Text>
          <Text style={[styles.footerText, { color: theme.textTertiary }]}>
            Révélation chaque dimanche à 20h
          </Text>
        </View>
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
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  editProfileButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  section: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  themeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 13,
    marginBottom: 4,
  },
});
