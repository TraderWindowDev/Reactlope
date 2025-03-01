import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';

export function useUnreadMessages() {
  const { session } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  console.log("useUnreadMessages hook initialized");
  
  // Function to fetch unread message count
  const fetchUnreadCount = async () => {
    if (!session?.user?.id) {
      console.log("No user session, skipping unread count fetch");
      setLoading(false);
      return;
    }
    
    try {
      console.log("Fetching unread message count for user:", session.user.id);
      setLoading(true);
      
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', session.user.id)
        .eq('read', false);
      
      if (error) {
        console.error('Error fetching unread count:', error);
        return;
      }
      
      console.log("Unread message count from database:", count);
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Exception in fetchUnreadCount:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!session?.user?.id) {
      console.log("No user session, skipping subscription setup");
      return;
    }
    
    console.log("Setting up real-time subscription for unread messages");
    fetchUnreadCount();
    
    const channelId = `unread-messages-${Date.now()}`;
    console.log("Creating channel:", channelId);
    
    const channel = supabase.channel(channelId);
    
    channel
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `recipient_id=eq.${session.user.id}` 
        }, 
        (payload) => {
          console.log("New message received via subscription:", payload);
          // Check if the new message is unread
          if (payload.new && !payload.new.read) {
            console.log("Incrementing unread count");
            setUnreadCount(prev => {
              const newCount = prev + 1;
              console.log("New unread count:", newCount);
              return newCount;
            });
          }
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${session.user.id}`
        },
        (payload) => {
          console.log("Message updated via subscription:", payload);
          // If a message was marked as read, refresh the count
          fetchUnreadCount();
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });
    
    return () => {
      console.log("Cleaning up subscription");
      channel.unsubscribe();
    };
  }, [session?.user?.id]);
  
  return { unreadCount, loading, refreshUnreadCount: fetchUnreadCount };
} 