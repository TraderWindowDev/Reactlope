import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Image, ActivityIndicator, Platform, AppState, AppStateStatus } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { useMessages } from '@/src/context/MessagesContext';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';

export default function MessagesScreen() {
  const { isDarkMode } = useTheme();
  const { chats, loading, isCoach, refreshChats } = useMessages();
  const { session } = useAuth();
  const [subscribedUsers, setSubscribedUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const subscriptionRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const [localChats, setLocalChats] = useState([]);
  const [localLoading, setLocalLoading] = useState(true);

  // Use either local or context chats, prioritizing local for faster updates
  const displayChats = localChats.length > 0 ? localChats : chats;

  // Function to fetch chats directly
  const fetchLocalChats = async () => {
    if (!session?.user?.id) return;
    
    console.log('Fetching chats directly in messages screen...');
    setLocalLoading(true);
    
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
        console.error('Error fetching chats in messages screen:', error);
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

      console.log('Updated local chats in messages screen:', sortedChats.length);
      setLocalChats(sortedChats);
    } catch (error) {
      console.error('Error in fetchLocalChats:', error);
    } finally {
      setLocalLoading(false);
    }
  };

  // Set up subscription with a single reliable approach
  const setupSubscription = () => {
    if (!session?.user?.id) return;
    
    // Clean up existing subscription
    if (subscriptionRef.current) {
      if (Array.isArray(subscriptionRef.current)) {
        subscriptionRef.current.forEach(channel => {
          if (channel && typeof channel.unsubscribe === 'function') {
            channel.unsubscribe();
          }
        });
      } else if (subscriptionRef.current && typeof subscriptionRef.current.unsubscribe === 'function') {
        subscriptionRef.current.unsubscribe();
      }
    }
    
    console.log('Setting up messages screen subscription');
    
    // Create a single channel for all message changes
    const channel = supabase.channel('messages-screen');
    
    channel
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages'
        }, 
        (payload) => {
          fetchLocalChats();
        }
      )
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'messages'
        }, 
        (payload) => {
          console.log('Message updated in messages screen:', payload);
          fetchLocalChats();
        }
      )
      .subscribe((status) => {
        console.log(`Messages screen subscription status: ${status}`);
      });
    
    subscriptionRef.current = channel;
  };

  // Initial setup
  useEffect(() => {
    if (session?.user?.id) {
      if (isCoach) {
        fetchSubscribedUsers();
      }
      
      fetchLocalChats();
      setupSubscription();
      
      // Listen for app state changes
      const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
        if (
          appStateRef.current.match(/inactive|background/) && 
          nextAppState === 'active'
        ) {
          console.log('App has come to the foreground, refreshing messages screen');
          fetchLocalChats();
          setupSubscription();
        }
        
        appStateRef.current = nextAppState;
      });
      
      return () => {
        console.log('Cleaning up messages screen resources');
        if (subscriptionRef.current) {
          if (Array.isArray(subscriptionRef.current)) {
            subscriptionRef.current.forEach(channel => {
              if (channel && typeof channel.unsubscribe === 'function') {
                channel.unsubscribe();
              }
            });
          } else if (subscriptionRef.current && typeof subscriptionRef.current.unsubscribe === 'function') {
            subscriptionRef.current.unsubscribe();
          }
        }
        subscription.remove();
      };
    }
  }, [session?.user?.id, isCoach]);

  // Refresh on screen focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('Messages screen focused, refreshing chats');
      if (session?.user?.id) {
        fetchLocalChats();
        refreshChats(); // Also refresh the context for consistency
      }
      return () => {};
    }, [session?.user?.id])
  );

  // Update local chats when context chats change (as a fallback)
  useEffect(() => {
    if (chats.length > 0 && (!localChats.length || new Date(chats[0]?.last_message_at) > new Date(localChats[0]?.last_message_at))) {
      console.log('Context chats updated, syncing with local chats');
      setLocalChats(chats);
    }
  }, [chats]);

  const fetchSubscribedUsers = async () => {
    if (!session?.user?.id) return;
    
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('is_premium', true);

      if (error) {
        console.error('Error fetching subscribed users:', error);
        return;
      }

      setSubscribedUsers(data || []);
    } catch (error) {
      console.error('Error in fetchSubscribedUsers:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const navigateToChat = (userId) => {
    router.push(`/chat/${userId}`);
  };

  const renderChatItem = ({ item }) => {
    return (
      <Pressable
        style={[
          styles.chatItem,
          { backgroundColor: isDarkMode ? '#000b15' : '#f5f5f5', borderBottomWidth: 0.2, borderBottomColor: isDarkMode ? '#6A3DE8' : '#f0f0f0' }
        ]}
        onPress={() => navigateToChat(item.id)}
      >
        <Image
          source={{ uri: item.avatar_url || require('@/assets/images/LP.png') }}
          style={styles.avatar}
        />
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={[styles.username, { color: isDarkMode ? '#fff' : '#000' }]}>
              {item.username}
            </Text>
            <Text style={styles.time}>
              {formatDistanceToNow(new Date(item.last_message_at), { addSuffix: true })}
            </Text>
          </View>
          <View style={styles.messageRow}>
            <Text 
              style={[
                styles.lastMessage, 
                { color: isDarkMode ? '#ccc' : '#666' },
                item.unread && styles.unreadMessage
              ]}
              numberOfLines={1}
            >
              {item.last_message}
            </Text>
            {item.unread && (
              <View style={styles.unreadIndicator} />
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  const renderCoachSection = () => {
    if (!isCoach) return null;

    return (
      <View style={[styles.coachSection, { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff' }]}>
        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
          Premium Athletes
        </Text>
        {loadingUsers ? (
          <ActivityIndicator size="small" color="#0047AB" />
        ) : (
          <FlatList
            data={subscribedUsers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.userItem}
                onPress={() => navigateToChat(item.id)}
              >
                <Image
                  source={{ uri: item.avatar_url || 'https://via.placeholder.com/40' }}
                  style={styles.smallAvatar}
                />
                <Text style={[styles.smallUsername, { color: isDarkMode ? '#fff' : '#000' }]}>
                  {item.username}
                </Text>
              </Pressable>
            )}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        )}
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',

      padding: 16,
      borderBottomWidth: 0.2,
      borderBottomColor: isDarkMode ? '#6A3DE8' : '#f0f0f0',
      paddingTop: Platform.OS === 'ios' ? 60 : 20,
    },
    backButton: {
      marginRight: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    chatItem: {
      flexDirection: 'row',
      padding: 16,
      alignItems: 'center',
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginRight: 12,
    },
    chatContent: {
      flex: 1,
    },
    chatHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
      
    },
    username: {
      fontSize: 16,
      fontWeight: '500',
    },
    time: {
      fontSize: 12,
      color: '#999',
    },
    lastMessage: {
      fontSize: 14,
    },
    separator: {
      height: 1,
      backgroundColor: '#eee',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    emptyText: {
      marginTop: 8,
      fontSize: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      backgroundColor: isDarkMode ? '#05101a' : '#f5f5f5',
      alignItems: 'center',
    },
    userItem: {
      flexDirection: 'row',
      padding: 16,
      alignItems: 'center',
    },
    userContent: {
      flex: 1,
      marginLeft: 12,
    },
    coachSection: {
      padding: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 12,
    },
    smallAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    smallUsername: {
      fontSize: 16,
      fontWeight: '500',
    },
    messageRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    unreadIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#0047AB',
      marginLeft: 8,
    },
    unreadMessage: {
      fontWeight: 'bold',
    },
  });

  if (loading || loadingUsers) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={isDarkMode ? '#fff' : '#0047AB'} />
      </View>
    );
  }

  return (
    <>
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#000b15' : '#fff' }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#fff' : '#000'} />
        </Pressable>
        <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>Meldinger</Text>
      </View>

      <View style={[styles.container, { backgroundColor: isDarkMode ? '#05101a' : '#f5f5f5' }]}>
        {renderCoachSection()}

        {localLoading && displayChats.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0047AB" />
          </View>
        ) : displayChats.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={64} color={isDarkMode ? '#666' : '#999'} />
            <Text style={[styles.emptyText, { color: isDarkMode ? '#666' : '#999' }]}>
              No messages yet
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayChats}
            renderItem={renderChatItem}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </>
  );
}

