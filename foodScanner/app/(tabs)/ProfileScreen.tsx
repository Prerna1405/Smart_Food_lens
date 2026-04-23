import React, { useState, useEffect } from 'react';
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
  StatusBar,
  Switch,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { supabase } from '../../lib/supabase';
import { Colors, Shadows, BorderRadius, Spacing, Typography } from '../../constants/theme';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import Animated, { FadeInUp, ZoomIn, Easing, FadeInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../components/context/LanguageContext';
import { useAuth } from '../../components/context/AuthContext';

import { useUser } from '../../components/context/UserContext';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const EasingCurve = Easing.bezier(0.4, 0.0, 0.2, 1);

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'ar', name: 'Arabic', flag: '🇦🇪' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
];

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
  dietary_preferences: string[];
  restrictions: string[];
};

const ProfileScreen = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);

  const { language, setLanguage } = useLanguage();
  const { setUserProfile } = useUser();
  const { logout } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileType>({
    name: '',
    age: '',
    weight: '',
    height: '',
    gender: 'male',
    activity_level: 'moderate',
    goal: 'maintain',
    dietary_preferences: [],
    restrictions: [],
  });

  const [stats, setStats] = useState({
    bmi: 0,
    bmr: 0,
    targetCalories: 2000,
  });

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

  const fetchProfile = async (id: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // Handle fetch error quietly
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
        dietary_preferences: data.dietary_preferences || [],
        restrictions: data.restrictions || [],
      });
      setUserProfile(data);
      calculateHealthMetrics(data);
    }
  };

  const calculateHealthMetrics = (p: any) => {
    const weight = parseFloat(p.weight);
    const height = parseFloat(p.height) / 100;
    const age = parseInt(p.age);

    if (!weight || !height || !age) return;

    const bmi = weight / (height * height);

    let bmr = 10 * weight + 6.25 * (height * 100) - 5 * age;
    if (p.gender === 'male') bmr += 5;
    else bmr -= 161;

    const multipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    const tdee = bmr * (multipliers[p.activity_level as keyof typeof multipliers] || 1.2);

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
      dietary_preferences: profile.dietary_preferences,
      restrictions: profile.restrictions,
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

  const getBMICategory = (bmi: number) => {
    if (!bmi) return '--';
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Healthy';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/login');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to logout');
            }
          },
        },
      ]
    );
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
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* HEADER SECTION */}
        <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
          <View style={styles.profileImageContainer}>
            <LinearGradient
              colors={Colors.light.primaryGradient as any}
              style={styles.avatarCircle}
            >
              <Text style={styles.avatarText}>{profile.name?.[0] || user?.username?.[0] || 'U'}</Text>
            </LinearGradient>
            <TouchableOpacity style={styles.editImageBtn}>
              <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{profile.name || user?.username || 'New User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          
          <TouchableOpacity style={styles.editProfileBtn}>
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* HEALTH DASHBOARD */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Health Overview</Text>
        </View>
        <View style={styles.statsRow}>
          <StatBox 
            label="BMI" 
            value={stats.bmi || '--'} 
            sub={getBMICategory(stats.bmi)} 
            icon="speedometer-outline"
            color={Colors.light.primary} 
            delay={200} 
          />
          <StatBox 
            label="Target" 
            value={stats.targetCalories} 
            sub="kcal/day" 
            icon="flame-outline"
            color={Colors.light.calories} 
            delay={300} 
          />
          <StatBox 
            label="BMR" 
            value={stats.bmr || '--'} 
            sub="kcal/day" 
            icon="flash-outline"
            color={Colors.light.protein} 
            delay={400} 
          />
        </View>

        {/* CONNECTED DEVICES (PREMIUM) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Connected Devices</Text>
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>PREMIUM</Text>
          </View>
        </View>
        <View style={styles.settingsCard}>
          <View style={styles.syncItem}>
            <View style={styles.syncLeft}>
              <View style={[styles.syncIconContainer, { backgroundColor: '#3B82F615' }]}>
                <MaterialCommunityIcons name="apple-safari" size={24} color="#3B82F6" />
              </View>
              <View>
                <Text style={styles.syncTitle}>Apple Health</Text>
                <Text style={styles.syncStatus}>Connected • Last synced 2m ago</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.syncBtn}>
              <Text style={styles.syncBtnText}>Sync Now</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.settingDivider} />
          <View style={styles.syncItem}>
            <View style={styles.syncLeft}>
              <View style={[styles.syncIconContainer, { backgroundColor: '#10B98115' }]}>
                <MaterialCommunityIcons name="watch" size={24} color="#10B981" />
              </View>
              <View>
                <Text style={styles.syncTitle}>Smartwatch</Text>
                <Text style={styles.syncStatus}>Disconnected</Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.syncBtn, { backgroundColor: '#F1F5F9' }]}>
              <Text style={[styles.syncBtnText, { color: '#64748B' }]}>Connect</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* APP SETTINGS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>App Settings</Text>
        </View>
        <View style={styles.settingsCard}>
          <View style={styles.settingItem}>
            <View style={[styles.settingIconContainer, { backgroundColor: Colors.light.primary + '10' }]}>
              <Ionicons name="notifications-outline" size={20} color={Colors.light.primary} />
            </View>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Switch 
              value={isNotificationsEnabled} 
              onValueChange={setIsNotificationsEnabled}
              trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.settingDivider} />
          
          <View style={styles.languageContainer}>
            <View style={styles.settingItem}>
              <View style={[styles.settingIconContainer, { backgroundColor: Colors.light.primary + '10' }]}>
                <Ionicons name="language-outline" size={20} color={Colors.light.primary} />
              </View>
              <Text style={styles.settingLabel}>Language</Text>
            </View>
            <View style={styles.languageOptions}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity 
                  key={lang.code} 
                  style={[
                    styles.langChip, 
                    language === lang.code && styles.langChipActive
                  ]}
                  onPress={() => setLanguage(lang.code)}
                >
                  <Text style={styles.langFlag}>{lang.flag}</Text>
                  <Text style={[
                    styles.langName,
                    language === lang.code && styles.langNameActive
                  ]}>{lang.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ACCOUNT */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Account</Text>
        </View>
        <View style={styles.settingsCard}>
          <SettingItem 
            icon="shield-checkmark-outline" 
            label="Privacy Policy" 
            onPress={() => {}} 
            delay={700}
          />
          <SettingItem 
            icon="help-circle-outline" 
            label="Help & Support" 
            onPress={() => {}} 
            delay={800}
          />
          <SettingItem 
            icon="log-out-outline" 
            label="Logout" 
            color={Colors.light.error}
            onPress={handleLogout} 
            delay={900}
            hideDivider
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.versionText}>NutriScan AI Premium v2.1.0</Text>
          <Text style={styles.footerText}>Made with ❤️ for a healthier you</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const StatBox = ({ label, value, sub, icon, color, delay }: any) => (
  <Animated.View entering={ZoomIn.duration(600).delay(delay)} style={styles.statBox}>
    <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statSub}>{sub}</Text>
  </Animated.View>
);

const SettingItem = ({ icon, label, onPress, rightElement, color, delay, hideDivider }: any) => (
  <Animated.View entering={FadeInRight.duration(500).delay(delay)}>
    <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={!onPress}>
      <View style={[styles.settingIconContainer, { backgroundColor: (color || Colors.light.primary) + '10' }]}>
        <Ionicons name={icon} size={20} color={color || Colors.light.primary} />
      </View>
      <Text style={[styles.settingLabel, color && { color }]}>{label}</Text>
      {rightElement || <Ionicons name="chevron-forward" size={18} color={Colors.light.textSecondary} />}
    </TouchableOpacity>
    {!hideDivider && <View style={styles.settingDivider} />}
  </Animated.View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#fff',
    borderBottomLeftRadius: BorderRadius.xxl,
    borderBottomRightRadius: BorderRadius.xxl,
    ...Shadows.sm,
    marginBottom: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.premium,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: Typography.weight.black as any,
    color: '#fff',
    fontFamily: Typography.family.rounded,
  },
  editImageBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.light.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.black as any,
    color: Colors.light.text,
    fontFamily: Typography.family.rounded,
  },
  userEmail: {
    fontSize: Typography.size.sm,
    color: Colors.light.textSecondary,
    marginTop: 4,
    fontWeight: Typography.weight.medium as any,
  },
  editProfileBtn: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  editProfileText: {
    color: Colors.light.primary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold as any,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.xl,
    marginBottom: 15,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.black as any,
    color: Colors.light.text,
    fontFamily: Typography.family.rounded,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginBottom: 30,
  },
  statBox: {
    width: (width - (Spacing.xl * 2) - 24) / 3,
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.black as any,
    fontFamily: Typography.family.rounded,
  },
  premiumBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 10,
  },
  premiumBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  settingsCard: {
    backgroundColor: '#fff',
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.sm,
    marginBottom: 20,
  },
  syncItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  syncLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  syncIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  syncStatus: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  syncBtn: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  syncBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  settingItem: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weight.bold as any,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statSub: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weight.medium as any,
  },
  settingsCard: {
    backgroundColor: Colors.light.surface,
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.sm,
    ...Shadows.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingLabel: {
    flex: 1,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold as any,
    color: Colors.light.text,
  },
  settingDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginLeft: 70,
    marginRight: 15,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
  },
  versionText: {
    fontSize: Typography.size.xs,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weight.bold as any,
  },
  footerText: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  languageContainer: {
    paddingBottom: Spacing.lg,
  },
  languageOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: 8,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 8,
  },
  langChipActive: {
    backgroundColor: Colors.light.primary + '10',
    borderColor: Colors.light.primary,
  },
  langFlag: {
    fontSize: 14,
    marginRight: 4,
  },
  langName: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: Typography.weight.medium as any,
  },
  langNameActive: {
    color: Colors.light.primary,
    fontWeight: Typography.weight.bold as any,
  },
});

export default ProfileScreen;
