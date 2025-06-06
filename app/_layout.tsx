import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AuthProvider } from '../src/context/AuthContext';
import { PremiumProvider } from '../src/context/PremiumContext';
import { ThemeProvider } from '@/src/context/ThemeContext';
import { View, ActivityIndicator } from 'react-native';
import { Slot } from 'expo-router';
import { NotificationProvider } from '../src/context/NotificationContext';
import { MessagesProvider } from '../src/context/MessagesContext';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { HexagonBackground } from '../components/HexagonBackground';
import { startConnectionMonitoring } from '@/src/lib/supabase';
import { PushNotificationProvider } from '@/src/context/PushNotificationContext';
import { UnreadMessagesProvider } from '@/src/context/UnreadMessagesContext';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      
      const url = new URL(event.url);
      const params = new URLSearchParams(url.search);
      const type = params.get('type');
      
      if (type === 'recovery') {
        router.replace('/reset-confirm');
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // Start connection monitoring when app loads
    const stopMonitoring = startConnectionMonitoring();
    
    // Clean up when component unmounts
    return () => {
      stopMonitoring();
    };
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <PushNotificationProvider>
          <UnreadMessagesProvider>
            <MessagesProvider>
              <NotificationProvider>
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  <Stack.Screen name="(messages)" options={{ headerShown: false }} />
                  <Stack.Screen name="(training)" options={{ headerShown: false }} />
                  <Stack.Screen name="(training)/manage-templates" options={{ headerShown: false }} />
                  <Stack.Screen name="(training)/plan-details" options={{ headerShown: false }} />
                  <Stack.Screen name="(training)/edit-plan" options={{ headerShown: false }} />
                  <Stack.Screen name="(training)/view-progress" options={{ headerShown: false }} />
                  <Stack.Screen name="notification" options={{ headerShown: false, headerTitle: 'Notifikasjoner', headerLeft: () => <Ionicons name="arrow-back-outline" size={24} color="white" />, headerStyle: { backgroundColor: '#000b15'} }} />
                  <Stack.Screen name="(settings)" options={{ headerShown: false }} />
                </Stack>
              </NotificationProvider>
            </MessagesProvider>
          </UnreadMessagesProvider>
        </PushNotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
