import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { AppState, AppStateStatus } from 'react-native';

// Define proper types for better type safety
type Chat = {
  id: string;
  username: string;
  avatar_url: string;
  last_message: string;
  last_message_at: string;
  unread: boolean;
};

type MessagesContextType = {
  chats: Chat[];
  loading: boolean;
  refreshChats: () => Promise<void>;
  markChatAsRead: (chatPartnerId: string) => Promise<void>;
  isCoach: boolean;
  canMessageUser: (userId: string) => Promise<boolean>;
  unreadCount: number;
  setActiveChat: (chatId: string | null) => void;
  activeChatId: string | null;
};

const MessagesContext = createContext<MessagesContextType>({
  chats: [],
  loading: true,
  refreshChats: async () => {},
  markChatAsRead: async () => {},
  isCoach: false,
  canMessageUser: async () => false,
  unreadCount: 0,
  setActiveChat: () => {},
  activeChatId: null
});

export const useMessages = () => useContext(MessagesContext);

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const { session } = useAuth();
  const subscriptionsRef = useRef<any[]>([]);
  const appStateRef = useRef(AppState.currentState);

  // Function to set active chat
  const setActiveChat = (chatId: string | null) => {
    console.log(`Setting active chat: ${chatId}`);
    setActiveChatId(chatId);
  };

  // Check if user is a coach
  const checkCoachStatus = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error checking coach status:', error);
        return;
      }

      setIsCoach(data?.role === 'coach');
    } catch (error) {
      console.error('Error in checkCoachStatus:', error);
    }
  };

  // Fetch all chats for the current user
  const fetchChats = async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          read,
          sender_id,
          recipient_id,
          sender:profiles!sender_id(id, username, avatar_url),
          recipient:profiles!recipient_id(id, username, avatar_url)
        `)
        .or(`sender_id.eq.${session.user.id},recipient_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching chats:', error);
        return;
      }

      // Process messages into chats
      const chatsByUser = {};
      
      messages.forEach(message => {
        const chatPartnerId = message.sender_id === session.user.id 
          ? message.recipient_id 
          : message.sender_id;
        
        if (!chatsByUser[chatPartnerId] || 
            new Date(message.created_at) > new Date(chatsByUser[chatPartnerId].last_message_at)) {
          chatsByUser[chatPartnerId] = {
            id: chatPartnerId,
            username: message.sender_id === session.user.id 
              ? message.recipient.username 
              : message.sender.username,
            avatar_url: message.sender_id === session.user.id 
              ? message.recipient.avatar_url 
              : message.sender.avatar_url,
            last_message: message.content,
            last_message_at: message.created_at,
            unread: message.recipient_id === session.user.id && !message.read
          };
        }
      });

      const sortedChats = Object.values(chatsByUser)
        .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

      setChats(sortedChats);
      updateUnreadCount();
    } catch (error) {
      console.error('Error in fetchChats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscriptions
  const setupSubscriptions = () => {
    if (!session?.user?.id) return;
    
    // Clean up existing subscriptions
    if (subscriptionsRef.current.length > 0) {
      subscriptionsRef.current.forEach(sub => {
        if (sub && typeof sub.unsubscribe === 'function') {
          sub.unsubscribe();
        }
      });
      subscriptionsRef.current = [];
    }
    
    console.log('Setting up message subscriptions');
    
    // Create a channel for new messages
    const newMessageChannel = supabase.channel('messages-new');
    
    newMessageChannel
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `or(sender_id.eq.${session.user.id},recipient_id.eq.${session.user.id})`
        }, 
        (payload) => {
          console.log('New message detected:', payload);
          
          // Only refresh if we're not in an active chat or if this message is not for the active chat
          const newMsg = payload.new;
          const isForActiveChat = activeChatId && 
            ((newMsg.sender_id === session.user.id && newMsg.recipient_id === activeChatId) ||
             (newMsg.sender_id === activeChatId && newMsg.recipient_id === session.user.id));
             
          if (!isForActiveChat) {
            fetchChats();
          }
        }
      )
      .subscribe((status) => {
        console.log(`New messages subscription status: ${status}`);
      });
      
    // Create a channel for message updates (read status)
    const updateMessageChannel = supabase.channel('messages-update');
    
    updateMessageChannel
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'messages',
          filter: `or(sender_id.eq.${session.user.id},recipient_id.eq.${session.user.id})`
        }, 
        (payload) => {
          console.log('Message change detected in update subscription:', payload);
          fetchChats();
        }
      )
      .subscribe((status) => {
        console.log('Messages update subscription status:', status);
      });

    subscriptionsRef.current.push(newMessageChannel);
    subscriptionsRef.current.push(updateMessageChannel);
  };

  // Add a dedicated function to update unread count
  const updateUnreadCount = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id')
        .eq('recipient_id', session.user.id)
        .eq('read', false);
        
      if (!error && data) {
        setUnreadCount(data.length);
      }
    } catch (error) {
      console.error('Error updating unread count:', error);
    }
  };

  const canMessageUser = async (userId) => {
    if (!isCoach) {
      const { data: existingChat } = await supabase
        .from('messages')
        .select('id')
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${session.user.id}),and(sender_id.eq.${session.user.id},recipient_id.eq.${userId})`)
        .limit(1);

      return existingChat && existingChat.length > 0;
    }

    const { data: recipient } = await supabase
      .from('profiles')
      .select('subscribed')
      .eq('id', userId)
      .single();

    return recipient?.subscribed;
  };

  const markChatAsRead = async (chatPartnerId) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', chatPartnerId)
        .eq('recipient_id', session.user.id)
        .eq('read', false);

      if (error) {
        console.error('Error marking messages as read:', error);
        return;
      }

      // Immediately update local state
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === chatPartnerId 
            ? { ...chat, unread: false }
            : chat
        )
      );

      // Broadcast the change to the channel
      const channel = supabase.channel(`user_messages:${session.user.id}`);
      channel.send({
        type: 'broadcast',
        event: 'messages_read',
        payload: { chatPartnerId }
      });

    } catch (error) {
      console.error('Error in markChatAsRead:', error);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      checkCoachStatus();
      fetchChats();
      setupSubscriptions();
      
      return () => {
        // Clean up all subscriptions
        if (subscriptionsRef.current && subscriptionsRef.current.length > 0) {
          subscriptionsRef.current.forEach(sub => {
            if (sub && typeof sub.unsubscribe === 'function') {
              sub.unsubscribe();
            }
          });
        }
      };
    }
  }, [session?.user?.id]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) && 
        nextAppState === 'active' &&
        session?.user?.id
      ) {
        console.log('App has come to the foreground, refreshing data');
        setupSubscriptions();
        fetchChats();
        updateUnreadCount();
      }
      
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [session?.user?.id]);

  return (
    <MessagesContext.Provider value={{
      chats,
      loading,
      refreshChats: fetchChats,
      markChatAsRead,
      isCoach,
      canMessageUser,
      unreadCount,
      setActiveChat,
      activeChatId
    }}>
      {children}
    </MessagesContext.Provider>
  );
}