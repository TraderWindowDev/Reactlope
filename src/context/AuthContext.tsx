'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitialized(true);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (isInitialized) {
        // Wrap navigation in setTimeout to ensure root layout is mounted
        setTimeout(() => {
          if (session) {
            router.replace('/(tabs)');
          } else {
            router.replace('/(auth)/login');
          }
        }, 0);
      }
    });
  }, [isInitialized]);

  const createProfile = async (userId: string, email: string) => {
    const username = email.split('@')[0]; // Create username from email
    const { error } = await supabase.from('profiles').insert({
      id: userId,
      username: username,
      avatar_url: `https://ui-avatars.com/api/?name=${username}&background=random`,
      bio: 'I am a Runner'
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    
    // Create profile after successful signup
    if (data.user) {
      await createProfile(data.user.id, email);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{
      session,
      signUp: (data) => supabase.auth.signUp(data),
      signIn: (data) => supabase.auth.signInWithPassword(data),
      signOut: () => supabase.auth.signOut(),
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