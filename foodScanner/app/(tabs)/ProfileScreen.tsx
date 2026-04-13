import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { supabase } from '../../lib/supabase';
import { Colors, Shadows, BorderRadius, Spacing } from '../../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import GoogleFit, { Scopes } from 'react-native-google-fit';

const { width } = Dimensions.get('window');

// ✅ Proper Types
type UserType = {
  id: string;
  email?: string;
  username?: string;
};

type ProfileType = {
  name: string;
  age: string;
  weight: string;
  height: string;
  gender: 'male' | 'female' | 'other';
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'lose' | 'maintain' | 'gain';
};

const ProfileScreen = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isWatchConnected, setIsWatchConnected] = useState(false);

  const [profile, setProfile] = useState<ProfileType>({
    name: '',
    age: '',
    weight: '',
    height: '',
    gender: 'male',
    activity_level: 'moderate',
    goal: 'maintain',
  });

  const [stats, setStats] = useState({
    steps: 0,
    caloriesBurned: 0,
    bmi: 0,
    bmr: 0,
    targetCalories: 2000,
  });

  // ✅ Load User
  useEffect(() => {
    getUser();
  }, []);

  const getUser = async () => {
    setLoading(true);
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();

      if (error || !authUser) {
        setLoading(false);
        return;
      }

      const u: UserType = {
        id: authUser.id,
        email: authUser.email,
        username: authUser.user_metadata?.username,
      };

      setUser(u);
      await fetchProfile(u.id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch Profile
  const fetchProfile = async (id: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.log('Fetch error:', error.message);
      return;
    }

    if (data) {
      setProfile({
        name: data.name || '',
        age: String(data.age || ''),
        weight: String(data.weight || ''),
        height: String(data.height || ''),
        gender: data.gender || 'male',
        activity_level: data.activity_level || 'moderate',
        goal: data.goal || 'maintain',
      });
      calculateHealthMetrics(data);
    }
  };

  const calculateHealthMetrics = (p: any) => {
    const weight = parseFloat(p.weight);
    const height = parseFloat(p.height) / 100; // cm to m
    const age = parseInt(p.age);

    if (!weight || !height || !age) return;

    // BMI
    const bmi = weight / (height * height);

    // BMR (Mifflin-St Jeor Equation)
    let bmr = 10 * weight + 6.25 * (height * 100) - 5 * age;
    if (p.gender === 'male') bmr += 5;
    else bmr -= 161;

    // TDEE (Total Daily Energy Expenditure)
    const multipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    const tdee = bmr * (multipliers[p.activity_level as keyof typeof multipliers] || 1.2);

    // Target Calories
    let target = tdee;
    if (p.goal === 'lose') target -= 500;
    else if (p.goal === 'gain') target += 500;

    setStats(prev => ({
      ...prev,
      bmi: Math.round(bmi * 10) / 10,
      bmr: Math.round(bmr),
      targetCalories: Math.round(target),
    }));
  };

  // ✅ Save Profile
  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      name: profile.name,
      age: parseInt(profile.age),
      weight: parseFloat(profile.weight),
      height: parseFloat(profile.height),
      gender: profile.gender,
      activity_level: profile.activity_level,
      goal: profile.goal,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      Alert.alert('Error', 'Failed to save profile');
    } else {
      calculateHealthMetrics(profile);
      Toast.show({ type: 'success', text1: 'Profile updated' });
    }
    setSaving(false);
  };

  // ✅ Watch Connection (Google Fit)
  const connectWatch = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Watch connection is not available on web.');
      return;
    }

    setIsSyncing(true);
    try {
      const options = {
        scopes: [
          Scopes.FITNESS_ACTIVITY_READ,
          Scopes.FITNESS_BODY_READ,
        ],
      };

      const result = await GoogleFit.authorize(options);
      if (result.success) {
        setIsWatchConnected(true);
        fetchWatchData();
      } else {
        Alert.alert('Failed', 'Google Fit authorization failed.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchWatchData = async () => {
    if (!isWatchConnected) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const stepsRes = await GoogleFit.getDailySteps(today);
    const caloriesRes = await GoogleFit.getDailyCalorieSamples({
      startDate: today.toISOString(),
      endDate: tomorrow.toISOString(),
    });

    if (stepsRes && stepsRes.length > 0) {
      const totalSteps = stepsRes.find(r => r.source === 'com.google.android.gms:estimated_steps')?.steps[0]?.value || 0;
      setStats(prev => ({ ...prev, steps: totalSteps }));
    }

    if (caloriesRes && caloriesRes.length > 0) {
      const totalCals = caloriesRes.reduce((acc, curr) => acc + curr.calorie, 0);
      setStats(prev => ({ ...prev, caloriesBurned: Math.round(totalCals) }));
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* HEADER SECTION */}
        <Animated.View entering={FadeInUp} style={styles.header}>
          <View style={styles.profileImageContainer}>
            <MaterialCommunityIcons name="account-circle" size={100} color="#334155" />
            <TouchableOpacity style={styles.editImageBtn}>
              <MaterialCommunityIcons name="camera" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{profile.name || user?.username || 'New User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </Animated.View>

        {/* HEALTH OVERVIEW */}
        <View style={styles.statsRow}>
          <StatBox label="BMI" value={stats.bmi || '--'} sub={getBMICategory(stats.bmi)} color="#3B82F6" />
          <StatBox label="Target" value={stats.targetCalories} sub="kcal/day" color="#10B981" />
          <StatBox label="BMR" value={stats.bmr || '--'} sub="kcal/day" color="#F59E0B" />
        </View>

        {/* WATCH CONNECTION */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="watch-variant" size={24} color={isWatchConnected ? "#10B981" : "#64748B"} />
            <Text style={styles.cardTitle}>Smartwatch Sync</Text>
            {isWatchConnected && <View style={styles.onlineDot} />}
          </View>
          
          <View style={styles.syncContent}>
            <View style={styles.syncItem}>
              <Text style={styles.syncLabel}>Today's Steps</Text>
              <Text style={styles.syncValue}>{stats.steps.toLocaleString()}</Text>
            </View>
            <View style={styles.syncItem}>
              <Text style={styles.syncLabel}>Active Burn</Text>
              <Text style={styles.syncValue}>{stats.caloriesBurned} kcal</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.syncBtn, isWatchConnected && styles.syncBtnConnected]} 
            onPress={isWatchConnected ? fetchWatchData : connectWatch}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name={isWatchConnected ? "refresh" : "link"} size={20} color="#fff" />
                <Text style={styles.syncBtnText}>
                  {isWatchConnected ? "Sync Now" : "Connect Google Fit"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* PROFILE SETTINGS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Body Measurements</Text>
          
          <View style={styles.inputGrid}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={styles.input}
                value={profile.age}
                keyboardType="numeric"
                onChangeText={(v) => setProfile({ ...profile, age: v })}
                placeholder="Years"
                placeholderTextColor="#64748B"
              />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={profile.weight}
                keyboardType="numeric"
                onChangeText={(v) => setProfile({ ...profile, weight: v })}
                placeholder="kg"
                placeholderTextColor="#64748B"
              />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Height (cm)</Text>
              <TextInput
                style={styles.input}
                value={profile.height}
                keyboardType="numeric"
                onChangeText={(v) => setProfile({ ...profile, height: v })}
                placeholder="cm"
                placeholderTextColor="#64748B"
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Goal</Text>
          <View style={styles.chipRow}>
            {['lose', 'maintain', 'gain'].map((g) => (
              <TouchableOpacity 
                key={g} 
                style={[styles.chip, profile.goal === g && styles.activeChip]}
                onPress={() => setProfile({ ...profile, goal: g as any })}
              >
                <Text style={[styles.chipText, profile.goal === g && styles.activeChipText]}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            style={[styles.saveBtn, saving && styles.disabledBtn]} 
            onPress={saveProfile}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Update Profile</Text>}
          </TouchableOpacity>
        </View>

        {/* ACCOUNT ACTION */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => supabase.auth.signOut()}>
          <MaterialCommunityIcons name="logout" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
      <Toast />
    </SafeAreaView>
  );
};

const StatBox = ({ label, value, sub, color }: any) => (
  <View style={styles.statBox}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statSub}>{sub}</Text>
  </View>
);

const getBMICategory = (bmi: number) => {
  if (!bmi) return '--';
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 40,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  editImageBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3B82F6',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0F172A',
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#94A3B8',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    backgroundColor: '#1E293B',
    padding: 15,
    borderRadius: 20,
    width: (width - 60) / 3,
    alignItems: 'center',
    ...Shadows.sm,
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  statSub: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#1E293B',
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
    ...Shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginLeft: 10,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginLeft: 10,
  },
  syncContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderRadius: 16,
  },
  syncItem: {
    alignItems: 'center',
  },
  syncLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  syncValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  syncBtn: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  syncBtnConnected: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  syncBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  inputGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  inputWrapper: {
    width: (width - 100) / 3,
  },
  inputLabel: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0F172A',
    padding: 14,
    borderRadius: 12,
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 25,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeChip: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  chipText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  activeChipText: {
    color: '#fff',
  },
  saveBtn: {
    backgroundColor: '#3B82F6',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 40,
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default ProfileScreen;