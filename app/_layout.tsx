import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AuthProvider } from '../src/context/AuthContext';
import { PremiumProvider } from '../src/context/PremiumContext';
import { PostProvider } from '../src/context/PostContext';
import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from '@/src/context/ThemeContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';
import { NotificationProvider } from '../src/context/NotificationContext';
import { MessagesProvider, useMessages } from '../src/context/MessagesContext';
import { useAuth } from '@/src/context/AuthContext';
import { supabase } from '../src/lib/supabase';
export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

SplashScreen.preventAutoHideAsync();

function LoadingScreen() {
  const { isDarkMode } = useTheme();
  return (
    <View style={[
      styles.loadingContainer, 
      { backgroundColor: isDarkMode ? '#121212' : '#fff' }
    ]}>
      <ActivityIndicator 
        size="large" 
        color={isDarkMode ? '#fff' : '#0047AB'} 
      />
    </View>
  );
}

function GlobalMessageSubscription() {
  const { session } = useAuth();
  const { refreshChats } = useMessages();

  useEffect(() => {
    if (session?.user?.id) {
      // Create a channel for both postgres changes and broadcasts
      const channel = supabase.channel(`global_messages_${session.user.id}`);
      
      const subscription = channel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `or(sender_id.eq.${session.user.id},recipient_id.eq.${session.user.id})`,
        }, async () => {
          console.log('Global postgres change detected, refreshing chats...');
          await refreshChats();
        })
        .on('broadcast', { event: 'new_message' }, async () => {
          console.log('Global broadcast received, refreshing chats...');
          await refreshChats();
        })
        .subscribe((status) => {
          console.log('Global subscription status:', status);
        });

      // Initial fetch
      refreshChats();

      return () => {
        console.log('Cleaning up global subscription');
        channel.unsubscribe();
      };
    }
  }, [session?.user?.id]);

  return null;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
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

  if (!loaded) {
    return (
      <ThemeProvider>
        <LoadingScreen />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <MessagesProvider>
            <PostProvider>
              <PremiumProvider>
                <GlobalMessageSubscription />
                <Slot />
              </PremiumProvider>
            </PostProvider>
          </MessagesProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
