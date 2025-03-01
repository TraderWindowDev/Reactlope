import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';

// Define the notification type
type Notification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  created_at: string;
  sender_id?: string;
  sender?: {
    username?: string;
    avatar_url?: string;
  };
};

type NotificationContextType = {
  notifications: Notification[];
  loading: boolean;
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  sendPushNotification: (token: string, title: string, body: string, data: any) => Promise<any>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter(); 

  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications();
      const cleanup = subscribeToNotifications();
      return () => cleanup();
    }
  }, [session?.user?.id]);

  const subscribeToNotifications = () => {
    if (!session?.user?.id) return () => {};
    
    const channel = supabase.channel(`notifications_${session.user.id}`);
    
    const subscription = channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${session.user.id}`,
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const fetchNotifications = async () => {
    if (!session?.user?.id) {
      console.log('No session user');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          sender:profiles!sender_id(username, avatar_url)
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data || []);
      
      // Update unread count
      const unreadNotifications = data?.filter(n => !n.read) || [];
      setUnreadCount(unreadNotifications.length);
      
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    if (!session?.user?.id) return;

    try {
      console.log('Marking all notifications as read...');
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', session.user.id)
        .eq('read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      // Refresh notifications to update the UI and unread count
      await fetchNotifications();
      
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
    }
  };

  const sendPushNotification = async (token: string, title: string, body: string, data: any = {}) => {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          title,
          body,
          data,
          sound: 'default',
          badge: 1,
        }),
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return null;
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      loading,
      unreadCount,
      markAsRead: async (id: string) => {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', id);
        
        if (error) {
          console.error('Error marking notification as read:', error);
        } else {
          fetchNotifications();
        }
      },
      markAllAsRead,
      refreshNotifications: fetchNotifications,
      sendPushNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};