import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useAuth } from '../components/context/AuthContext';
import { Colors, Typography, Shadows, BorderRadius, Spacing } from '../constants/theme';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import Animated, { 
  FadeInUp, 
  FadeInDown, 
  ZoomIn, 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSpring, 
  Easing 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  // Background Animation
  const glow1 = useSharedValue(0);
  const glow2 = useSharedValue(0);

  useEffect(() => {
    glow1.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    glow2.value = withRepeat(
      withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const glowStyle1 = useAnimatedStyle(() => ({
    transform: [
      { translateX: withSpring(glow1.value * 50) },
      { translateY: withSpring(glow1.value * 30) },
      { scale: 1 + glow1.value * 0.2 }
    ],
    opacity: 0.3 + glow1.value * 0.2
  }));

  const glowStyle2 = useAnimatedStyle(() => ({
    transform: [
      { translateX: withSpring(-glow2.value * 40) },
      { translateY: withSpring(-glow2.value * 60) },
      { scale: 1.2 - glow2.value * 0.1 }
    ],
    opacity: 0.2 + glow2.value * 0.2
  }));

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Background Animated Glows */}
      <View style={styles.glowContainer}>
        <Animated.View style={[styles.glow, glowStyle1, { top: -100, left: -100, backgroundColor: Colors.light.glowPrimary }]} />
        <Animated.View style={[styles.glow, glowStyle2, { bottom: -150, right: -150, backgroundColor: Colors.light.glowSecondary }]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
            <LinearGradient
              colors={Colors.light.primaryGradient as any}
              style={styles.logoCircle}
            >
              <Ionicons name="sparkles" size={40} color="#fff" />
            </LinearGradient>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your health journey with AI.</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={Colors.light.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor={Colors.light.tabIconDefault}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.light.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.light.tabIconDefault}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <TouchableOpacity style={styles.forgotBtn} onPress={() => router.push('/forgot-password')}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginBtn}
              onPress={handleLogin}
              disabled={loading}
            >
              <LinearGradient
                colors={Colors.light.primaryGradient as any}
                style={styles.loginGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.btnContent}>
                    <Text style={styles.loginBtnText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn}>
                <Ionicons name="logo-google" size={24} color="#EA4335" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn}>
                <Ionicons name="logo-apple" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={styles.signUpText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
    width: 350,
    height: 350,
    borderRadius: 175,
  },
  inner: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...Shadows.premium,
  },
  title: {
    fontSize: Typography.size.xxxl,
    fontWeight: Typography.weight.black as any,
    color: Colors.light.text,
    fontFamily: Typography.family.rounded,
  },
  subtitle: {
    fontSize: Typography.size.md,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 30,
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold as any,
    color: Colors.light.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 16,
    height: 56,
    ...Shadows.sm,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: Colors.light.text,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.medium as any,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    color: Colors.light.primary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold as any,
  },
  loginBtn: {
    height: 56,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.premium,
  },
  loginGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.black as any,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.border,
  },
  dividerText: {
    marginHorizontal: 15,
    color: Colors.light.textSecondary,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold as any,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 30,
  },
  socialBtn: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: Colors.light.textSecondary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium as any,
  },
  signUpText: {
    color: Colors.light.primary,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.black as any,
  },
});
