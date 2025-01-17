import { Stack } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useEffect } from 'react';
import { router } from 'expo-router';

export default function AuthLayout() {
  const { session } = useAuth();

  useEffect(() => {
    if (session) {
      router.replace('/(tabs)');
    }
  }, [session]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}