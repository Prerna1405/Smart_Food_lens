import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import moment from 'moment';
import axios from 'axios';
import { useUser } from '../../components/context/UserContext';
import { useRouter } from 'expo-router';

const HomeScreen = () => {
  const router = useRouter();
  const { todayTotals } = useUser();
  const [lastThreeDaysData, setLastThreeDaysData] = useState<any[]>([]);
  const API_URL =
    Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

  useEffect(() => {
    (async () => {
      try {
        const response = await axios.get(`${API_URL}/api/scans/last-three-days`, {
          timeout: 4000,
        });
        setLastThreeDaysData(response.data.data || []);
      } catch {
        setLastThreeDaysData([]);
      }
    })();
  }, [API_URL]);

  const lastSevenDays = Array.from({ length: 7 }).map((_, i) =>
    moment().subtract(6 - i, 'days')
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>NutriScan</Text>
          </View>
          <Ionicons name="notifications-outline" size={24} color="white" />
        </View>


        {/* TODAY STATS */}
        <Text style={styles.sectionTitle}>Today’s Intake</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Calories" value={`${Math.round(todayTotals.calories)} kcal`} icon="flame-outline" />
          <StatCard label="Protein" value={`${Math.round(todayTotals.protein)} g`} icon="barbell-outline" />
          <StatCard label="Carbs" value={`${Math.round(todayTotals.carbs)} g`} icon="nutrition-outline" />
          <StatCard label="Fat" value={`${Math.round(todayTotals.fat)} g`} icon="water-outline" />
        </View>

        {/* CALENDAR */}
        <Text style={styles.sectionTitle}>This Week</Text>
        <View style={styles.calendarRow}>
          {lastSevenDays.map((day, i) => {
            const isToday = day.isSame(moment(), 'day');
            return (
              <TouchableOpacity
                key={i}
                onPress={() => router.push({ pathname: '/calendar' as any, params: { date: day.format('YYYY-MM-DD') } })}
                style={[
                  styles.calendarDay,
                  isToday && styles.calendarToday,
                ]}>
                <Text style={styles.calendarText}>{day.format('DD')}</Text>
                <Text style={styles.calendarSub}>{day.format('dd')}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* LAST 3 DAYS */}
        <Text style={styles.sectionTitle}>Last 3 Days</Text>
        {lastThreeDaysData.map((day, index) => {
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
            <View key={index} style={styles.historyCard}>
              <Text style={styles.historyDate}>
                {moment(day.date).format('MMMM D')}
              </Text>
              <Text style={styles.historyValue}>{calories} kcal</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* FLOATING ACTION BUTTON */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/scan' as any)}>
        <Ionicons name="camera" size={26} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

/* ---------------- SMALL COMPONENT ---------------- */

const StatCard = ({ label, value, icon }: any) => (
  <View style={styles.statCard}>
    <Ionicons name={icon} size={22} color="#4FC3F7" />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  container: {
    padding: 16,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  greeting: {
    color: '#aaa',
    fontSize: 14,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  scanCard: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    marginBottom: 20,
  },
  scanText: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 6,
  },
  statLabel: {
    color: '#aaa',
    fontSize: 13,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  calendarDay: {
    backgroundColor: '#1E1E1E',
    width: 44,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarToday: {
    backgroundColor: '#007AFF',
  },
  calendarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  calendarSub: {
    color: '#ddd',
    fontSize: 12,
  },
  historyCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyDate: {
    color: '#fff',
    fontSize: 16,
  },
  historyValue: {
    color: '#4FC3F7',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#007AFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
});

export default HomeScreen;
