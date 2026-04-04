import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/hooks/useTheme';
import { apiClient } from '../src/api/client';
import { Avatar } from '../src/components/Avatar';
import { AnimatedPressable, FadeInView } from '../src/components/Animations';
import { FriendCardSkeleton } from '../src/components/Skeleton';

const { width, height } = Dimensions.get('window');

interface WeeklySummary {
  drops_count: number;
  streak: number;
  total_likes: number;
  total_comments: number;
  best_drop: any;
  is_perfect_week: boolean;
  unique_days: number;
  achievement: string;
  achievement_message: string;
  friends_comparison: any[];
  week_start: string;
}

const ACHIEVEMENT_CONFIG: Record<string, { emoji: string; gradient: [string, string]; badge: string }> = {
  perfect_week: { emoji: '🏆', gradient: ['#FFD700', '#FFA500'], badge: 'Semaine Parfaite' },
  very_active: { emoji: '🔥', gradient: ['#FF6B35', '#FF3B5C'], badge: 'Super Actif' },
  active: { emoji: '💪', gradient: ['#7C5CFC', '#A78BFA'], badge: 'Actif' },
  starter: { emoji: '🌱', gradient: ['#10B981', '#34D399'], badge: 'Bon Debut' },
  none: { emoji: '😴', gradient: ['#6B7280', '#9CA3AF'], badge: 'Absent' },
};

export default function WeeklySummaryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await apiClient.get('/weekly-summary');
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching weekly summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <AnimatedPressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.surfaceVariant }]}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </AnimatedPressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Resume</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ padding: 16 }}>
          <FriendCardSkeleton />
          <FriendCardSkeleton />
          <FriendCardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (!summary) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <AnimatedPressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.surfaceVariant }]}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </AnimatedPressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Resume</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.textTertiary} />
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>Impossible de charger le resume</Text>
        </View>
      </SafeAreaView>
    );
  }

  const achievementConfig = ACHIEVEMENT_CONFIG[summary.achievement] || ACHIEVEMENT_CONFIG.none;
  const bestDropImage = summary.best_drop?.media_data
    ? summary.best_drop.media_data.startsWith('data:')
      ? summary.best_drop.media_data
      : `data:image/jpeg;base64,${summary.best_drop.media_data}`
    : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <AnimatedPressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: theme.surfaceVariant }]}
          scaleValue={0.9}
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </AnimatedPressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Resume Hebdo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Achievement Badge */}
        <FadeInView delay={0}>
          <LinearGradient
            colors={achievementConfig.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.achievementCard}
          >
            <Text style={styles.achievementEmoji}>{achievementConfig.emoji}</Text>
            <Text style={styles.achievementBadge}>{achievementConfig.badge}</Text>
            <Text style={styles.achievementMessage}>{summary.achievement_message}</Text>

            {/* Day dots */}
            <View style={styles.dayDotsRow}>
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                <View key={i} style={styles.dayDotContainer}>
                  <View style={[styles.dayDot, i < summary.unique_days && styles.dayDotActive]} />
                  <Text style={styles.dayLabel}>{day}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </FadeInView>

        {/* Stats Grid */}
        <FadeInView delay={200}>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.card }]}>
              <LinearGradient colors={['#7C5CFC', '#A78BFA']} style={styles.statIcon}>
                <Ionicons name="images" size={20} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.statValue, { color: theme.text }]}>{summary.drops_count}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Drops</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.card }]}>
              <LinearGradient colors={['#FF6B35', '#FF3B5C']} style={styles.statIcon}>
                <Text style={styles.statIconEmoji}>🔥</Text>
              </LinearGradient>
              <Text style={[styles.statValue, { color: theme.text }]}>{summary.streak}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Streak</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.card }]}>
              <LinearGradient colors={['#FF3B5C', '#FF6B8A']} style={styles.statIcon}>
                <Ionicons name="heart" size={20} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.statValue, { color: theme.text }]}>{summary.total_likes}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Likes</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.card }]}>
              <LinearGradient colors={['#3B82F6', '#60A5FA']} style={styles.statIcon}>
                <Ionicons name="chatbubble" size={20} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.statValue, { color: theme.text }]}>{summary.total_comments}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Commentaires</Text>
            </View>
          </View>
        </FadeInView>

        {/* Best Drop */}
        {summary.best_drop && summary.best_drop.is_revealed && (
          <FadeInView delay={400}>
            <View style={[styles.bestDropSection, { backgroundColor: theme.card }]}>
              <View style={styles.bestDropHeader}>
                <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.bestDropBadge}>
                  <Text style={styles.bestDropBadgeText}>Meilleur Drop</Text>
                </LinearGradient>
                <Text style={[styles.bestDropLikes, { color: theme.textSecondary }]}>
                  {summary.best_drop.likes_count} likes
                </Text>
              </View>
              {bestDropImage && (
                <AnimatedPressable
                  onPress={() => router.push(`/drop/${summary.best_drop.id}`)}
                  scaleValue={0.98}
                >
                  <Image
                    source={{ uri: bestDropImage }}
                    style={styles.bestDropImage}
                    resizeMode="cover"
                  />
                </AnimatedPressable>
              )}
              {summary.best_drop.description ? (
                <Text style={[styles.bestDropDescription, { color: theme.textSecondary }]} numberOfLines={2}>
                  {summary.best_drop.description}
                </Text>
              ) : null}
            </View>
          </FadeInView>
        )}

        {/* Friends Comparison */}
        {summary.friends_comparison.length > 0 && (
          <FadeInView delay={600}>
            <View style={styles.friendsSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Classement Amis</Text>
              {summary.friends_comparison.map((friend, index) => (
                <View
                  key={index}
                  style={[styles.friendRankCard, { backgroundColor: theme.card }]}
                >
                  <View style={[styles.rankBadge, index === 0 && styles.rankBadgeGold, index === 1 && styles.rankBadgeSilver]}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <Avatar source={friend.profile_picture} name={friend.username} size={40} />
                  <View style={styles.friendRankInfo}>
                    <Text style={[styles.friendRankName, { color: theme.text }]}>{friend.username}</Text>
                    <Text style={[styles.friendRankStats, { color: theme.textTertiary }]}>
                      {friend.drops_count} drops | 🔥 {friend.streak}
                    </Text>
                  </View>
                  <View style={[styles.friendDropCount, { backgroundColor: theme.primaryMuted }]}>
                    <Text style={[styles.friendDropCountText, { color: theme.primary }]}>
                      {friend.drops_count}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </FadeInView>
        )}

        {/* CTA */}
        <FadeInView delay={800}>
          <AnimatedPressable
            onPress={() => router.push('/(tabs)')}
            haptic="medium"
          >
            <LinearGradient
              colors={[theme.gradientStart, theme.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaButton}
            >
              <Text style={styles.ctaText}>Retour au Feed</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </LinearGradient>
          </AnimatedPressable>
        </FadeInView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: { fontSize: 16, fontWeight: '500' },

  // Achievement Card
  achievementCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
  },
  achievementEmoji: { fontSize: 56 },
  achievementBadge: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
  },
  achievementMessage: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 6,
    textAlign: 'center',
  },
  dayDotsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  dayDotContainer: { alignItems: 'center', gap: 4 },
  dayDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dayDotActive: { backgroundColor: '#FFFFFF' },
  dayLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: (width - 44) / 2,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statIconEmoji: { fontSize: 22 },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 13, marginTop: 2 },

  // Best Drop
  bestDropSection: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  bestDropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  bestDropBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  bestDropBadgeText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  bestDropLikes: { fontSize: 14, fontWeight: '600' },
  bestDropImage: {
    width: '100%',
    aspectRatio: 1,
  },
  bestDropDescription: {
    padding: 14,
    fontSize: 14,
    lineHeight: 20,
  },

  // Friends
  friendsSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  friendRankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankBadgeGold: { backgroundColor: '#FFD700' },
  rankBadgeSilver: { backgroundColor: '#C0C0C0' },
  rankText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  friendRankInfo: { flex: 1, marginLeft: 10 },
  friendRankName: { fontSize: 15, fontWeight: '600' },
  friendRankStats: { fontSize: 12, marginTop: 2 },
  friendDropCount: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  friendDropCountText: { fontSize: 15, fontWeight: '700' },

  // CTA
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  ctaText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
