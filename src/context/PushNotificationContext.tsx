import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

type PushNotificationContextType = {
  pushToken: string | null;
  setPushToken: (token: string | null) => void;
  sendPushNotification: (to: string, title: string, body: string, data?: any) => Promise<boolean>;
};

const PushNotificationContext = createContext<PushNotificationContextType | undefined>(undefined);

export const PushNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const { session } = useAuth();
  
  // Load the token from the database when the session changes
  useEffect(() => {
    if (session?.user?.id) {
      loadPushToken(session.user.id);
    }
  }, [session?.user?.id]);
  
  const loadPushToken = async (userId: string) => {
    try {
      console.log('Loading push token for user:', userId);
      
      const { data, error } = await supabase
        .from('user_push_tokens')
        .select('token')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1);
        
      if (error) {
        console.error('Error loading push token:', error);
        return;
      }
      
      if (data && data.length > 0) {
        console.log('Found push token in database:', data[0].token);
        setPushToken(data[0].token);
      } else {
        console.log('No push token found in database for user:', userId);
      }
    } catch (error) {
      console.error('Exception loading push token:', error);
    }
  };
  
  const sendPushNotification = async (to: string, title: string, body: string, data: any = {}) => {
    try {
      console.log('Sending push notification:', { to, title, body, data });
      
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          title,
          body,
          data,
          sound: 'default',
          badge: 1,
        }),
      });
      
      const responseData = await response.json();
      console.log('Push notification response:', responseData);
      
      if (responseData.data && responseData.data.status === 'error') {
        console.log('Push notification failed:', responseData.data.message);
        
        if (responseData.data.details && responseData.data.details.error === 'DeviceNotRegistered') {
          console.log('Token is invalid, removing from database');
          
          // Remove the invalid token
          if (session?.user?.id) {
            await supabase
              .from('user_push_tokens')
              .delete()
              .eq('token', to);
          }
        }
        
        return false;
      }
      
      console.log('Push notification sent successfully');
      return true;
    } catch (error) {
      console.error('Exception sending push notification:', error);
      return false;
    }
  };
  
  return (
    <PushNotificationContext.Provider value={{ pushToken, setPushToken, sendPushNotification }}>
      {children}
    </PushNotificationContext.Provider>
  );
};

export const usePushNotification = () => {
  const context = useContext(PushNotificationContext);
  if (context === undefined) {
    throw new Error('usePushNotification must be used within a PushNotificationProvider');
  }
  return context;
}; 