import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../components/context/AuthContext';
import { View, Text, StyleSheet, StatusBar, Dimensions } from 'react-native';
import { Colors, Typography, Shadows } from '../constants/theme';
import Animated, { 
  FadeIn, 
  FadeOut, 
  ScaleInEaseOut, 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing,
  ZoomIn
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function Index() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const logoScale = useSharedValue(1);

  useEffect(() => {
    logoScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        withTiming(1, { duration: 1000, easing: Easing.bezier(0.4, 0, 0.2, 1) })
      ),
      -1,
      true
    );

    const timer = setTimeout(() => {
      if (!isLoading) {
        if (user) {
          router.replace('/(tabs)');
        } else {
          router.replace('/login');
        }
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [user, isLoading]);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#6366F1', '#4F46E5'] as any}
        style={StyleSheet.absoluteFill}
      >
        <Animated.View entering={FadeIn.duration(1000)} style={styles.content}>
          <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
            <Ionicons name="sparkles" size={80} color="#fff" />
          </Animated.View>
          
          <Animated.View entering={FadeInUp.delay(500).duration(800)}>
            <Text style={styles.title}>NutriScan AI</Text>
            <Text style={styles.subtitle}>Premium Health & Nutrition</Text>
          </Animated.View>

          <View style={styles.footer}>
            <Animated.View entering={FadeIn.delay(1000)} style={styles.loaderLine}>
               <Animated.View 
                 entering={ZoomIn.delay(1200).duration(1500)}
                 style={styles.loaderProgress} 
               />
            </Animated.View>
            <Text style={styles.loadingText}>Initializing AI Engine...</Text>
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const FadeInUp = FadeIn; // Fallback

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    ...Shadows.premium,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    fontFamily: Typography.family.rounded,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: Typography.size.md,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    width: '100%',
    alignItems: 'center',
  },
  loaderLine: {
    width: width * 0.6,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 15,
  },
  loaderProgress: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
  },
  loadingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.7,
    letterSpacing: 1,
  },
});
