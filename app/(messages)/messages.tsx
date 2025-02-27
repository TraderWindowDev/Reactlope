import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Image, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { useMessages } from '@/src/context/MessagesContext';
import { router } from 'expo-router';
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

  useEffect(() => {
    if (isCoach) {
      fetchSubscribedUsers();
    }
    
    // Subscribe to message updates
    const userChannel = supabase.channel(`user_messages:${session.user.id}`);
    
    const subscription = userChannel
      .on('broadcast', { event: 'new_message' }, () => {
        refreshChats();
      })
      .subscribe();

    return () => {
      userChannel.unsubscribe();
    };
  }, [isCoach, session?.user?.id]);

  const fetchSubscribedUsers = async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        avatar_url,
        is_premium
      `)
      .eq('is_premium', true)
      .order('username');

    if (!error && data) {
      setSubscribedUsers(data);
    }
    setLoadingUsers(false);
  };

  const renderSubscribedUser = ({ item }) => {
    // Check if there's an existing chat in the chats array
    const existingChat = chats.find(chat => 
      chat.id === item.id || 
      chat.sender_id === item.id || 
      chat.recipient_id === item.id
    );

    return (
      <Pressable 
        style={[
          styles.userItem,
          { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff' }
        ]}
        onPress={() => router.push(`/(messages)/chat/${item.id}`)}
      >
        <Image 
          source={{ uri: item.avatar_url || 'https://via.placeholder.com/40' }}
          style={styles.avatar}
        />
        <View style={styles.userContent}>
          <Text style={[styles.username, { color: isDarkMode ? '#fff' : '#000' }]}>
            {item.username}
          </Text>
          {existingChat && (
            <Text 
              style={[styles.lastMessage, { color: isDarkMode ? '#999' : '#666' }]}
              numberOfLines={1}
            >
              {existingChat.last_message}
            </Text>
          )}
        </View>
        {!existingChat && (
          <Ionicons 
            name="chatbubble-outline" 
            size={20} 
            color={isDarkMode ? '#666' : '#999'} 
          />
        )}
      </Pressable>
    );
  };

  const renderChat = ({ item }: { item: any }) => (
    <Pressable 
      style={[
        styles.chatItem,
        { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff' }
      ]}
      onPress={() => router.push(`/(messages)/chat/${item.id}`)}
    >
      <Image 
        source={{ uri: item.avatar_url || 'https://via.placeholder.com/40' }}
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
        <Text 
          style={[styles.lastMessage, { color: isDarkMode ? '#999' : '#666' }]}
          numberOfLines={1}
        >
          {item.last_message}
        </Text>
      </View>
    </Pressable>
  );
  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#2C2C2C' : '#f0f0f0',
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
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff' }]}>
        <Ionicons 
          name="arrow-back" 
          size={24} 
          color={isDarkMode ? '#fff' : '#000'} 
          style={styles.backButton}
          onPress={() => router.back()}
        />
        <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>Meldinger</Text>
      </View>

      <View style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#f5f5f5' }]}>
        {isCoach ? (
          <FlatList
            data={subscribedUsers}
            renderItem={renderSubscribedUser}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons 
                  name="people-outline" 
                  size={48} 
                  color={isDarkMode ? '#666' : '#999'} 
                />
                <Text style={[styles.emptyText, { color: isDarkMode ? '#fff' : '#000' }]}>
                  Ingen brukere abonnert enda
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={chats}
            renderItem={renderChat}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons 
                  name="chatbubbles-outline" 
                  size={48} 
                  color={isDarkMode ? '#666' : '#999'} 
                />
                <Text style={[styles.emptyText, { color: isDarkMode ? '#fff' : '#000' }]}>
                  Ingen meldinger enda
                </Text>
              </View>
            }
          />
        )}
      </View>
    </>
  );
}

