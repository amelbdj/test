import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, DateData } from 'react-native-calendars';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/store/authStore';
import { apiClient } from '../../src/api/client';
import { Drop } from '../../src/types';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { format, parseISO, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MarkedDate {
  marked?: boolean;
  dotColor?: string;
  selected?: boolean;
  selectedColor?: string;
  customStyles?: any;
}

export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDrop, setSelectedDrop] = useState<Drop | null>(null);
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));

  const fetchDrops = async () => {
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
    fetchDrops();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDrops();
  }, [user]);

  const getMarkedDates = (): { [date: string]: MarkedDate } => {
    const marked: { [date: string]: MarkedDate } = {};
    
    drops.forEach((drop) => {
      const dateKey = format(parseISO(drop.created_at), 'yyyy-MM-dd');
      marked[dateKey] = {
        marked: true,
        dotColor: theme.primary,
      };
    });

    // Highlight streak days
    if (user && user.streak > 0 && user.last_drop_date) {
      // Just mark the current streak indicator
    }

    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: theme.primary,
      };
    }

    return marked;
  };

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    const dropForDay = drops.find((drop) => {
      const dropDate = format(parseISO(drop.created_at), 'yyyy-MM-dd');
      return dropDate === day.dateString;
    });
    setSelectedDrop(dropForDay || null);
  };

  const getDropsCountForMonth = () => {
    return drops.filter((drop) => {
      const dropMonth = format(parseISO(drop.created_at), 'yyyy-MM');
      return dropMonth === currentMonth;
    }).length;
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Chargement..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Calendrier</Text>
        <View style={[styles.streakBadge, { backgroundColor: theme.streakMuted }]}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={[styles.streakCount, { color: theme.streak }]}>{user?.streak || 0}</Text>
        </View>
      </View>

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
        <View style={[styles.statsCard, { backgroundColor: theme.card }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{drops.length}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Drops</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{getDropsCountForMonth()}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Ce mois</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <View style={styles.streakValue}>
              <Text style={styles.fireEmoji}>🔥</Text>
              <Text style={[styles.statValue, { color: theme.streak }]}>{user?.streak || 0}</Text>
            </View>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Streak</Text>
          </View>
        </View>

        <View style={[styles.calendarContainer, { backgroundColor: theme.card }]}>
          <Calendar
            onDayPress={handleDayPress}
            onMonthChange={(month) => setCurrentMonth(format(new Date(month.dateString), 'yyyy-MM'))}
            markedDates={getMarkedDates()}
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: 'transparent',
              textSectionTitleColor: theme.textSecondary,
              selectedDayBackgroundColor: theme.primary,
              selectedDayTextColor: '#ffffff',
              todayTextColor: theme.primary,
              dayTextColor: theme.text,
              textDisabledColor: theme.textTertiary,
              dotColor: theme.primary,
              selectedDotColor: '#ffffff',
              arrowColor: theme.primary,
              monthTextColor: theme.text,
              textDayFontWeight: '500',
              textMonthFontWeight: '700',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 15,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 13,
            }}
            style={styles.calendar}
          />
        </View>

        {selectedDrop ? (
          <TouchableOpacity
            style={[styles.selectedDropCard, { backgroundColor: theme.card }]}
            onPress={() => router.push(`/drop/${selectedDrop.id}`)}
            activeOpacity={0.8}
          >
            <View style={styles.selectedDropHeader}>
              <Text style={[styles.selectedDropDate, { color: theme.textSecondary }]}>
                {selectedDate && format(parseISO(selectedDate), 'EEEE d MMMM', { locale: fr })}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
            </View>
            <View style={styles.selectedDropContent}>
              {selectedDrop.is_revealed && selectedDrop.media_data ? (
                <Image
                  source={{
                    uri: selectedDrop.media_data.startsWith('data:')
                      ? selectedDrop.media_data
                      : `data:image/jpeg;base64,${selectedDrop.media_data}`,
                  }}
                  style={styles.selectedDropImage}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={[theme.surfaceVariant, theme.surface]}
                  style={styles.selectedDropImageLocked}
                >
                  <Ionicons name="lock-closed" size={24} color={theme.primary} />
                </LinearGradient>
              )}
              <View style={styles.selectedDropInfo}>
                <Text style={[styles.selectedDropTitle, { color: theme.text }]}>
                  {selectedDrop.is_revealed ? 'Drop révélé' : 'Drop verrouillé'}
                </Text>
                {selectedDrop.description ? (
                  <Text 
                    style={[styles.selectedDropDescription, { color: theme.textSecondary }]}
                    numberOfLines={2}
                  >
                    {selectedDrop.description}
                  </Text>
                ) : null}
                <View style={styles.selectedDropStats}>
                  <View style={styles.statBadge}>
                    <Ionicons name="heart" size={14} color={theme.like} />
                    <Text style={[styles.statBadgeText, { color: theme.textSecondary }]}>
                      {selectedDrop.likes_count}
                    </Text>
                  </View>
                  <View style={styles.statBadge}>
                    <Ionicons name="chatbubble" size={14} color={theme.primary} />
                    <Text style={[styles.statBadgeText, { color: theme.textSecondary }]}>
                      {selectedDrop.comments_count}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ) : selectedDate ? (
          <View style={[styles.noDropCard, { backgroundColor: theme.card }]}>
            <Ionicons name="calendar-outline" size={32} color={theme.textTertiary} />
            <Text style={[styles.noDropText, { color: theme.textSecondary }]}>
              Aucun Drop ce jour
            </Text>
          </View>
        ) : null}

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>Drop posté</Text>
          </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  streakEmoji: {
    fontSize: 16,
  },
  streakCount: {
    fontSize: 16,
    fontWeight: '700',
  },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: '100%',
    marginHorizontal: 16,
  },
  streakValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fireEmoji: {
    fontSize: 20,
    marginRight: 4,
  },
  calendarContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 12,
  },
  calendar: {
    borderRadius: 16,
  },
  selectedDropCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
  },
  selectedDropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedDropDate: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  selectedDropContent: {
    flexDirection: 'row',
  },
  selectedDropImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  selectedDropImageLocked: {
    width: 80,
    height: 80,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDropInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  selectedDropTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  selectedDropDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  selectedDropStats: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statBadgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  noDropCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  noDropText: {
    fontSize: 14,
    marginTop: 8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 13,
  },
});
