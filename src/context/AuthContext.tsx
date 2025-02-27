'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';
import { registerForPushNotificationsAsync, saveNotificationToken } from '@/src/utils/notifications';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isCoach: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        checkUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        await checkUserRole(session.user.id);
      } else {
        setIsCoach(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setIsCoach(data.role === 'coach');
    } catch (error) {
      console.error('Error checking user role:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupNotifications = async () => {
    try {
      if (!Constants.expoConfig?.extra?.eas?.projectId) {
        console.log('Skipping notification setup - no project ID available');
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig.extra.eas.projectId
      });
      
      if (token) {
        await saveNotificationToken(session!.user.id, token);
      }
    } catch (error) {
      console.log('Notification setup skipped:', error);
    }
  };

  const createProfile = async (userId: string, email: string) => {
    const username = email.split('@')[0];
    const { error } = await supabase.from('profiles').insert({
      id: userId,
      username: username,
      avatar_url: `https://ui-avatars.com/api/?name=${username}&background=random`,
      bio: 'I am a Runner'
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{
      session,
      loading,
      signUp: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        // Create profile after successful signup
        if (data.user) {
          await createProfile(data.user.id, email);
        }
      },
      signIn: async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
      isCoach
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};