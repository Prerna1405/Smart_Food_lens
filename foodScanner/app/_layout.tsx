import { Stack } from 'expo-router';
import { AuthProvider } from '../components/context/AuthContext';
import { UserProvider } from '../components/context/UserContext';
import { LanguageProvider } from '../components/context/LanguageContext';
import Toast from 'react-native-toast-message';

export default function Layout() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <UserProvider>
          <Stack screenOptions={{ headerShown: false }} />
          <Toast />
        </UserProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
