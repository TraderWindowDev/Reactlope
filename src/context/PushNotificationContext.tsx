import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { registerForPushNotificationsAsync } from '../utils/notifications';
import { useRouter } from 'expo-router';

type PushNotificationContextType = {
  pushToken: string | null;
  setPushToken: (token: string | null) => void;
  sendPushNotification: (to: string, title: string, body: string, data?: any) => Promise<any>;
  expoPushToken: string | null;
};

const PushNotificationContext = createContext<PushNotificationContextType | undefined>(undefined);

export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const { session } = useAuth();
  const router = useRouter();

  // Initialize push notifications
  useEffect(() => {
    if (!session?.user?.id) return;

    const initPushNotifications = async () => {
      try {
        // Configure notification handler
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });

        // Get the token from the database
        const { data, error } = await supabase
          .from('user_push_tokens')
          .select('token')
          .eq('user_id', session.user.id)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error fetching push token:', error);
          return;
        }

        if (data && data.length > 0) {
          console.log('Found existing push token in database:', data[0].token);
          setPushToken(data[0].token);
        } else {
          console.log('No push token found in database, registering new token');
          const token = await registerForPushNotificationsAsync();
          if (token) {
            setPushToken(token);
            setExpoPushToken(token);
            
            // Save the token to the database
            const { error: saveError } = await supabase
              .from('user_push_tokens')
              .insert({
                user_id: session.user.id,
                token: token,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              
            if (saveError) {
              console.error('Error saving push token:', saveError);
            }
          }
        }
      } catch (error) {
        console.error('Error initializing push notifications:', error);
      }
    };

    initPushNotifications();
  }, [session?.user?.id]);

  // Function to send push notifications
  const sendPushNotification = async (to: string, title: string, body: string, data: any = {}) => {
    try {
      console.log('Sending push notification:', { to, title, body, data });
      
      const message = {
        to,
        title,
        body,
        data,
      };
      
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
      
      const responseData = await response.json();
      console.log('Push notification response:', responseData);
      
      if (responseData.data && responseData.data.status === 'ok') {
        console.log('Push notification sent successfully');
        return responseData;
      } else {
        console.warn('Push notification may not have been delivered:', responseData);
        return responseData;
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
      return { error };
    }
  };

  // Add this to your PushNotificationProvider component
  useEffect(() => {
    // Set up notification received handler
    const notificationReceivedSubscription = Notifications.addNotificationReceivedListener(
      notification => {
        console.log('Notification received while app is open:', notification);
        // You can play a sound or show an in-app notification here
      }
    );

    // Set up notification response handler (when user taps on notification)
    const notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener(
      response => {
        console.log('Notification response received:', response);
        const { notification } = response;
        const data = notification.request.content.data;
        
        // Handle different notification types
        if (data.type === 'message') {
          // Navigate to the chat screen
          router.push(`/chat/${data.senderId}`);
        } else if (data.type === 'follow') {
          // Navigate to the user's profile
          router.push(`/profile/${data.senderId}`);
        } else if (data.type === 'like' || data.type === 'comment') {
          // Navigate to the post
          router.push(`/post/${data.postId}`);
        }
      }
    );

    // Clean up the subscriptions
    return () => {
      notificationReceivedSubscription.remove();
      notificationResponseSubscription.remove();
    };
  }, [router]);

  return (
    <PushNotificationContext.Provider value={{
      pushToken,
      setPushToken,
      sendPushNotification,
      expoPushToken
    }}>
      {children}
    </PushNotificationContext.Provider>
  );
}

export const usePushNotification = () => {
  const context = useContext(PushNotificationContext);
  if (context === undefined) {
    throw new Error('usePushNotification must be used within a PushNotificationProvider');
  }
  return context;
}; 