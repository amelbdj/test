import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/hooks/useTheme';
import { apiClient } from '../src/api/client';
import { AnimatedPressable, FadeInView } from '../src/components/Animations';
import { FriendCardSkeleton } from '../src/components/Skeleton';

const { width } = Dimensions.get('window');

interface StreakData {
  current_streak: number;
  max_streak: number;
  streak_freezes: number;
  last_drop_date: string | null;
  milestones: Array<{
    days: number;
    emoji: string;
    label: string;
    color: string;
    achieved: boolean;
  }>;
  next_milestone: {
    days: number;
    emoji: string;
    label: string;
    color: string;
    days_remaining: number;
    progress: number;
  } | null;
  days_active_this_week: number;
  is_at_risk: boolean;
}

export default function StreakScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStreak();
  }, []);

  const fetchStreak = async () => {
    try {
      const response = await apiClient.get('/streak/details');
      setStreak(response.data);
    } catch (error) {
      console.error('Error fetching streak:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFreeze = async () => {
    Alert.alert(
      'Utiliser un Streak Freeze ?',
      'Cela sauvera votre streak pour aujourd\'hui sans poster de Drop.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Utiliser',
          onPress: async () => {
            try {
              await apiClient.post('/streak/freeze');
              fetchStreak();
              Alert.alert('Streak sauve !', 'Votre streak a ete protege.');
            } catch (error: any) {
              Alert.alert('Erreur', error.response?.data?.detail || 'Impossible d\'utiliser le freeze');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <AnimatedPressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.surfaceVariant }]}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </AnimatedPressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Streak</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ padding: 16 }}>
          <FriendCardSkeleton />
          <FriendCardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (!streak) return null;

  const currentMilestone = [...(streak.milestones || [])].reverse().find(m => m.achieved);

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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Streak</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Big Streak Number */}
        <FadeInView delay={0}>
          <LinearGradient
            colors={['#FF6B35', '#FF3B5C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bigStreakCard}
          >
            <Text style={styles.fireEmoji}>🔥</Text>
            <Text style={styles.bigStreakNumber}>{streak.current_streak}</Text>
            <Text style={styles.bigStreakLabel}>jours de streak</Text>

            {streak.is_at_risk && (
              <View style={styles.riskBanner}>
                <Ionicons name="warning" size={16} color="#FFD700" />
                <Text style={styles.riskText}>Streak en danger ! Postez un Drop aujourd'hui</Text>
              </View>
            )}

            <View style={styles.streakStatsRow}>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{streak.max_streak}</Text>
                <Text style={styles.miniStatLabel}>Record</Text>
              </View>
              <View style={[styles.miniStatDivider]} />
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{streak.days_active_this_week}/7</Text>
                <Text style={styles.miniStatLabel}>Cette semaine</Text>
              </View>
              <View style={[styles.miniStatDivider]} />
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{streak.streak_freezes}</Text>
                <Text style={styles.miniStatLabel}>Freezes</Text>
              </View>
            </View>
          </LinearGradient>
        </FadeInView>

        {/* Streak Freeze */}
        {streak.is_at_risk && streak.streak_freezes > 0 && (
          <FadeInView delay={100}>
            <AnimatedPressable
              style={[styles.freezeButton, { backgroundColor: theme.card }]}
              onPress={handleFreeze}
              scaleValue={0.98}
              haptic="medium"
            >
              <View style={[styles.freezeIcon, { backgroundColor: '#E0F2FE' }]}>
                <Text style={{ fontSize: 24 }}>🧊</Text>
              </View>
              <View style={styles.freezeTextContainer}>
                <Text style={[styles.freezeTitle, { color: theme.text }]}>Streak Freeze</Text>
                <Text style={[styles.freezeSubtitle, { color: theme.textTertiary }]}>
                  {streak.streak_freezes} disponible{streak.streak_freezes > 1 ? 's' : ''}
                </Text>
              </View>
              <LinearGradient
                colors={['#3B82F6', '#60A5FA']}
                style={styles.freezeAction}
              >
                <Text style={styles.freezeActionText}>Utiliser</Text>
              </LinearGradient>
            </AnimatedPressable>
          </FadeInView>
        )}

        {/* Next Milestone */}
        {streak.next_milestone && (
          <FadeInView delay={200}>
            <View style={[styles.nextMilestoneCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Prochain Objectif</Text>
              <View style={styles.milestoneRow}>
                <Text style={styles.milestoneEmoji}>{streak.next_milestone.emoji}</Text>
                <View style={styles.milestoneInfo}>
                  <Text style={[styles.milestoneName, { color: theme.text }]}>
                    {streak.next_milestone.label}
                  </Text>
                  <Text style={[styles.milestoneDays, { color: theme.textTertiary }]}>
                    Encore {streak.next_milestone.days_remaining} jour{streak.next_milestone.days_remaining > 1 ? 's' : ''}
                  </Text>
                </View>
                <Text style={[styles.milestoneTarget, { color: theme.textSecondary }]}>
                  {streak.current_streak}/{streak.next_milestone.days}
                </Text>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: theme.surfaceVariant }]}>
                <LinearGradient
                  colors={[streak.next_milestone.color, streak.next_milestone.color + '99']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(streak.next_milestone.progress * 100, 100)}%` as any },
                  ]}
                />
              </View>
            </View>
          </FadeInView>
        )}

        {/* All Milestones */}
        <FadeInView delay={300}>
          <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 12 }]}>
            Milestones
          </Text>
          {streak.milestones.map((milestone, index) => (
            <View
              key={index}
              style={[
                styles.milestoneCard,
                { backgroundColor: milestone.achieved ? theme.card : theme.surfaceVariant },
                !milestone.achieved && { opacity: 0.5 },
              ]}
            >
              <View
                style={[
                  styles.milestoneIconCircle,
                  { backgroundColor: milestone.achieved ? milestone.color + '20' : theme.surfaceVariant },
                ]}
              >
                <Text style={{ fontSize: 24 }}>{milestone.emoji}</Text>
              </View>
              <View style={styles.milestoneCardInfo}>
                <Text style={[styles.milestoneCardName, { color: theme.text }]}>
                  {milestone.label}
                </Text>
                <Text style={[styles.milestoneCardDays, { color: theme.textTertiary }]}>
                  {milestone.days} jours
                </Text>
              </View>
              {milestone.achieved ? (
                <View style={styles.achievedRow}>
                  {milestone.rewarded && (
                    <View style={[styles.rewardBadge, { backgroundColor: '#3B82F620' }]}>
                      <Text style={{ fontSize: 12 }}>🧊</Text>
                      <Text style={[styles.rewardText, { color: '#3B82F6' }]}>+{milestone.reward_freezes}</Text>
                    </View>
                  )}
                  <View style={[styles.achievedBadge, { backgroundColor: '#10B98120' }]}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  </View>
                </View>
              ) : (
                <Ionicons name="lock-closed" size={18} color={theme.textTertiary} />
              )}
            </View>
          ))}
        </FadeInView>

        {/* Week Activity */}
        <FadeInView delay={400}>
          <View style={[styles.weekCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Activite de la semaine
            </Text>
            <View style={styles.weekDotsRow}>
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, i) => (
                <View key={i} style={styles.weekDotContainer}>
                  <View
                    style={[
                      styles.weekDot,
                      {
                        backgroundColor:
                          i < streak.days_active_this_week
                            ? '#FF6B35'
                            : theme.surfaceVariant,
                      },
                    ]}
                  >
                    {i < streak.days_active_this_week && (
                      <Ionicons name="checkmark" size={14} color="#FFF" />
                    )}
                  </View>
                  <Text style={[styles.weekDayLabel, { color: theme.textTertiary }]}>{day}</Text>
                </View>
              ))}
            </View>
          </View>
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

  // Big Streak
  bigStreakCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  fireEmoji: { fontSize: 48 },
  bigStreakNumber: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: -4,
    lineHeight: 80,
  },
  bigStreakLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  riskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  riskText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '600',
  },
  streakStatsRow: {
    flexDirection: 'row',
    marginTop: 20,
    width: '100%',
    justifyContent: 'space-around',
  },
  miniStat: { alignItems: 'center' },
  miniStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  miniStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  miniStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Freeze
  freezeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    gap: 12,
  },
  freezeIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freezeTextContainer: { flex: 1 },
  freezeTitle: { fontSize: 16, fontWeight: '700' },
  freezeSubtitle: { fontSize: 13, marginTop: 2 },
  freezeAction: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  freezeActionText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // Next Milestone
  nextMilestoneCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 12,
  },
  milestoneEmoji: { fontSize: 36 },
  milestoneInfo: { flex: 1 },
  milestoneName: { fontSize: 16, fontWeight: '600' },
  milestoneDays: { fontSize: 13, marginTop: 2 },
  milestoneTarget: { fontSize: 16, fontWeight: '700' },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },

  // Milestone Cards
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
  },
  milestoneIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneCardInfo: { flex: 1, marginLeft: 12 },
  milestoneCardName: { fontSize: 15, fontWeight: '600' },
  milestoneCardDays: { fontSize: 12, marginTop: 2 },
  achievedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Week Activity
  weekCard: {
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
  },
  weekDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  weekDotContainer: { alignItems: 'center', gap: 6 },
  weekDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayLabel: { fontSize: 11, fontWeight: '600' },
});
