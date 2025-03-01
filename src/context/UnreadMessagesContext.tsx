import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

type UnreadMessagesContextType = {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;
  resetUnreadCount: () => void;
};

const UnreadMessagesContext = createContext<UnreadMessagesContextType | undefined>(undefined);

// Add a debounce function to prevent too many re-renders
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

export const UnreadMessagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { session } = useAuth();
  const debouncedUnreadCount = useDebounce(unreadCount, 300); // Debounce for 300ms
  
  // Load unread messages count when session changes
  useEffect(() => {
    if (session?.user?.id) {
      loadUnreadMessagesCount(session.user.id);
      
      // Subscribe to new messages
      const subscription = supabase
        .channel('messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${session.user.id}`,
        }, (payload) => {
          console.log('New message received via subscription:', payload);
          
          // Check if the message is unread
          if (payload.new && !payload.new.read) {
            console.log('Incrementing unread count');
            incrementUnreadCount();
          }
        })
        .subscribe();
        
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [session?.user?.id]);
  
  const loadUnreadMessagesCount = async (userId: string) => {
    try {
      console.log('Loading unread messages count for user:', userId);
      
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('read', false);
        
      if (error) {
        console.error('Error loading unread messages count:', error);
        return;
      }
      
      console.log('Unread messages count:', count);
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Exception loading unread messages count:', error);
    }
  };
  
  const incrementUnreadCount = () => {
    setUnreadCount(prev => prev + 1);
    console.log('New unread count:', unreadCount + 1);
  };
  
  const decrementUnreadCount = () => {
    setUnreadCount(prev => Math.max(0, prev - 1));
  };
  
  const resetUnreadCount = () => {
    setUnreadCount(0);
  };
  
  return (
    <UnreadMessagesContext.Provider value={{ 
      unreadCount: debouncedUnreadCount, // Use the debounced value
      setUnreadCount, 
      incrementUnreadCount, 
      decrementUnreadCount, 
      resetUnreadCount 
    }}>
      {children}
    </UnreadMessagesContext.Provider>
  );
};

export const useUnreadMessages = () => {
  const context = useContext(UnreadMessagesContext);
  if (context === undefined) {
    throw new Error('useUnreadMessages must be used within an UnreadMessagesProvider');
  }
  return context;
}; 