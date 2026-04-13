import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../components/context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    }
  }, [user, isLoading]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#0F172A' }}>
      <ActivityIndicator size="large" color="#3B82F6" />
    </View>
  );
}
