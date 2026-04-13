import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  ImageBackground,
  RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import moment from 'moment';
import axios from 'axios';
import { useUser } from '../../components/context/UserContext';
import { useRouter } from 'expo-router';
import { Colors, Shadows, BorderRadius, Spacing } from '../../constants/theme';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp, FadeInRight, Layout } from 'react-native-reanimated';
import { Svg, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

const CircularProgress = ({ size, strokeWidth, progress, label, value, color }: any) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          stroke="#E2E8F0"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.progressTextContainer}>
        <Text style={styles.progressValue}>{value}</Text>
        <Text style={styles.progressLabel}>{label}</Text>
      </View>
    </View>
  );
};

const HomeScreen = () => {
  const router = useRouter();
  const { todayTotals, todayScans, isLoading, refreshData } = useUser();
  const [lastThreeDaysData, setLastThreeDaysData] = useState<any[]>([]);
  const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

  const dailyGoal = 2000;
  const progress = Math.min((todayTotals.calories / dailyGoal) * 100, 100);

  useEffect(() => {
    (async () => {
      try {
        const response = await axios.get(`${API_URL}/api/scans/last-three-days`, {
          timeout: 4000,
        });
        setLastThreeDaysData(response.data.scans || []);
      } catch {
        setLastThreeDaysData([]);
      }
    })();
  }, [API_URL]);

  const lastSevenDays = Array.from({ length: 7 }).map((_, i) =>
    moment().subtract(6 - i, 'days')
  );

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?q=80&w=1000&auto=format&fit=crop' }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
      </ImageBackground>

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refreshData} tintColor="#fff" />}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Hello, Healthy Eater!</Text>
              <Text style={styles.title}>NutriScan Dashboard</Text>
            </View>
            <TouchableOpacity style={styles.notificationBtn}>
              <Ionicons name="notifications-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* MAIN PROGRESS CARD */}
          <Animated.View entering={FadeInUp.delay(200)} style={styles.mainCard}>
            <View style={styles.progressRow}>
              <CircularProgress
                size={140}
                strokeWidth={12}
                progress={progress}
                value={Math.round(todayTotals.calories)}
                label="kcal"
                color={Colors.light.calories}
              />
              <View style={styles.goalInfo}>
                <Text style={styles.goalTitle}>Daily Goal</Text>
                <Text style={styles.goalValue}>{dailyGoal} kcal</Text>
                <View style={styles.remainingBadge}>
                  <Text style={styles.remainingText}>
                    {Math.max(0, dailyGoal - Math.round(todayTotals.calories))} kcal left
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.macrosRow}>
              <MacroItem label="Protein" value={todayTotals.protein} target={150} color={Colors.light.protein} unit="g" />
              <MacroItem label="Carbs" value={todayTotals.carbs} target={250} color={Colors.light.carbs} unit="g" />
              <MacroItem label="Fat" value={todayTotals.fat} target={70} color={Colors.light.fat} unit="g" />
            </View>
          </Animated.View>

          {/* WEEKLY TRACKER */}
          <Text style={styles.sectionTitle}>This Week</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.calendarScroll}>
            {lastSevenDays.map((day, i) => {
              const isToday = day.isSame(moment(), 'day');
              return (
                <Animated.View key={i} entering={FadeInRight.delay(300 + i * 50)}>
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: '/calendar' as any, params: { date: day.format('YYYY-MM-DD') } })}
                    style={[styles.calendarDay, isToday && styles.calendarToday]}
                  >
                    <Text style={[styles.calendarSub, isToday && styles.calendarTodayText]}>{day.format('ddd')}</Text>
                    <Text style={[styles.calendarText, isToday && styles.calendarTodayText]}>{day.format('DD')}</Text>
                    {isToday && <View style={styles.todayDot} />}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </ScrollView>

          {/* TODAY'S MEALS */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Meals</Text>
            <TouchableOpacity onPress={() => router.push('/scan' as any)}>
              <Text style={styles.seeAll}>Add Meal</Text>
            </TouchableOpacity>
          </View>

          {todayScans.length > 0 ? (
            todayScans.map((scan, index) => (
              <Animated.View key={index} entering={FadeInUp.delay(400 + index * 100)} layout={Layout.springify()}>
                <TouchableOpacity style={styles.mealCard}>
                  <View style={[styles.mealIcon, { backgroundColor: Colors.light.primaryLight }]}>
                    <Ionicons name="restaurant" size={20} color={Colors.light.primary} />
                  </View>
                  <View style={styles.mealInfo}>
                    <Text style={styles.mealName}>
                      {scan.foodItems.map(item => item.food).join(', ') || 'Custom Meal'}
                    </Text>
                    <Text style={styles.mealTime}>{moment(scan.timestamp).format('h:mm A')}</Text>
                  </View>
                  <Text style={styles.mealCalories}>
                    {Math.round(scan.foodItems.reduce((sum, item) => sum + item.nutrients.calories, 0))} kcal
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="cafe-outline" size={48} color="rgba(255,255,255,0.5)" />
              <Text style={styles.emptyText}>No meals tracked today yet.</Text>
            </View>
          )}

          {/* HISTORY */}
          <Text style={styles.sectionTitle}>Recent History</Text>
          {lastThreeDaysData.map((day, index) => {
            if (moment(day.date).isSame(moment(), 'day')) return null;
            
            const dayCalories = day.scans.reduce((sum: number, scan: any) => 
              sum + scan.foodItems.reduce((s: number, i: any) => s + (i.nutrients?.calories || 0), 0), 0
            );

            return (
              <Animated.View key={index} entering={FadeInUp.delay(600 + index * 100)}>
                <View style={styles.historyCard}>
                  <View>
                    <Text style={styles.historyDate}>{moment(day.date).format('MMMM D')}</Text>
                    <Text style={styles.historyCount}>{day.scans.length} meals</Text>
                  </View>
                  <Text style={styles.historyValue}>{Math.round(dayCalories)} kcal</Text>
                </View>
              </Animated.View>
            );
          })}
        </ScrollView>

        {/* FLOATING ACTION BUTTON */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/scan' as any)}
          activeOpacity={0.8}
        >
          <BlurView intensity={80} tint="light" style={styles.fabBlur}>
            <Ionicons name="camera" size={28} color={Colors.light.primary} />
          </BlurView>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};

const MacroItem = ({ label, value, target, color, unit }: any) => (
  <View style={styles.macroItem}>
    <View style={styles.macroHeader}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>{Math.round(value)}{unit}</Text>
    </View>
    <View style={styles.macroBarBg}>
      <View style={[styles.macroBarFill, { width: `${Math.min((value / target) * 100, 100)}%`, backgroundColor: color }]} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    padding: Spacing.md,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
  },
  greeting: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.lg,
    marginBottom: Spacing.lg,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
  },
  progressTextContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.light.text,
  },
  progressLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  goalInfo: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  goalTitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  goalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginVertical: 4,
  },
  remainingBadge: {
    backgroundColor: Colors.light.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  remainingText: {
    color: Colors.light.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: Spacing.md,
  },
  macroItem: {
    width: '30%',
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  macroValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.text,
  },
  macroBarBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: Spacing.md,
  },
  seeAll: {
    color: Colors.light.primaryLight,
    fontWeight: '600',
  },
  calendarScroll: {
    marginBottom: Spacing.md,
  },
  calendarDay: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    width: 50,
    height: 70,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  calendarToday: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  calendarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  calendarSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  calendarTodayText: {
    color: '#fff',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
    marginTop: 4,
  },
  mealCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.md,
  },
  mealIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    textTransform: 'capitalize',
  },
  mealTime: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  mealCalories: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
  },
  historyCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  historyDate: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  historyCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  historyValue: {
    color: Colors.light.warning,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: Spacing.md,
    fontSize: 14,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  fabBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeScreen;
