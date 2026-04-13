import React, { useState } from 'react';
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
} from 'react-native';
import { useAuth } from '../components/context/AuthContext';
import { Colors } from '../constants/theme';
import { Link, useRouter } from 'expo-router';
import Icon from '@expo/vector-icons/Ionicons';
import Toast from 'react-native-toast-message';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { login, resendConfirmation } = useAuth();
  const router = useRouter();

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleResend = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email first.');
      return;
    }
    setResending(true);
    try {
      await resendConfirmation(email.trim());
      Toast.show({
        type: 'success',
        text1: 'Email Sent',
        text2: 'Please check your inbox for the link.',
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend confirmation.');
    } finally {
      setResending(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    const trimmedEmail = email.trim();
    if (!validateEmail(trimmedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address (e.g., user@example.com).');
      return;
    }

    setLoading(true);
    try {
      await login(trimmedEmail, password);
      Toast.show({
        type: 'success',
        text1: 'Login Successful',
        text2: 'Welcome back!',
      });
      router.replace('/(tabs)');
    } catch (error: any) {
      let errorMessage = error.message || 'Please check your credentials.';
      
      if (errorMessage.toLowerCase().includes('429') || errorMessage.toLowerCase().includes('too many requests')) {
        Toast.show({
          type: 'error',
          text1: 'Rate Limit Exceeded',
          text2: 'Too many requests. Please wait a moment.',
          visibilityTime: 4000,
        });
        errorMessage = 'Too many login attempts. Please wait a few minutes.';
      } else if (errorMessage.toLowerCase().includes('email not confirmed')) {
        Alert.alert(
          'Email Not Confirmed',
          'Your email has not been verified yet. Would you like us to resend the confirmation link?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Resend Link', onPress: handleResend }
          ]
        );
      } else if (errorMessage.toLowerCase().includes('invalid login credentials')) {
        errorMessage = 'Invalid email or password. If you just signed up, please ensure you have confirmed your email address via the link sent to you.';
        Toast.show({
          type: 'error',
          text1: 'Login Failed',
          text2: 'Check your credentials or verify your email.',
          visibilityTime: 5000,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Login Failed',
          text2: errorMessage,
        });
      }
      
      console.error('[Login Debug]', { error: errorMessage, originalError: error, email: email.trim(), timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Icon name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Icon name="fitness-outline" size={48} color={Colors.dark.primary} />
          </View>
          <Text style={styles.title}>NutriScan AI</Text>
          <Text style={styles.subtitle}>Welcome back! Please login to your account.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Icon name="mail-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Icon name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/forgot-password')}
            style={{ marginTop: 16, alignSelf: 'center' }}
          >
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/register" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Using Colors.dark.background
  },
  inner: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    color: '#F8FAFC',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#3B82F6',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(59, 130, 246, 0.3)',
      },
      default: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
      }
    }),
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 15,
  },
  linkText: {
    color: '#3B82F6',
    fontSize: 15,
    fontWeight: '700',
  },
});
