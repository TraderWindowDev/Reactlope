'use client';

import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';
import { registerForPushNotificationsAsync, saveNotificationToken, savePushToken } from '@/src/utils/notifications';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any, data: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  isCoach: boolean;
  userProfile: any;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Initialize session from storage first
    const initializeAuth = async () => {
      try {
        // Debug: Check what's in AsyncStorage
        const keys = await AsyncStorage.getAllKeys();
        console.log('AsyncStorage keys:', keys);
        
        // Try to manually get the session from AsyncStorage
        const supabaseSessionKey = keys.find(key => key.includes('supabase.auth.token'));
        if (supabaseSessionKey) {
          const sessionData = await AsyncStorage.getItem(supabaseSessionKey);
          console.log('Found session data in storage:', !!sessionData);
        } else {
          console.log('No session key found in AsyncStorage');
        }
        
        // Get the initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('Session restored from storage');
          setSession(session);
          checkIfCoach(session.user.id);
          fetchUserProfile(session.user.id);
          setupNotifications();
        }
        
        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log('Auth state changed:', event);
            
            if (event === 'INITIAL_SESSION') {
              if (newSession) {
                console.log('Session restored successfully');
                setSession(newSession);
                checkIfCoach(newSession.user.id);
                fetchUserProfile(newSession.user.id);
                setupNotifications();
              } else {
                console.log('No initial session found');
                setSession(null);
              }
            } else if (event === 'SIGNED_IN') {
              console.log('User signed in');
              setSession(newSession);
              if (newSession) {
                checkIfCoach(newSession.user.id);
                fetchUserProfile(newSession.user.id);
                setupNotifications();
              }
            } else if (event === 'SIGNED_OUT') {
              console.log('User signed out');
              setSession(null);
              setUserProfile(null);
            } else if (event === 'TOKEN_REFRESHED') {
              console.log('Token refreshed');
              setSession(newSession);
            }
            
            // Always update loading state after processing auth events
            setLoading(false);
          }
        );
        
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      // Register for push notifications when user logs in
      const registerPushNotifications = async () => {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          await savePushToken(session.user.id, token);
        }
      };
      
      registerPushNotifications();
    }
  }, [session?.user?.id]);

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }
      
      setUserProfile(data);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  const setupNotifications = async () => {
    try {
      if (!session) {
        console.log('No session available for notification setup');
        return;
      }

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
      
      if (token && session.user) {
        await saveNotificationToken(session.user.id, token.data);
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

  const checkIfCoach = async (userId: string) => {
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
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error.message);
        return { error };
      }

      console.log('Sign in successful, session created:', !!data.session);
      
      // Explicitly store the session
      if (data.session) {
        setSession(data.session);
        checkIfCoach(data.session.user.id);
        fetchUserProfile(data.session.user.id);
      }

      return { error: null };
    } catch (error) {
      console.error('Unexpected error during sign in:', error);
      return { error };
    } finally {
      setLoading(false);
    }
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
      signIn,
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
      resetPassword: async (email: string) => {
        // Implementation needed
      },
      updatePassword: async (password: string) => {
        // Implementation needed
      },
      isCoach,
      userProfile
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