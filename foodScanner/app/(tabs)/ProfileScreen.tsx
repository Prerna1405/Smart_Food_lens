import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from '@expo/vector-icons/Ionicons';
import axios from 'axios';
import moment from 'moment';

interface Option {
  label: string;
  value: string;
}

interface NutritionResult {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  aiSuggestion: string;
}

const Dropdown = ({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: Option[];
  onSelect: (val: string) => void;
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.dropdownContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setVisible(true)}
      >
        <Text style={styles.dropdownText}>{value || 'Select'}</Text>
        <Icon name="chevron-down-outline" size={20} color="#aaa" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setVisible(false)}
        >
          <View style={styles.modalContent}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    onSelect(item.value);
                    setVisible(false);
                  }}
                >
                  <Text style={styles.optionText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const ProgressBar = ({
  label,
  current,
  target,
  color,
  icon,
  unit = 'g',
}: {
  label: string;
  current: number;
  target: number;
  color: string;
  icon: keyof typeof Icon.glyphMap;
  unit?: string;
}) => {
  const progress = Math.min(Math.max(current / target, 0), 1);
  const percentage = Math.round(progress * 100);

  return (
    <View style={styles.progressRow}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      
      <View style={styles.progressContent}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>{label}</Text>
          <Text style={styles.progressValue}>
            <Text style={{ color: color, fontWeight: 'bold' }}>{current}</Text> / {target} {unit}
          </Text>
        </View>
        
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${percentage}%`, backgroundColor: color },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const ProfileScreen = () => {
  const [age, setAge] = useState('33');
  const [weight, setWeight] = useState('200'); // lbs
  const [heightFt, setHeightFt] = useState('5');
  const [heightIn, setHeightIn] = useState('10');
  const [gender, setGender] = useState('Male');
  const [vegan, setVegan] = useState('No');
  const [allergy, setAllergy] = useState('None');
  const [activityLevel, setActivityLevel] = useState('Lightly active (light exercise/sports 1-3 days/week)');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NutritionResult | null>(null);

  // Dynamic state for today's intake
  const [todayIntake, setTodayIntake] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
  });

  const API_URL =
    Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

  const fetchTodayIntake = async () => {
    try {
      const today = moment().format('YYYY-MM-DD');
      const response = await axios.get(`${API_URL}/api/scans/by-date?date=${today}`, { timeout: 4000 });
      const totals = response.data?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 };
      setTodayIntake({
        calories: Math.round(totals.calories || 0),
        protein: Math.round(totals.protein || 0),
        carbs: Math.round(totals.carbs || 0),
        fats: Math.round(totals.fat || 0),
      });
    } catch (error) {
      console.log('Error fetching daily intake:', error);
      // Fallback or silent fail
    }
  };

  // Re-fetch data whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (result) {
        fetchTodayIntake();
      }
    }, [result])
  );

  const genderOptions = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Other', value: 'Other' },
  ];

  const veganOptions = [
    { label: 'No', value: 'No' },
    { label: 'Yes', value: 'Yes' },
  ];

  const allergyOptions = [
    { label: 'None', value: 'None' },
    { label: 'Peanuts', value: 'Peanuts' },
    { label: 'Dairy', value: 'Dairy' },
    { label: 'Gluten', value: 'Gluten' },
    { label: 'Soy', value: 'Soy' },
    { label: 'Eggs', value: 'Eggs' },
    { label: 'Fish', value: 'Fish' },
    { label: 'Shellfish', value: 'Shellfish' },
    { label: 'Tree Nuts', value: 'Tree Nuts' },
  ];

  const activityOptions = [
    { label: 'Sedentary (little or no exercise)', value: 'Sedentary (little or no exercise)' },
    { label: 'Lightly active (light exercise/sports 1-3 days/week)', value: 'Lightly active (light exercise/sports 1-3 days/week)' },
    { label: 'Moderately active (moderate exercise/sports 3-5 days/week)', value: 'Moderately active (moderate exercise/sports 3-5 days/week)' },
    { label: 'Very active (hard exercise/sports 6-7 days a week)', value: 'Very active (hard exercise/sports 6-7 days a week)' },
    { label: 'Extra active (very hard exercise/sports and a physical job)', value: 'Extra active (very hard exercise/sports and a physical job)' },
  ];

  const fetchAIHealthSuggestion = async (
    userStats: any
  ): Promise<string> => {
    // TODO: Integrate with real AI API (OpenAI, Gemini, etc.)
    return new Promise((resolve) => {
      setTimeout(() => {
        let suggestion = "Here is your personalized health insight:\n\n";
        
        suggestion += "• **Core Focus**: Maintain a balanced diet rich in whole foods.\n";

        if (userStats.vegan === 'Yes') {
          suggestion += "• **Vegan Nutrition**: Ensure sufficient B12 intake through fortified foods or supplements. Combine legumes and grains to get complete proteins.\n";
        }

        if (userStats.activityLevel.includes('Very active') || userStats.activityLevel.includes('Extra active')) {
          suggestion += "• **Fueling Activity**: Your high energy output requires prioritizing complex carbs before workouts and protein immediately after for recovery.\n";
        } else if (userStats.activityLevel.includes('Sedentary')) {
          suggestion += "• **Weight Management**: Focus on high-volume, low-calorie foods (like leafy greens) to feel full without exceeding your energy needs.\n";
        }

        if (userStats.allergy !== 'None') {
          suggestion += `• **Allergy Alert**: Strictly avoid ${userStats.allergy}. Always check labels for hidden ingredients.\n`;
        }

        suggestion += "\n**Goal**: Adhere to your daily macro targets to optimize energy levels and long-term health.";
        
        resolve(suggestion);
      }, 2000);
    });
  };

  const handleNext = async () => {
    if (!age || !weight || !heightFt || !heightIn) {
      Alert.alert("Missing Info", "Please fill in all fields");
      return;
    }

    setLoading(true);

    // 1. Calculate BMR (Mifflin-St Jeor Equation)
    const weightKg = parseFloat(weight) * 0.453592;
    const heightCm = (parseInt(heightFt) * 30.48) + (parseInt(heightIn) * 2.54);
    const ageVal = parseInt(age);

    let bmr = 0;
    if (gender === 'Male') {
      bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * ageVal) + 5;
    } else {
      bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * ageVal) - 161;
    }

    // 2. Activity Multiplier
    let multiplier = 1.2;
    if (activityLevel.includes('Lightly')) multiplier = 1.375;
    if (activityLevel.includes('Moderately')) multiplier = 1.55;
    if (activityLevel.includes('Very')) multiplier = 1.725;
    if (activityLevel.includes('Extra')) multiplier = 1.9;

    const tdee = Math.round(bmr * multiplier);

    // 3. Macro Split
    const protein = Math.round((tdee * 0.25) / 4);
    const fats = Math.round((tdee * 0.25) / 9);
    const carbs = Math.round((tdee * 0.5) / 4);

    // 4. Get AI Suggestion
    const suggestion = await fetchAIHealthSuggestion({
      age, weight, gender, vegan, allergy, activityLevel
    });

    setResult({
      calories: tdee,
      protein,
      fats,
      carbs,
      aiSuggestion: suggestion
    });

    // Fetch initial data immediately
    fetchTodayIntake();
    setLoading(false);
  };

  const renderResults = () => {
    if (!result) return null;

    const caloriesRemaining = result.calories - todayIntake.calories;
    const isTargetMet = caloriesRemaining <= 0;

    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultHeader}>Daily Tracker</Text>

        {/* Progress Section */}
        <View style={styles.trackerCard}>
          <Text style={styles.trackerTitle}>Today&apos;s Progress</Text>
          
          <ProgressBar 
            label="Calories" 
            current={todayIntake.calories} 
            target={result.calories} 
            unit="kcal"
            color="#FF9500"
            icon="flame"
          />
          <View style={styles.divider} />
          
          <ProgressBar 
            label="Protein" 
            current={todayIntake.protein} 
            target={result.protein} 
            color="#FF3B30"
            icon="barbell"
          />
          <View style={styles.divider} />

          <ProgressBar 
            label="Carbs" 
            current={todayIntake.carbs} 
            target={result.carbs} 
            color="#34C759"
            icon="nutrition"
          />
          <View style={styles.divider} />

          <ProgressBar 
            label="Fats" 
            current={todayIntake.fats} 
            target={result.fats} 
            color="#007AFF"
            icon="water"
          />

          {isTargetMet && (
             <View style={styles.targetMetContainer}>
               <Icon name="trophy" size={24} color="#FFD700" style={{marginRight: 8}} />
               <Text style={styles.targetMetText}>Goal Reached! Great job!</Text>
             </View>
          )}
        </View>

        {/* AI Insight Section */}
        <View style={styles.aiCard}>
          <View style={styles.aiHeaderRow}>
             <View style={styles.aiIconContainer}>
                <Icon name="bulb" size={24} color="#4FC3F7" />
             </View>
             <Text style={styles.aiTitle}>AI Health Insight</Text>
          </View>
          <Text style={styles.aiText}>{result.aiSuggestion}</Text>
        </View>

        <TouchableOpacity style={styles.outlineButton} onPress={() => setResult(null)}>
          <Text style={styles.outlineButtonText}>Recalculate Plan</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Analyzing your profile...</Text>
      </View>
    );
  }

  if (result) {
    return (
      <SafeAreaView style={styles.container}>
         <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderResults()}
         </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Profile Setup</Text>

        <View style={styles.card}>
          {/* Row 1: Age, Weight, Height */}
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Weight (lbs)</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Height</Text>
              <View style={styles.heightContainer}>
                <TextInput
                  style={[styles.input, styles.heightInput]}
                  value={heightFt}
                  onChangeText={setHeightFt}
                  keyboardType="numeric"
                  placeholder="Ft"
                  placeholderTextColor="#666"
                />
                <TextInput
                  style={[styles.input, styles.heightInput]}
                  value={heightIn}
                  onChangeText={setHeightIn}
                  keyboardType="numeric"
                  placeholder="In"
                  placeholderTextColor="#666"
                />
              </View>
            </View>
          </View>

          {/* Row 2: Gender, Vegan, Allergy */}
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Dropdown
                label="Gender"
                value={gender}
                options={genderOptions}
                onSelect={setGender}
              />
            </View>
            <View style={styles.spacer} />
            <View style={styles.flex1}>
              <Dropdown
                label="Vegan"
                value={vegan}
                options={veganOptions}
                onSelect={setVegan}
              />
            </View>
            <View style={styles.spacer} />
            <View style={styles.flex1}>
              <Dropdown
                label="Allergy"
                value={allergy}
                options={allergyOptions}
                onSelect={setAllergy}
              />
            </View>
          </View>

          {/* Row 3: Activity Level */}
          <View style={styles.centeredRow}>
            <View style={styles.fullWidth}>
              <Dropdown
                label="Activity Level"
                value={activityLevel}
                options={activityOptions}
                onSelect={setActivityLevel}
              />
            </View>
          </View>

          {/* Next Button */}
          <TouchableOpacity style={styles.button} onPress={handleNext}>
            <Text style={styles.buttonText}>Generate Plan</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  centeredRow: {
    alignItems: 'center',
    marginBottom: 25,
  },
  inputGroup: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    width: '100%',
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  heightContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  heightInput: {
    width: '47%',
  },
  dropdownContainer: {
    alignItems: 'center',
    width: '100%',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    width: '100%',
  },
  dropdownText: {
    color: '#fff',
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxHeight: '60%',
    borderWidth: 1,
    borderColor: '#333',
  },
  optionItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  optionText: {
    fontSize: 16,
    color: '#fff',
  },
  flex1: {
    flex: 1,
  },
  spacer: {
    width: 10,
  },
  fullWidth: {
    width: '100%',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingText: {
    color: '#fff',
    marginTop: 15,
    fontSize: 16,
  },
  resultContainer: {
    width: '100%',
    alignItems: 'center',
  },
  resultHeader: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
  },
  trackerCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    marginBottom: 24,
  },
  trackerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  progressContent: {
    flex: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  progressValue: {
    color: '#888',
    fontSize: 14,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#2C2C2C',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#2C2C2C',
    marginVertical: 10,
    marginLeft: 60, 
  },
  targetMetContainer: {
    marginTop: 10,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  targetMetText: {
    color: '#34C759',
    fontWeight: 'bold',
    fontSize: 16,
  },
  aiCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  aiIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(79, 195, 247, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4FC3F7',
  },
  aiText: {
    color: '#ccc',
    fontSize: 15,
    lineHeight: 24,
  },
  outlineButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#333',
  },
  outlineButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
