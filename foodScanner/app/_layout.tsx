import { Stack } from 'expo-router';
import { AuthProvider } from '../components/context/AuthContext';
import { UserProvider } from '../components/context/UserContext';

export default function Layout() {
  return (
    <AuthProvider>
      <UserProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </UserProvider>
    </AuthProvider>
  );
}
