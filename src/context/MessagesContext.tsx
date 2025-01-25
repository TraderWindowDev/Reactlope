import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const MessagesContext = createContext({});

export function useMessages() {
  return useContext(MessagesContext);
}

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (session?.user?.id) {
      checkCoachStatus();
      fetchChats();
      const cleanup = subscribeToMessages();
      return () => cleanup();
    }
  }, [session?.user?.id]);

  const subscribeToMessages = () => {
    const channel = supabase.channel(`messages_${session.user.id}`);
    
    const subscription = channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `or(sender_id.eq.${session.user.id},recipient_id.eq.${session.user.id})`,
      }, async (payload) => {
        console.log('Message change detected:', payload);
        
        // If it's an update that marks messages as read
        if (payload.eventType === 'UPDATE' && payload.new.read === true) {
          setChats(prevChats => 
            prevChats.map(chat => {
              if (chat.id === payload.new.sender_id) {
                return { ...chat, unread: false };
              }
              return chat;
            })
          );
        }
        
        await fetchChats();
      })
      .subscribe((status) => {
        console.log('Messages subscription status:', status);
      });

    return () => {
      console.log('Cleaning up messages subscription');
      channel.unsubscribe();
    };
  };

  const fetchChats = async () => {
    console.log('Fetching chats...');
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

    console.log('Updated chats:', sortedChats);
    setChats(sortedChats);
    setLoading(false);
  };

  const checkCoachStatus = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!error && data) {
      setIsCoach(data.role === 'coach');
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

      // Fetch fresh data to ensure consistency
      await fetchChats();

    } catch (error) {
      console.error('Error in markChatAsRead:', error);
    }
  };

  return (
    <MessagesContext.Provider value={{
      chats,
      loading,
      refreshChats: fetchChats,
      markChatAsRead,
      isCoach,
      canMessageUser,
      unreadCount
    }}>
      {children}
    </MessagesContext.Provider>
  );
}