import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { usePushNotification } from '@/src/context/PushNotificationContext';

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const { session } = useAuth();
  const { isDarkMode } = useTheme();
  const { sendPushNotification } = usePushNotification();
  
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [chatPartner, setChatPartner] = useState(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  
  const flatListRef = useRef(null);
  const channelRef = useRef(null);
  const MESSAGES_PER_PAGE = 10;
  
  // Function to mark chat as read
  const markChatAsRead = async () => {
    try {
      if (!session?.user?.id || !id) return;
      
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', id)
        .eq('recipient_id', session.user.id)
        .eq('read', false);
      
      console.log('Marked messages as read');
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  };
  
  // Function to fetch initial messages (most recent 10)
  const fetchMessages = async () => {
    console.log('Fetching initial messages...');
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles!sender_id(username, avatar_url)')
        .or(`and(sender_id.eq.${session.user.id},recipient_id.eq.${id}),` +
             `and(sender_id.eq.${id},recipient_id.eq.${session.user.id})`)
        .order('created_at', { ascending: false }) // Descending to get most recent first
        .limit(MESSAGES_PER_PAGE);
      
      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }
      
      console.log(`Fetched ${data.length} messages`);
      
      // Reverse to display in chronological order
      setMessages(data.reverse());
      
      // Check if we might have more messages
      setHasMoreMessages(data.length === MESSAGES_PER_PAGE);
      
      // Scroll to bottom
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: false });
        }
      }, 300);
      
      // Mark messages as read
      markChatAsRead();
    } catch (error) {
      console.error('Exception in fetchMessages:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to load older messages
  const loadMoreMessages = async () => {
    if (loadingMore || !hasMoreMessages || messages.length === 0) return;
    
    setLoadingMore(true);
    console.log('Loading more messages...');
    
    try {
      // Get the oldest message we currently have
      const oldestMessage = messages[0];
      
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles!sender_id(username, avatar_url)')
        .or(`and(sender_id.eq.${session.user.id},recipient_id.eq.${id}),` +
             `and(sender_id.eq.${id},recipient_id.eq.${session.user.id})`)
        .lt('created_at', oldestMessage.created_at) // Get messages older than our oldest
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);
      
      if (error) {
        console.error('Error loading more messages:', error);
        return;
      }
      
      console.log(`Loaded ${data.length} more messages`);
      
      if (data.length > 0) {
        // Add older messages to the beginning
        setMessages(prevMessages => [...data.reverse(), ...prevMessages]);
      }
      
      // Check if we have more messages to load
      setHasMoreMessages(data.length === MESSAGES_PER_PAGE);
    } catch (error) {
      console.error('Exception in loadMoreMessages:', error);
    } finally {
      setLoadingMore(false);
    }
  };
  
  // Fetch chat partner info
  const fetchChatPartner = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching chat partner:', error);
        return;
      }
      
      setChatPartner(data);
    } catch (error) {
      console.error('Error in fetchChatPartner:', error);
    }
  };
  
  // Send a message
  const sendMessage = async () => {
    if (!messageText.trim() || !session?.user?.id || !id) return;
    
    try {
      const newMessage = {
        sender_id: session.user.id,
        recipient_id: id,
        content: messageText.trim(),
        read: false,
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('messages')
        .insert(newMessage)
        .select()
        .single();
        
      if (error) {
        console.error('Error sending message:', error);
        return;
      }
      
      setMessageText('');
      
      // Send push notification for the new message
      await sendPushNotificationForMessage(data);
      
    } catch (error) {
      console.error('Exception in sendMessage:', error);
    }
  };
  
  // Update the sendPushNotificationForMessage function
  const sendPushNotificationForMessage = async (message) => {
    try {
      console.log("Attempting to send push notification for message:", message.id);
      
      // Only send notifications for messages sent by the current user
      if (message.sender_id !== session?.user?.id) {
        console.log("Not sending push notification for message from another user");
        return;
      }
      
      // Get recipient's push token
      const { data: tokenData, error: tokenError } = await supabase
        .from('user_push_tokens')
        .select('token')
        .eq('user_id', message.recipient_id)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (tokenError) {
        console.error('Error fetching recipient push token:', tokenError);
        return;
      }
      
      if (!tokenData || tokenData.length === 0) {
        console.log('No push token found for recipient:', message.recipient_id);
        return;
      }
      
      const recipientToken = tokenData[0].token;
      console.log('Found recipient push token:', recipientToken);
      
      // Get sender profile for notification
      const { data: senderProfile, error: senderError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', message.sender_id)
        .single();
        
      if (senderError) {
        console.error('Error fetching sender profile:', senderError);
        return;
      }
      
      // Send the push notification
      const success = await sendPushNotification(
        recipientToken,
        `New message from ${senderProfile.username}`,
        message.content,
        {
          type: 'message',
          senderId: message.sender_id,
          messageId: message.id
        }
      );
      
      console.log('Push notification sent:', success);
      
    } catch (error) {
      console.error('Exception sending push notification for message:', error);
    }
  };
  
  // Set up real-time subscription
  const setupRealtimeSubscription = () => {
    try {
      const channel = supabase.channel(`chat-${Date.now()}`);
      
      channel
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages'
          }, 
          (payload) => {
            console.log('New message received');
            
            // Check if this message is relevant to our conversation
            const newMsg = payload.new;
            if ((newMsg.sender_id === session.user.id && newMsg.recipient_id === id) ||
                (newMsg.sender_id === id && newMsg.recipient_id === session.user.id)) {
              
              // Fetch the complete message with sender info
              const fetchNewMessage = async () => {
                const { data, error } = await supabase
                  .from('messages')
                  .select('*, sender:profiles!sender_id(username, avatar_url)')
                  .eq('id', newMsg.id)
                  .single();
                
                if (!error && data) {
                  setMessages(prev => [...prev, data]);
                  
                  // Scroll to bottom
                  setTimeout(() => {
                    if (flatListRef.current) {
                      flatListRef.current.scrollToEnd({ animated: true });
                    }
                  }, 100);
                }
              };
              
              fetchNewMessage();
            }
          }
        )
        .subscribe();
      
      channelRef.current = channel;
    } catch (error) {
      console.error('Error setting up subscription:', error);
    }
  };
  
  // Initialize
  useEffect(() => {
    if (session?.user?.id && id) {
      fetchChatPartner();
      fetchMessages();
      setupRealtimeSubscription();
      
      return () => {
        if (channelRef.current) {
          channelRef.current.unsubscribe();
        }
      };
    }
  }, [session?.user?.id, id]);
  
  // Header component
  const ChatHeader = () => {
    const headerBgColor = isDarkMode ? '#222' : '#fff';
    const borderColor = isDarkMode ? '#333' : '#eee';
    
    return (
      <SafeAreaView style={{ backgroundColor: headerBgColor }}>
        <View style={[styles.header, { backgroundColor: headerBgColor, borderBottomColor: borderColor }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#fff' : '#000'} />
          </TouchableOpacity>
          
          <View style={styles.headerProfile}>
            {chatPartner?.avatar_url ? (
              <Image 
                source={{ uri: chatPartner.avatar_url }} 
                style={styles.avatar} 
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: isDarkMode ? '#333' : '#eee' }]}>
                <Text style={{ color: isDarkMode ? '#fff' : '#000' }}>
                  {chatPartner?.username?.charAt(0) || '?'}
                </Text>
              </View>
            )}
            
            <Text style={[styles.username, { color: isDarkMode ? '#fff' : '#000' }]}>
              {chatPartner?.username || 'Loading...'}
            </Text>
          </View>
          
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>
    );
  };
  
  // Simple message bubble component
  const MessageBubble = ({ message }) => {
    const isOwnMessage = message.sender_id === session?.user?.id;
    
    return (
      <View style={{
        flexDirection: 'row',
        marginVertical: 4,
        marginHorizontal: 8,
        alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
      }}>
        {!isOwnMessage && (
          <View style={{ marginRight: 8 }}>
            {message.sender?.avatar_url ? (
              <Image 
                source={{ uri: message.sender.avatar_url }} 
                style={{ width: 32, height: 32, borderRadius: 16 }} 
              />
            ) : (
              <View style={{ 
                width: 32, 
                height: 32, 
                borderRadius: 16, 
                backgroundColor: '#ccc',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Text>
                  {message.sender?.username?.charAt(0) || '?'}
                </Text>
              </View>
            )}
          </View>
        )}
        
        <View style={{
          backgroundColor: isOwnMessage ? '#0084ff' : (isDarkMode ? '#333' : '#e5e5ea'),
          borderRadius: 18,
          padding: 12,
          maxWidth: '70%',
        }}>
          <Text style={{
            color: isOwnMessage ? '#fff' : (isDarkMode ? '#fff' : '#000'),
          }}>
            {message.content}
          </Text>
        </View>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#222' : '#fff' }}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ChatHeader />
      
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#0084ff" />
            <Text style={{ marginTop: 10, color: isDarkMode ? '#fff' : '#000' }}>
              Loading messages...
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => `message-${item.id}`}
            renderItem={({ item }) => <MessageBubble message={item} />}
            contentContainerStyle={{ paddingVertical: 16 }}
            ListHeaderComponent={
              hasMoreMessages ? (
                <TouchableOpacity
                  onPress={loadMoreMessages}
                  style={{
                    padding: 10,
                    backgroundColor: isDarkMode ? '#333' : '#f0f0f0',
                    borderRadius: 8,
                    marginBottom: 16,
                    alignItems: 'center',
                  }}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <ActivityIndicator size="small" color="#0084ff" />
                  ) : (
                    <Text style={{ color: isDarkMode ? '#fff' : '#000' }}>Load Earlier Messages</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={{ padding: 10, alignItems: 'center' }}>
                  <Text style={{ color: isDarkMode ? '#999' : '#666', fontSize: 12 }}>
                    Beginning of conversation
                  </Text>
                </View>
              )
            }
            ListEmptyComponent={
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <Text style={{ color: isDarkMode ? '#fff' : '#000' }}>No messages yet. Say hello!</Text>
              </View>
            }
          />
        )}
        
        {/* Fixed input at bottom */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'position' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={{
            flexDirection: 'row',
            padding: 10,
            borderTopWidth: 1,
            borderTopColor: isDarkMode ? '#333' : '#eee',
            backgroundColor: isDarkMode ? '#222' : '#fff',
          }}>
            <TextInput
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 20,
                backgroundColor: isDarkMode ? '#444' : '#f0f0f0',
                color: isDarkMode ? '#fff' : '#000',
                marginRight: 10,
              }}
              placeholder="Type a message..."
              placeholderTextColor={isDarkMode ? '#aaa' : '#999'}
              value={messageText}
              onChangeText={setMessageText}
            />
            <TouchableOpacity
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#0084ff',
              }}
              onPress={sendMessage}
              disabled={!messageText.trim()}
            >
              <Text style={{ color: '#fff', fontSize: 16 }}>→</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    height: 60,
  },
  backButton: {
    padding: 8,
  },
  headerProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
});

