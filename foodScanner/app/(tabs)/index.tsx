import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import moment from 'moment';
import axios from 'axios';
import { useUser } from '../../components/context/UserContext';
import { useRouter } from 'expo-router';
import { Colors, Shadows, Spacing, BorderRadius, Typography } from '../../constants/theme';
import Animated, { 
  FadeInUp, 
  FadeInRight, 
  ZoomIn, 
  Easing,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withSequence,
  withDelay,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, sendLocalNotification } from '../../utils/notifications';
import { useLanguage } from '../../components/context/LanguageContext';

import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');
const EasingCurve = Easing.bezier(0.4, 0.0, 0.2, 1);
const API_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:8000';

const HomeScreen = () => {
  const router = useRouter();
  const { todayTotals, userProfile, waterIntake, setWaterIntake } = useUser();
  const { t } = useLanguage();
  const [lastThreeDaysData, setLastThreeDaysData] = useState<any[]>([]);
  const [notificationCount, setNotificationCount] = useState(3);
  const [showWaterModal, setShowWaterModal] = useState(false);
  const [waterAmount, setWaterAmount] = useState('0');
  const [dynamicInsights, setDynamicInsights] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    registerForPushNotificationsAsync();
    
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      setNotificationCount(prev => prev + 1);
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`${API_URL}/api/scans/last-three-days`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setLastThreeDaysData(data.scans || []);
      } catch (error) {
        setLastThreeDaysData([]);
      }
    })();
  }, [API_URL]);

  useEffect(() => {
    if (userProfile) {
      fetchAIInsights();
    }
  }, [userProfile, todayTotals]);

  const fetchAIInsights = async () => {
    try {
      const response = await fetch(`${API_URL}/api/ai/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: userProfile,
          today_totals: todayTotals
        })
      });
      const data = await response.json();
      if (data.insights) setDynamicInsights(data.insights);
      if (data.metrics) setMetrics(data.metrics);
    } catch (error) {
      console.error("Insights Error:", error);
    }
  };

  const fetchHealthReport = async () => {
    setReportLoading(true);
    setShowReport(true);
    try {
      const response = await fetch(`${API_URL}/api/ai/health-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: userProfile,
          scans: lastThreeDaysData
        })
      });
      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error("Report Error:", error);
    } finally {
      setReportLoading(false);
    }
  };

  const lastSevenDays = useMemo(() => 
    Array.from({ length: 7 }).map((_, i) => moment().subtract(6 - i, 'days')),
    []
  );

  const targetCalories = metrics?.target_calories || 2200;
  const progressPercent = Math.min(100, Math.round((todayTotals.calories / targetCalories) * 100));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* Background Glows */}
      <View style={styles.glowContainer}>
        <View style={[styles.glow, { top: -100, left: -100, backgroundColor: Colors.light.glowPrimary }]} />
        <View style={[styles.glow, { top: height * 0.4, right: -150, backgroundColor: Colors.light.glowSecondary }]} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        {/* HEADER */}
        <View style={styles.headerWrapper}>
          <Animated.View 
            entering={FadeInUp.duration(600).easing(EasingCurve)} 
            style={styles.header}
          >
            <View>
              <Text style={styles.greeting}>{t('greeting')}</Text>
              <Text style={styles.title}>{t('title')}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.notificationBtn} 
                onPress={() => {
                  setNotificationCount(0);
                  sendLocalNotification("Daily Reminder", "Don't forget to log your breakfast!");
                }}
              >
                <Ionicons name="notifications-outline" size={24} color={Colors.light.text} />
                {notificationCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{notificationCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/ProfileScreen' as any)}>
                <LinearGradient
                  colors={Colors.light.primaryGradient as any}
                  style={styles.avatarGradient}
                >
                  <Ionicons name="person" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>

        {/* SUMMARY CARD */}
        <Animated.View 
          entering={ZoomIn.duration(800).delay(200)}
          style={styles.mainCard}
        >
          <LinearGradient
            colors={Colors.light.primaryGradient as any}
            style={styles.mainCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.mainCardContent}>
              <View>
                <Text style={styles.mainCardLabel}>{t('dailyGoal')}</Text>
                <Text style={styles.mainCardValue}>{Math.round(todayTotals.calories)} / {targetCalories}</Text>
                <Text style={styles.mainCardSub}>{t('consumed')}</Text>
              </View>
              <TouchableOpacity style={styles.progressCircle} onPress={fetchHealthReport}>
                <Text style={styles.progressText}>
                  {progressPercent}%
                </Text>
                <Text style={{ fontSize: 8, color: '#fff', fontWeight: 'bold' }}>REPORT</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* AI INSIGHTS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('insights')}</Text>
          <LinearGradient colors={['#8B5CF6', '#6366F1'] as any} style={styles.aiBadge}>
            <Ionicons name="sparkles" size={12} color="#fff" />
            <Text style={styles.aiBadgeText}>AI DYNAMIC</Text>
          </LinearGradient>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.insightsScroll}
        >
          {dynamicInsights.length > 0 ? (
            dynamicInsights.map((insight, index) => (
              <InsightCard key={insight.id} insight={insight} index={index} />
            ))
          ) : (
            [1, 2].map(i => <View key={i} style={[styles.insightCard, { opacity: 0.5, backgroundColor: '#eee' }]} />)
          )}
        </ScrollView>

        {/* STATS GRID */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('nutrition')}</Text>
        </View>
        <View style={styles.statsGrid}>
          <StatCard 
            label={t('protein')} 
            value={Math.round(todayTotals.protein)} 
            unit={`/ ${metrics?.target_protein || 120}g`} 
            icon="fitness" 
            colors={Colors.light.proteinGradient} 
            delay={400} 
          />
          <StatCard 
            label={t('carbs')} 
            value={Math.round(todayTotals.carbs)} 
            unit="g" 
            icon="leaf" 
            colors={Colors.light.carbsGradient} 
            delay={500} 
          />
          <StatCard 
            label={t('fat')} 
            value={Math.round(todayTotals.fat)} 
            unit="g" 
            icon="water" 
            colors={Colors.light.fatGradient} 
            delay={600} 
          />
          <TouchableOpacity onPress={() => {
            setWaterAmount(waterIntake.toString());
            setShowWaterModal(true);
          }}>
            <StatCard 
              label={t('water')} 
              value={waterIntake.toFixed(1)} 
              unit={`/ ${metrics?.water_goal || 2.5}L`} 
              icon="beaker" 
              colors={['#0EA5E9', '#0284C7']} 
              delay={700} 
            />
          </TouchableOpacity>
        </View>

        {/* WATER MODAL */}
        <Modal visible={showWaterModal} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <Animated.View entering={ZoomIn} style={styles.waterModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Track Water</Text>
                <TouchableOpacity onPress={() => setShowWaterModal(false)}>
                  <Ionicons name="close" size={24} color={Colors.light.text} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSub}>Daily Goal: {metrics?.water_goal || 2.5}L</Text>
              
              <View style={styles.waterProgressContainer}>
                <View style={styles.waterProgressOuter}>
                   <View style={[styles.waterProgressInner, { height: `${Math.min(100, (waterIntake / (metrics?.water_goal || 2.5)) * 100)}%` }]} />
                   <Ionicons name="water" size={40} color="#fff" style={styles.waterIconOverlay} />
                </View>
                <Text style={styles.waterPercentText}>{Math.round((waterIntake / (metrics?.water_goal || 2.5)) * 100)}%</Text>
              </View>

              <View style={styles.waterInputRow}>
                <TextInput 
                  style={styles.waterInput} 
                  value={waterAmount} 
                  onChangeText={setWaterAmount}
                  keyboardType="numeric"
                />
                <Text style={styles.waterUnitText}>Liters</Text>
              </View>
              <View style={styles.quickAddRow}>
                {[0.25, 0.5, 1.0].map(val => (
                  <TouchableOpacity 
                    key={val} 
                    style={styles.quickAddBtn}
                    onPress={() => {
                      const newTotal = waterIntake + val;
                      setWaterIntake(newTotal);
                      setWaterAmount(newTotal.toFixed(2));
                    }}
                  >
                    <Text style={styles.quickAddText}>+{val}L</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity 
                style={styles.saveBtn}
                onPress={() => {
                  setWaterIntake(parseFloat(waterAmount) || 0);
                  setShowWaterModal(false);
                  sendLocalNotification("Hydration Tracked", "Great progress! Keep drinking water.");
                }}
              >
                <LinearGradient colors={['#0EA5E9', '#0284C7'] as any} style={styles.saveGradient}>
                  <Text style={styles.saveText}>Save Progress</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

        {/* HEALTH REPORT MODAL */}
        <Modal visible={showReport} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
             <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
             <Animated.View entering={FadeInUp} style={styles.reportModal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>AI Health Report</Text>
                  <TouchableOpacity onPress={() => setShowReport(false)}>
                    <Ionicons name="close" size={24} color={Colors.light.text} />
                  </TouchableOpacity>
                </View>
                
                {reportLoading ? (
                  <View style={styles.reportLoader}>
                    <ActivityIndicator size="large" color={Colors.light.primary} />
                    <Text style={styles.loadingText}>Generating your personalized report...</Text>
                  </View>
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={styles.reportSummary}>{reportData?.summary}</Text>
                    {reportData?.sections?.map((section: any, idx: number) => (
                      <View key={idx} style={styles.reportSection}>
                        <View style={styles.sectionTitleRow}>
                           <Ionicons 
                            name={section.status === 'good' ? 'checkmark-circle' : section.status === 'warning' ? 'warning' : 'bulb'} 
                            size={20} 
                            color={section.status === 'good' ? '#10B981' : section.status === 'warning' ? '#F59E0B' : '#6366F1'} 
                           />
                           <Text style={styles.reportSectionTitle}>{section.title}</Text>
                        </View>
                        <Text style={styles.reportSectionContent}>{section.content}</Text>
                      </View>
                    ))}
                    <TouchableOpacity style={styles.shareReportBtn}>
                      <Text style={styles.shareReportText}>Share Report</Text>
                    </TouchableOpacity>
                  </ScrollView>
                )}
             </Animated.View>
          </View>
        </Modal>

        {/* QUICK ACTIONS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('quickActions')}</Text>
        </View>
        <View style={styles.actionsRow}>
          <QuickAction 
            title={t('scanFood')} 
            icon="camera" 
            color="#6366F1" 
            onPress={() => router.push('/scan' as any)} 
            delay={800}
          />
          <QuickAction 
            title={t('chef')} 
            icon="restaurant" 
            color="#10B981" 
            onPress={() => router.push('/chef' as any)} 
            delay={900}
          />
          <QuickAction 
            title={t('analytics')} 
            icon="bar-chart" 
            color="#F59E0B" 
            onPress={() => {}} 
            delay={1000}
          />
        </View>

        {/* WEEKLY OVERVIEW */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('weeklyActivity')}</Text>
          <TouchableOpacity onPress={() => router.push('/calendar-recipe' as any)}>
            <Text style={styles.seeAll}>{t('seeAll')}</Text>
          </TouchableOpacity>
        </View>
        <Animated.View 
          entering={FadeInUp.duration(600).delay(1100)} 
          style={styles.calendarRow}
        >
          {lastSevenDays.map((day, i) => {
            const isToday = day.isSame(moment(), 'day');
            return (
              <TouchableOpacity
                key={i}
                onPress={() => router.push({ pathname: '/calendar-recipe' as any, params: { date: day.format('YYYY-MM-DD') } })}
                style={[
                  styles.calendarDay,
                  isToday && styles.calendarToday,
                ]}>
                <Text style={[styles.calendarSub, isToday && styles.calendarTextActive]}>{day.format('ddd')}</Text>
                <Text style={[styles.calendarText, isToday && styles.calendarTextActive]}>{day.format('DD')}</Text>
                {isToday && <View style={styles.todayDot} />}
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* RECENT HISTORY */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('recentHistory')}</Text>
        </View>
        {lastThreeDaysData.length > 0 ? (
          lastThreeDaysData.map((day, index) => {
            const calories = day.scans.reduce(
              (sum: number, scan: any) =>
                sum +
                scan.foodItems.reduce(
                  (s: number, i: any) => s + (i.nutrients?.calories || 0),
                  0
                ),
              0
            );

            return (
              <HistoryCard 
                key={index}
                date={day.date}
                calories={calories}
                index={index}
              />
            );
          })
        ) : (
          <View style={styles.emptyHistory}>
            <Ionicons name="calendar-outline" size={48} color={Colors.light.border} />
            <Text style={styles.emptyText}>No recent activity found</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

/* ---------------- SMALL COMPONENTS ---------------- */

const StatCard = ({ label, value, unit, icon, colors, delay }: any) => (
  <Animated.View 
    entering={ZoomIn.duration(600).delay(delay)} 
    style={styles.statCard}
  >
    <LinearGradient
      colors={[...colors, colors[0]] as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.statIconGradient}
    >
      <Ionicons name={icon} size={20} color="#fff" />
    </LinearGradient>
    <View style={styles.statInfo}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statUnit}>{unit}</Text>
      </View>
    </View>
  </Animated.View>
);

const InsightCard = ({ insight, index }: any) => (
  <Animated.View 
    entering={FadeInRight.duration(600).delay(300 + (index * 100))}
    style={styles.insightCard}
  >
    <View style={[styles.insightIcon, { backgroundColor: insight.color + '15' }]}>
      <Ionicons name={insight.icon} size={24} color={insight.color} />
    </View>
    <View style={styles.insightInfo}>
      <Text style={styles.insightTitle}>{insight.title}</Text>
      <Text style={styles.insightText}>{insight.text}</Text>
    </View>
  </Animated.View>
);

const QuickAction = ({ title, icon, color, onPress, delay }: any) => (
  <Animated.View entering={FadeInRight.duration(500).delay(delay)}>
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
    </TouchableOpacity>
  </Animated.View>
);

const HistoryCard = ({ date, calories, index }: any) => (
  <Animated.View 
    entering={FadeInUp.duration(600).delay(1200 + (index * 100))}
    style={styles.historyCard}
  >
    <View style={styles.historyInfo}>
      <View style={styles.historyIcon}>
        <Ionicons name="time-outline" size={20} color={Colors.light.primary} />
      </View>
      <View>
        <Text style={styles.historyDate}>
          {moment(date).format('MMMM D, YYYY')}
        </Text>
        <Text style={styles.historySubText}>Daily Intake</Text>
      </View>
    </View>
    <View style={styles.historyValueContainer}>
      <Text style={styles.historyValue}>{Math.round(calories)}</Text>
      <Text style={styles.historyUnit}>kcal</Text>
    </View>
  </Animated.View>
);

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    opacity: 0.5,
    filter: 'blur(100px)', // For web, for native we'll use a different approach or just ignore the filter property if not supported
  },
  container: {
    paddingBottom: 100,
  },
  headerWrapper: {
    backgroundColor: Colors.light.background,
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 10 : 40,
    paddingBottom: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.light.error,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.light.surface,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  greeting: {
    color: Colors.light.textSecondary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold as any,
    fontFamily: Typography.family.rounded,
  },
  title: {
    color: Colors.light.text,
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.black as any,
    fontFamily: Typography.family.rounded,
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    ...Shadows.md,
  },
  avatarGradient: {
    flex: 1,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainCard: {
    margin: Spacing.xl,
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    ...Shadows.premium,
  },
  mainCardGradient: {
    padding: Spacing.xxl,
  },
  mainCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mainCardLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold as any,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mainCardValue: {
    color: '#fff',
    fontSize: Typography.size.xxxl,
    fontWeight: Typography.weight.black as any,
    marginVertical: 4,
  },
  mainCardSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium as any,
  },
  progressCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  progressText: {
    color: '#fff',
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold as any,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 5,
    ...Shadows.sm,
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  insightsScroll: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 10,
    gap: 15,
  },
  insightCard: {
    width: 260,
    backgroundColor: '#fff',    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    ...Shadows.sm,
  },
  insightIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightInfo: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 2,
  },
  insightText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.black as any,    color: Colors.light.text,
    fontFamily: Typography.family.rounded,
  },
  seeAll: {
    color: Colors.light.primary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold as any,
  },
  statsGrid: {
    flexDirection: 'row',    flexWrap: 'wrap',    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between',
    gap: 15,
  },
  statCard: {
    width: (width - (Spacing.xl * 2) - 15) / 2,
    backgroundColor: '#fff',    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.sm,
  },
  statIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statInfo: {
    marginLeft: 12,
    flex: 1,
  },
  statLabel: {
    color: Colors.light.textSecondary,
    fontSize: 10,
    fontWeight: Typography.weight.bold as any,
    textTransform: 'uppercase',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  statValue: {
    color: Colors.light.text,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.black as any,
  },
  statUnit: {
    color: Colors.light.textSecondary,
    fontSize: 10,
    fontWeight: Typography.weight.bold as any,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionBtn: {
    alignItems: 'center',
    width: (width - (Spacing.xl * 2)) / 3.5,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    ...Shadows.sm,
  },
  actionTitle: {
    color: Colors.light.text,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold as any,
    textAlign: 'center',
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.xl,
    marginBottom: 25,
    backgroundColor: Colors.light.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.xxl,
    ...Shadows.sm,
  },
  calendarDay: {
    width: (width - (Spacing.xl * 2) - (Spacing.md * 2)) / 8,
    height: 60,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  calendarToday: {
    backgroundColor: Colors.light.primaryLight,
  },
  calendarText: {
    color: Colors.light.text,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold as any,
  },
  calendarSub: {
    color: Colors.light.textSecondary,
    fontSize: 10,
    fontWeight: Typography.weight.bold as any,
    textTransform: 'uppercase',
  },
  calendarTextActive: {
    color: Colors.light.primary,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.primary,
  },
  historyCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginHorizontal: Spacing.xl,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadows.sm,
  },
  historyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  historyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyDate: {
    color: Colors.light.text,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold as any,
  },
  historySubText: {
    color: Colors.light.textSecondary,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium as any,
  },
  historyValueContainer: {
    alignItems: 'flex-end',
  },
  historyValue: {
    color: Colors.light.primary,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.black as any,
  },
  historyUnit: {
    color: Colors.light.textSecondary,
    fontSize: 10,
    fontWeight: Typography.weight.bold as any,
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  waterModal: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 24,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.light.text,
  },
  modalSub: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 24,
  },
  waterInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.surfaceSecondary,
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
  },
  waterInput: {
    fontSize: 48,
    fontWeight: '900',
    color: '#0EA5E9',
    textAlign: 'center',
    padding: 0,
    minWidth: 100,
  },
  waterUnitText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    marginLeft: 10,
    marginTop: 15,
  },
  quickAddRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickAddBtn: {
    flex: 1,
    backgroundColor: Colors.light.surfaceSecondary,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  quickAddText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0EA5E9',
  },
  saveBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    ...Shadows.md,
  },
  saveGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  emptyHistory: {
    alignItems: 'center',
    padding: Spacing.huge,
    opacity: 0.5,
  },
  emptyText: {
    marginTop: 10,
    color: Colors.light.textSecondary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium as any,
  },
  waterProgressContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  waterProgressOuter: {
    width: 80,
    height: 120,
    backgroundColor: '#E0F2FE',
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  waterProgressInner: {
    width: '100%',
    backgroundColor: '#0EA5E9',
  },
  waterIconOverlay: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
  },
  waterPercentText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '900',
    color: '#0EA5E9',
  },
  reportModal: {
    width: '95%',
    height: '80%',
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 24,
    ...Shadows.lg,
  },
  reportLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  loadingText: {
    color: Colors.light.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  reportSummary: {
    fontSize: 18, 
    fontWeight: '700',
    color: Colors.light.text,
    lineHeight: 26,
    marginBottom: 24,
  },
  reportSection: {
    backgroundColor: Colors.light.surfaceSecondary,
    padding: 16, 
    borderRadius: 20,
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  reportSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
  },
  reportSectionContent: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  shareReportBtn: {
    backgroundColor: Colors.light.primary,
    padding: 18,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  shareReportText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
});

export default HomeScreen;
