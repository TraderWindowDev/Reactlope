import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { AppState, AppStateStatus } from 'react-native';

// Define types
type Chat = {
  id: string;
  username: string;
  avatar_url?: string;
  last_message: string;
  last_message_at: string;
  unread: boolean;
};

type MessagesContextType = {
  chats: Chat[];
  loading: boolean;
  unreadCount: number;
  isCoach: boolean;
  refreshChats: () => Promise<void>;
};

// Create context
const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

// Export the hook first to ensure it's available
export const useMessages = () => {
  const context = useContext(MessagesContext);
  if (context === undefined) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return context;
};

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { session, userProfile } = useAuth();
  const isCoach = userProfile?.role === 'coach';
  const appStateRef = useRef(AppState.currentState);
  const subscriptionRef = useRef<any>(null);

  // Function to fetch chats
  const fetchChats = async () => {
    if (!session?.user?.id) return;
    
    try {
      console.log('Fetching chats in MessagesContext...');
      setLoading(true);
      
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
        console.error('Error fetching messages:', error);
        setLoading(false);
        return;
      }

      // Process messages into chats
      const chatsByUser = {};
      let unreadMessages = 0;
      
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
        
        // Count unread messages
        if (message.recipient_id === session.user.id && !message.read) {
          unreadMessages++;
        }
      });

      const sortedChats = Object.values(chatsByUser)
        .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

      console.log('Updated chats in MessagesContext:', sortedChats.length);
      console.log('Unread messages count:', unreadMessages);
      
      setChats(sortedChats);
      setUnreadCount(unreadMessages);
    } catch (error) {
      console.error('Error in fetchChats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle new message
  const handleNewMessage = async (payload) => {
    
    if (!payload.new) return;
    
    const message = payload.new;
    const chatPartnerId = message.sender_id === session?.user?.id 
      ? message.recipient_id 
      : message.sender_id;
    
    // Fetch the chat partner's profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', chatPartnerId)
      .single();
      
    if (profileError) {
      console.error('Error fetching profile for new message:', profileError);
      // Refresh all chats as fallback
      fetchChats();
      return;
    }
    
    // Update chats state
    setChats(prevChats => {
      // Find if chat already exists
      const existingChatIndex = prevChats.findIndex(chat => chat.id === chatPartnerId);
      
      // Create new chat object
      const newChat = {
        id: chatPartnerId,
        username: profileData.username,
        avatar_url: profileData.avatar_url,
        last_message: message.content,
        last_message_at: message.created_at,
        unread: message.recipient_id === session?.user?.id && !message.read
      };
      
      // If chat exists, update it
      if (existingChatIndex !== -1) {
        // Only update if this message is newer
        if (new Date(message.created_at) > new Date(prevChats[existingChatIndex].last_message_at)) {
          const updatedChats = [...prevChats];
          updatedChats[existingChatIndex] = newChat;
          
          // Sort chats by last message date
          return updatedChats.sort((a, b) => 
            new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
          );
        }
        return prevChats;
      } 
      
      // If chat doesn't exist, add it
      return [newChat, ...prevChats].sort((a, b) => 
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
    });
    
    // Update unread count if needed
    if (message.recipient_id === session?.user?.id && !message.read) {
      setUnreadCount(prev => prev + 1);
    }
  };

  // Set up subscription
  const setupSubscription = () => {
    if (!session?.user?.id) return;
    
    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }
    
    console.log('Setting up messages subscription in context');
    
    const channel = supabase.channel('messages-changes');
    
    channel
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `or(sender_id.eq.${session.user.id},recipient_id.eq.${session.user.id})`
        }, 
        (payload) => {
          console.log('Message inserted, handling in real-time');
          handleNewMessage(payload);
        }
      )
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'messages',
          filter: `or(sender_id.eq.${session.user.id},recipient_id.eq.${session.user.id})`
        }, 
        () => {
          console.log('Message updated, refreshing chats');
          fetchChats();
        }
      )
      .subscribe((status) => {
        console.log('Messages subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to messages changes');
        }
      });
      
    subscriptionRef.current = channel;
  };

  // Handle app state changes
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('App has come to the foreground, refreshing chats');
      fetchChats();
    }
    appStateRef.current = nextAppState;
  };

  // Initial setup
  useEffect(() => {
    if (!session?.user?.id) return;
    
    console.log('Setting up MessagesContext');
    fetchChats();
    setupSubscription();
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      console.log('Cleaning up MessagesContext');
      if (subscriptionRef.current) {
        console.log('Unsubscribing from messages channel');
        subscriptionRef.current.unsubscribe();
      }
      subscription.remove();
    };
  }, [session?.user?.id]);

  return (
    <MessagesContext.Provider value={{
      chats,
      loading,
      unreadCount,
      isCoach,
      refreshChats: fetchChats
    }}>
      {children}
    </MessagesContext.Provider>
  );
}