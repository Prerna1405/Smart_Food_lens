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

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { register } = useAuth();
  const router = useRouter();

  // Handle countdown for rate limit cooldown
  React.useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown(c => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleRegister = async () => {
    if (cooldown > 0) {
      Toast.show({
        type: 'info',
        text1: 'Cooldown Active',
        text2: `Please wait ${cooldown}s before trying again.`,
      });
      return;
    }

    if (!username || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'All fields are required.');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const trimmedEmail = email.trim();
      const trimmedUsername = username.trim();
      await register(trimmedUsername, trimmedEmail, password);
      Toast.show({
        type: 'success',
        text1: 'Registration Successful',
        text2: 'Please check your email for a verification link.',
      });
      setTimeout(() => router.replace('/login'), 2000);
    } catch (error: any) {
      let errorMessage = error.message || 'Please try again.';
      
      if (errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('429') || errorMessage.toLowerCase().includes('too many requests')) {
        Toast.show({
          type: 'error',
          text1: 'Rate Limit Reached',
          text2: 'Too many attempts. Protection enabled.',
          visibilityTime: 5000,
        });
        setCooldown(60); // 1 minute UI cooldown
        errorMessage = 'Too many signup attempts. Security lockout active for 60s. If this persists, please wait 15-60 minutes.';
      } else {
        Toast.show({
          type: 'error',
          text1: 'Registration Failed',
          text2: errorMessage,
        });
      }
      
      console.error('[Signup Debug]', { 
        error: errorMessage, 
        originalError: error,
        timestamp: new Date().toISOString() 
      });
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join NutriScan AI and start your health journey today.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputWrapper}>
              <Icon name="person-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your username"
                placeholderTextColor="#64748B"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          </View>

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
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Icon name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Min. 8 characters"
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <Icon name="checkmark-circle-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Repeat your password"
                placeholderTextColor="#64748B"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, (loading || cooldown > 0) && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading || cooldown > 0}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {cooldown > 0 ? `Retry in ${cooldown}s` : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>Sign In</Text>
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
    marginBottom: 16,
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
