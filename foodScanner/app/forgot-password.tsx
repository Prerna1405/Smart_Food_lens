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
import { useRouter } from 'expo-router';
import Icon from '@expo/vector-icons/Ionicons';
import Toast from 'react-native-toast-message';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const { resetPassword } = useAuth();
  const router = useRouter();

  const handleReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim());
      setIsSent(true);
      Toast.show({
        type: 'success',
        text1: 'Email Sent',
        text2: 'Check your inbox for a reset link.',
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send reset email.');
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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Icon name="lock-open-outline" size={64} color="#3B82F6" />
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {isSent 
              ? "We've sent instructions to your email." 
              : "Enter your email and we'll send you a link to reset your password."}
          </Text>
        </View>

        {!isSent ? (
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

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.buttonText}>Back to Login</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 20, left: 20, padding: 10 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: '#F8FAFC', marginTop: 16 },
  subtitle: { fontSize: 16, color: '#94A3B8', textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
  form: { width: '100%' },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#94A3B8', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 52, color: '#F8FAFC', fontSize: 16 },
  button: { backgroundColor: '#3B82F6', height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
