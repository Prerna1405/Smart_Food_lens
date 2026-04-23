import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
} from 'react-native';

import { Calendar, DateData } from 'react-native-calendars';
import { LineChart } from 'react-native-chart-kit';
import moment from 'moment';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Shadows, Spacing, BorderRadius, Typography } from '../../constants/theme';
import Animated, { FadeInUp, ZoomIn, Easing, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

import Constants from 'expo-constants';

const { width } = Dimensions.get('window');
const API_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:8000';
const EasingCurve = Easing.bezier(0.4, 0.0, 0.2, 1);

const CalendarRecipeScreen = () => {
  const router = useRouter();
  const { date } = useLocalSearchParams();
  const [selectedDate, setSelectedDate] = useState((date as string) || moment().format('YYYY-MM-DD'));
  const [rangeData, setRangeData] = useState<{[key: string]: { calories: number; protein: number; carbs: number; fat: number }}>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/scans/range?end=${selectedDate}&days=60`);
        const json = await res.json();
        setRangeData(json.data || {});
      } catch {
        setRangeData({});
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedDate]);

  const markedDates = useMemo(() => {
    const marks: any = {};
    Object.keys(rangeData).forEach((date) => {
      const totals = rangeData[date];
      if (totals && totals.calories > 0) {
        marks[date] = { marked: true, dotColor: Colors.light.primary };
      }
    });
    
    marks[selectedDate] = {
      ...(marks[selectedDate] || {}),
      selected: true,
      selectedColor: Colors.light.primary,
      selectedTextColor: '#ffffff',
    };
    return marks;
  }, [selectedDate, rangeData]);

  const selectedData = rangeData[selectedDate] || { calories: 0, protein: 0, carbs: 0, fat: 0 };

  const graphData = useMemo(() => {
    const labels = [];
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = moment(selectedDate).subtract(i, 'days');
      labels.push(d.format('DD'));
      const dayData = rangeData[d.format('YYYY-MM-DD')];
      data.push(dayData ? Math.round(dayData.calories) : 0);
    }
    return {
      labels,
      datasets: [{ data }],
    };
  }, [selectedDate, rangeData]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Insights</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* CALENDAR CARD */}
        <Animated.View entering={ZoomIn.duration(600)} style={styles.calendarCard}>
          <Calendar
            current={selectedDate}
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              backgroundColor: '#fff',
              calendarBackground: '#fff',
              textSectionTitleColor: Colors.light.textSecondary,
              selectedDayBackgroundColor: Colors.light.primary,
              selectedDayTextColor: '#ffffff',
              todayTextColor: Colors.light.primary,
              dayTextColor: Colors.light.text,
              textDisabledColor: '#CBD5E1',
              dotColor: Colors.light.primary,
              selectedDotColor: '#ffffff',
              arrowColor: Colors.light.primary,
              monthTextColor: Colors.light.text,
              textDayFontFamily: Typography.family.rounded,
              textMonthFontFamily: Typography.family.rounded,
              textDayHeaderFontFamily: Typography.family.rounded,
              textDayFontWeight: '600',
              textMonthFontWeight: '800',
              textDayHeaderFontWeight: '700',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 12
            }}
          />
        </Animated.View>

        {/* DAILY SUMMARY */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{moment(selectedDate).format('MMMM Do, YYYY')}</Text>
        </View>

        {selectedData.calories > 0 ? (
          <View style={styles.statsGrid}>
            <SummaryCard label="Calories" value={selectedData.calories} unit="kcal" icon="flame" color={Colors.light.calories} delay={200} />
            <SummaryCard label="Protein" value={selectedData.protein} unit="g" icon="fitness" color={Colors.light.protein} delay={300} />
            <SummaryCard label="Carbs" value={selectedData.carbs} unit="g" icon="leaf" color={Colors.light.carbs} delay={400} />
            <SummaryCard label="Fat" value={selectedData.fat} unit="g" icon="water" color={Colors.light.fat} delay={500} />
          </View>
        ) : (
          <View style={styles.noDataCard}>
            <LinearGradient colors={['#F1F5F9', '#E2E8F0'] as any} style={styles.noDataGradient}>
              <Ionicons name="calendar-outline" size={48} color={Colors.light.textSecondary} />
              <Text style={styles.noDataText}>No records found for this day</Text>
              <TouchableOpacity style={styles.logNowBtn} onPress={() => router.push('/scan' as any)}>
                <Text style={styles.logNowText}>Log a Meal Now</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* CHART SECTION */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Calorie Trend (Last 7 Days)</Text>
        </View>
        <Animated.View entering={FadeInUp.duration(600).delay(600)} style={styles.chartCard}>
          <LineChart
            data={graphData}
            width={width - (Spacing.xl * 2) - 40}
            height={220}
            chartConfig={{
              backgroundColor: '#fff',
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: "4", strokeWidth: "2", stroke: Colors.light.primary },
              propsForBackgroundLines: { strokeDasharray: "5", stroke: '#F1F5F9' }
            }}
            bezier
            style={styles.chart}
          />
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const SummaryCard = ({ label, value, unit, icon, color, delay }: any) => (
  <Animated.View entering={FadeInDown.duration(500).delay(delay)} style={styles.statCard}>
    <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <View style={styles.statInfo}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{Math.round(value)}</Text>
        <Text style={styles.statUnit}>{unit}</Text>
      </View>
    </View>
  </Animated.View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 15,
    backgroundColor: '#fff',
    ...Shadows.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.black as any,
    color: Colors.light.text,
    fontFamily: Typography.family.rounded,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  calendarCard: {
    backgroundColor: '#fff',
    margin: Spacing.xl,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.sm,
    ...Shadows.md,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.xl,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.black as any,
    color: Colors.light.text,
    fontFamily: Typography.family.rounded,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 30,
  },
  statCard: {
    width: (width - (Spacing.xl * 2) - 12) / 2,
    backgroundColor: '#fff',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.sm,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statInfo: {
    marginLeft: 12,
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weight.bold as any,
    textTransform: 'uppercase',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  statValue: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.black as any,
    color: Colors.light.text,
  },
  statUnit: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weight.bold as any,
  },
  noDataCard: {
    marginHorizontal: Spacing.xl,
    height: 200,
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    marginBottom: 30,
    ...Shadows.sm,
  },
  noDataGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  noDataText: {
    marginTop: 15,
    fontSize: Typography.size.md,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weight.semibold as any,
    textAlign: 'center',
  },
  logNowBtn: {
    marginTop: 20,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    ...Shadows.md,
  },
  logNowText: {
    color: '#fff',
    fontWeight: Typography.weight.bold as any,
    fontSize: Typography.size.sm,
  },
  chartCard: {
    backgroundColor: '#fff',
    marginHorizontal: Spacing.xl,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xxl,
    ...Shadows.md,
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
    marginTop: 10,
  },
});

export default CalendarRecipeScreen;
