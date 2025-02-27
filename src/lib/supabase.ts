import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

const supabaseUrl = 'https://tokxsggxbetgxoypadoo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRva3hzZ2d4YmV0Z3hveXBhZG9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwMjU0NjgsImV4cCI6MjA1MjYwMTQ2OH0.bagtfIUeeeaDPofMeUc6jnJrOTXm3nlZuc33dCM_BN4';

const linking = {
  prefixes: ['reactlope://', 'https://reactlope.app'],
};

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 1, // Lower value to reduce overhead
    },
  },
});

// Listen for sign-in with password recovery
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    const newPassword = await AsyncStorage.getItem('new_password');
    if (newPassword) {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (!error) {
        await AsyncStorage.removeItem('new_password');
      }
    }
  }
});

// Connection monitoring
let connectionTimer: NodeJS.Timeout | null = null;
const PING_INTERVAL = 60000; // 1 minute

export const startConnectionMonitoring = () => {
  // Clear any existing timer
  if (connectionTimer) {
    clearInterval(connectionTimer);
  }
  
  // Set up periodic ping to keep connection alive
  connectionTimer = setInterval(async () => {
    try {
      // Simple ping query to keep connection alive
      const { error } = await supabase.from('profiles').select('id').limit(1);
      
      if (error) {
        console.log('Connection ping failed, attempting to reconnect...');
        
        // Try to refresh the session
        await supabase.auth.refreshSession();
        
        // Reconnect realtime subscriptions
        supabase.removeAllChannels();
        
        // Wait a moment and then try to reconnect
        setTimeout(() => {
          // This will trigger reconnection of all active channels
          supabase.channel('system').subscribe();
        }, 1000);
      }
    } catch (err) {
      console.error('Connection monitoring error:', err);
    }
  }, PING_INTERVAL);
  
  return () => {
    if (connectionTimer) {
      clearInterval(connectionTimer);
      connectionTimer = null;
    }
  };
};