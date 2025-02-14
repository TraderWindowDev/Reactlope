'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';
import { registerForPushNotificationsAsync, saveNotificationToken } from '@/src/utils/notifications';

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isCoach: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCoach, setIsCoach] = useState<boolean>(false);

  const checkUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (!error && data) {
      setIsCoach(data.role === 'coach' || false);
    }
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        checkUserRole(session.user.id);
      } else {
        setLoading(false);
      }
      setIsInitialized(true);
    });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        await checkUserRole(session.user.id);
      } else {
        setIsCoach(false);
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (session?.user) {
      setupNotifications();
    }
  }, [session]);

  const setupNotifications = async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await saveNotificationToken(session!.user.id, token);
      }
    } catch (error) {
      console.error('Error setting up notifications:', error);
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
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};