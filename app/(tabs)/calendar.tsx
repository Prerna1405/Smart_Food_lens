import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  SafeAreaView,
  Platform
} from 'react-native';

import { Calendar, DateData } from 'react-native-calendars';
import { LineChart, BarChart } from 'react-native-chart-kit';
import moment from 'moment';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';

const API_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

const CalendarScreen = () => {
  const { date } = useLocalSearchParams();
  const [selectedDate, setSelectedDate] = useState((date as string) || moment().format('YYYY-MM-DD'));
  const [rangeData, setRangeData] = useState<{[key: string]: { calories: number; protein: number; carbs: number; fat: number }}>({});

  // Fetch last 60 days ending on selectedDate
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

  // Calculate marked dates for the calendar
  const markedDates = useMemo(() => {
    const marks: any = {};
    Object.keys(rangeData).forEach((date) => {
      // Mark days that have data with a small dot
      const totals = rangeData[date];
      const hasData = totals && (totals.calories || totals.protein || totals.carbs || totals.fat);
      if (hasData) {
        marks[date] = { marked: true, dotColor: '#007AFF' };
      }
    });
    
    // Highlight the selected date
    marks[selectedDate] = {
      ...(marks[selectedDate] || {}),
      selected: true,
      selectedColor: '#007AFF',
      selectedTextColor: '#ffffff',
      disableTouchEvent: true,
    };
    return marks;
  }, [selectedDate, rangeData]);

  const selectedData = rangeData[selectedDate] || { calories: 0, protein: 0, carbs: 0, fat: 0 };

  // Generate graph data (last 7 days ending on selected date)
  const graphData = useMemo(() => {
    const labels = [];
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = moment(selectedDate).subtract(i, 'days');
      labels.push(d.format('DD')); // Just day number for cleaner X-axis
      const dayData = rangeData[d.format('YYYY-MM-DD')];
      data.push(dayData ? dayData.calories : 0);
    }
    return {
      labels,
      datasets: [{ data }],
    };
  }, [selectedDate, rangeData]);

  const screenWidth = Dimensions.get('window').width;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Nutrition Calendar</Text>
        
        {/* Calendar Section */}
        <View style={styles.card}>
          <Calendar
            current={selectedDate}
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              backgroundColor: '#1E1E1E',
              calendarBackground: '#1E1E1E',
              textSectionTitleColor: '#b6c1cd',
              selectedDayBackgroundColor: '#007AFF',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#007AFF',
              dayTextColor: '#ffffff',
              textDisabledColor: '#555',
              dotColor: '#007AFF',
              selectedDotColor: '#ffffff',
              arrowColor: '#007AFF',
              monthTextColor: '#ffffff',
              indicatorColor: '#007AFF',
              textDayFontWeight: '300',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '300',
              textDayFontSize: 16,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 14
            }}
          />
        </View>

        {/* Daily Summary Section */}
        <View style={styles.summaryContainer}>
          <Text style={styles.sectionTitle}>
            Summary for {moment(selectedDate).format('MMMM Do, YYYY')}
          </Text>
          
          {selectedData.calories > 0 ? (
            <View style={styles.statsGrid}>
              <View style={[styles.statBox, { borderColor: '#FF9500' }]}>
                <Ionicons name="flame" size={24} color="#FF9500" />
                <Text style={styles.statValue}>{selectedData.calories}</Text>
                <Text style={styles.statLabel}>Calories</Text>
              </View>
              <View style={[styles.statBox, { borderColor: '#34C759' }]}>
                <Ionicons name="barbell" size={24} color="#34C759" />
                <Text style={styles.statValue}>{selectedData.protein}g</Text>
                <Text style={styles.statLabel}>Protein</Text>
              </View>
              <View style={[styles.statBox, { borderColor: '#32ADE6' }]}>
                <Ionicons name="nutrition" size={24} color="#32ADE6" />
                <Text style={styles.statValue}>{selectedData.carbs}g</Text>
                <Text style={styles.statLabel}>Carbs</Text>
              </View>
              <View style={[styles.statBox, { borderColor: '#AF52DE' }]}>
                <Ionicons name="water" size={24} color="#AF52DE" />
                <Text style={styles.statValue}>{selectedData.fat}g</Text>
                <Text style={styles.statLabel}>Fats</Text>
              </View>
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No data recorded for this day.</Text>
            </View>
          )}
        </View>

        {/* Graph Section - Only show if there is data in the week */}
        <View style={styles.graphContainer}>
          <Text style={styles.sectionTitle}>Weekly Calorie Trend</Text>
          <Text style={styles.graphSubtitle}>Last 7 days ending {moment(selectedDate).format('MMM Do')}</Text>
          <LineChart
            data={graphData}
            
            width={screenWidth - 40} // Subtract padding
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            yAxisInterval={1}
            chartConfig={{
              backgroundColor: '#1E1E1E',
              backgroundGradientFrom: '#1E1E1E',
              backgroundGradientTo: '#1E1E1E',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`, // Blue
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: "5",
                strokeWidth: "2",
                stroke: "#007AFF"
              },
              propsForBackgroundLines: {
                strokeDasharray: "", // solid lines
                stroke: "#333"
              }
            }}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16
            }}
          />
        </View>

        {/* Macro Distribution Graph (Bar Chart) - Only if data exists */}
        {selectedData.calories > 0 && (
          <View style={styles.graphContainer}>
            <Text style={styles.sectionTitle}>Macro Breakdown</Text>
            <BarChart
              data={{
                labels: ["Protein", "Carbs", "Fats"],
                datasets: [
                  {
                    data: [selectedData.protein, selectedData.carbs, selectedData.fat]
                  }
                ]
              }}
              width={screenWidth - 40}
              height={220}
              yAxisLabel=""
              yAxisSuffix="g"
              chartConfig={{
                backgroundColor: '#1E1E1E',
                backgroundGradientFrom: '#1E1E1E',
                backgroundGradientTo: '#1E1E1E',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(52, 199, 89, ${opacity})`, // Green
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                barPercentage: 0.7,
                propsForBackgroundLines: {
                   strokeDasharray: "",
                   stroke: "#333"
                }
              }}
              style={{
                marginVertical: 8,
                borderRadius: 16
              }}
              showValuesOnTopOfBars
              fromZero
            />
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
    marginTop: 10,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 10,
    marginBottom: 25,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0px 4px 5px rgba(0, 0, 0, 0.3)',
      }
    }),
  },
  summaryContainer: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 15,
    marginLeft: 5,
  },
  graphSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
    marginLeft: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBox: {
    width: '48%',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.2)',
      }
    }),
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#AAAAAA',
  },
  graphContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 10,
    marginBottom: 25,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0px 4px 5px rgba(0, 0, 0, 0.3)',
      }
    }),
  },
  noDataContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
  },
  noDataText: {
    color: '#888',
    fontSize: 16,
    fontStyle: 'italic',
  },
});

export default CalendarScreen;
