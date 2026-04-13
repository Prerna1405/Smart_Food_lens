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
  ImageBackground,
} from 'react-native';

import { Calendar, DateData } from 'react-native-calendars';
import { LineChart, BarChart } from 'react-native-chart-kit';
import moment from 'moment';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { Colors, Shadows, BorderRadius, Spacing } from '../../constants/theme';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp } from 'react-native-reanimated';

const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
const { width } = Dimensions.get('window');

const CalendarScreen = () => {
  const { date } = useLocalSearchParams();
  const [selectedDate, setSelectedDate] = useState((date as string) || moment().format('YYYY-MM-DD'));
  const [rangeData, setRangeData] = useState<{[key: string]: { calories: number; protein: number; carbs: number; fat: number }}>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/scans/range?end=${selectedDate}&days=60`);
        const json = await res.json();
        setRangeData(json.data || {});
      } catch {
        setRangeData({});
      }
    })();
  }, [selectedDate]);

  const markedDates = useMemo(() => {
    const marks: any = {};
    Object.keys(rangeData).forEach((date) => {
      const totals = rangeData[date];
      const hasData = totals && (totals.calories || totals.protein || totals.carbs || totals.fat);
      if (hasData) {
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
      data.push(dayData ? dayData.calories : 0);
    }
    return {
      labels,
      datasets: [{ data }],
    };
  }, [selectedDate, rangeData]);

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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.headerTitle}>Nutrition History</Text>
          
          <Animated.View entering={FadeInUp.delay(200)} style={styles.card}>
            <Calendar
              current={selectedDate}
              onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
              markedDates={markedDates}
              theme={{
                backgroundColor: 'transparent',
                calendarBackground: 'transparent',
                textSectionTitleColor: '#94A3B8',
                selectedDayBackgroundColor: Colors.light.primary,
                selectedDayTextColor: '#ffffff',
                todayTextColor: Colors.light.primary,
                dayTextColor: '#FFFFFF',
                textDisabledColor: '#475569',
                dotColor: Colors.light.primary,
                selectedDotColor: '#ffffff',
                arrowColor: Colors.light.primary,
                monthTextColor: '#ffffff',
                textDayFontWeight: '500',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '600',
              }}
            />
          </Animated.View>

          <View style={styles.summaryContainer}>
            <Text style={styles.sectionTitle}>
              {moment(selectedDate).isSame(moment(), 'day') ? 'Today' : moment(selectedDate).format('MMM D, YYYY')} Summary
            </Text>
            
            {selectedData.calories > 0 ? (
              <View style={styles.statsGrid}>
                <SummaryStat label="Calories" value={selectedData.calories} color={Colors.light.calories} icon="flame" unit="kcal" />
                <SummaryStat label="Protein" value={selectedData.protein} color={Colors.light.protein} icon="barbell" unit="g" />
                <SummaryStat label="Carbs" value={selectedData.carbs} color={Colors.light.carbs} icon="nutrition" unit="g" />
                <SummaryStat label="Fat" value={selectedData.fat} color={Colors.light.fat} icon="water" unit="g" />
              </View>
            ) : (
              <View style={styles.noDataCard}>
                <Ionicons name="calendar-outline" size={40} color="rgba(255,255,255,0.3)" />
                <Text style={styles.noDataText}>No data for this date</Text>
              </View>
            )}
          </View>

          {selectedData.calories > 0 && (
            <Animated.View entering={FadeInUp.delay(400)} style={styles.graphCard}>
              <Text style={styles.graphTitle}>Weekly Calorie Trend</Text>
              <LineChart
                data={graphData}
                width={width - 64}
                height={180}
                chartConfig={{
                  backgroundColor: 'transparent',
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  backgroundGradientFromOpacity: 0,
                  backgroundGradientToOpacity: 0,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  propsForDots: { r: "4", strokeWidth: "2", stroke: Colors.light.primary }
                }}
                bezier
                style={styles.chart}
              />
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const SummaryStat = ({ label, value, color, icon, unit }: any) => (
  <View style={styles.statBox}>
    <View style={[styles.statIconCircle, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <View>
      <Text style={styles.statValue}>{Math.round(value)} {unit}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 40 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: Spacing.lg, textAlign: 'center', marginTop: Spacing.sm },
  card: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: BorderRadius.xl, padding: Spacing.sm, marginBottom: Spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  summaryContainer: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: Spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statBox: { width: '48%', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, ...Shadows.md },
  statIconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: Colors.light.text },
  statLabel: { fontSize: 12, color: Colors.light.textSecondary, fontWeight: '600' },
  noDataCard: { padding: Spacing.xl, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: BorderRadius.xl, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  noDataText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '600', marginTop: Spacing.sm },
  graphCard: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.lg },
  graphTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: Spacing.md },
  chart: { marginVertical: 8, borderRadius: 16 },
});

export default CalendarScreen;
