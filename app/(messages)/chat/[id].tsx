import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  Pressable, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator 
} from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/src/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { Image } from 'expo-image';
import { useMessages } from '@/src/context/MessagesContext';

export default function ChatScreen() {
  const { isDarkMode } = useTheme();
  const { session } = useAuth();
  const { id } = useLocalSearchParams();
  const { markChatAsRead } = useMessages();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [recipient, setRecipient] = useState(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (id && session?.user?.id) {
      fetchMessages();
      fetchRecipient();
      subscribeToMessages();
      // Mark messages as read when entering the chat
      markChatAsRead(id);
    }
  }, [id, session?.user?.id]);

  const fetchRecipient = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching recipient:', error);
      return;
    }

    setRecipient(data);
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!sender_id(username, avatar_url),
        recipient:profiles!recipient_id(username, avatar_url)
      `)
      .or(
        `and(sender_id.eq.${session.user.id},recipient_id.eq.${id}),` +
          `and(sender_id.eq.${id},recipient_id.eq.${session.user.id})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data || []);
    setLoading(false);

    // Mark messages as read
    if (data && data.length > 0) {
      const { error: updateError } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', id)
        .eq('recipient_id', session.user.id)
        .eq('read', false);

      if (updateError) {
        console.error('Error marking messages as read:', updateError);
      }
    }
  };

  const subscribeToMessages = () => {
    // Create a unique channel for this chat
    const chatChannel = supabase.channel(`chat:${session.user.id}:${id}`);

    const subscription = chatChannel
      .on('broadcast', { event: 'new_message' }, async ({ payload }) => {
        console.log('Broadcast received:', payload);
        // Fetch the complete message data including sender profile
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!sender_id(username, avatar_url),
            recipient:profiles!recipient_id(username, avatar_url)
          `)
          .eq('id', payload.messageId)
          .single();

        if (!error && data) {
          console.log('New message data:', data);
          setMessages(prev => [...prev, data]);
        }
      })
      .subscribe();

    return () => {
      chatChannel.unsubscribe();
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    const optimisticMessage = {
      id: Math.random().toString(),
      content: messageContent,
      sender_id: session.user.id,
      recipient_id: id,
      created_at: new Date().toISOString(),
      read: false,
      sender: {
        avatar_url: session.user.avatar_url || 'https://via.placeholder.com/40'
      }
    };
    
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content: messageContent,
          sender_id: session.user.id,
          recipient_id: id,
        })
        .select('*, sender:profiles!sender_id(avatar_url)')
        .single();

      if (error) {
        console.error('Error sending message:', error);
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        return;
      }

      // Broadcast to chat channel
      const chatChannel = supabase.channel(`chat:${id}:${session.user.id}`);
      await chatChannel.send({
        type: 'broadcast',
        event: 'new_message',
        payload: { messageId: data.id }
      });

      // Broadcast to global channels for both users
      const globalSenderChannel = supabase.channel(`global_messages_${session.user.id}`);
      const globalRecipientChannel = supabase.channel(`global_messages_${id}`);
      
      await Promise.all([
        globalSenderChannel.send({
          type: 'broadcast',
          event: 'new_message',
          payload: { messageId: data.id }
        }),
        globalRecipientChannel.send({
          type: 'broadcast',
          event: 'new_message',
          payload: { messageId: data.id }
        })
      ]);

      setMessages(prev => prev.map(msg => 
        msg.id === optimisticMessage.id ? data : msg
      ));
      
      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: id,
          sender_id: session.user.id,
          type: 'message',
          content: 'sent you a message',
          related_id: session.user.id
        });

    } catch (error) {
      console.error('Error in send message flow:', error);
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
    }
  };

  const renderMessage = ({ item }) => {
    const isOwnMessage = item.sender_id === session.user.id;

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage,
        { backgroundColor: isDarkMode ? (isOwnMessage ? '#0047AB' : '#1E1E1E') : (isOwnMessage ? '#0047AB' : '#fff') }
      ]}>
        {!isOwnMessage && (
          <Image
            source={{ uri: item.sender.avatar_url || 'https://via.placeholder.com/40' }}
            style={styles.avatar}
          />
        )}
        <View style={styles.messageContent}>
          <Text style={[styles.messageText, { color: isDarkMode ? '#fff' : (isOwnMessage ? '#fff' : '#000') }]}>
            {item.content}
          </Text>
          <Text style={styles.timeText}>
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </Text>
        </View>
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
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
    headerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    messagesList: {
      flex: 1,
      padding: 16,
    },
    messageContainer: {
      flexDirection: 'row',
      marginBottom: 16,
      maxWidth: '80%',
      borderRadius: 16,
      padding: 12,
    },
    ownMessage: {
      alignSelf: 'flex-end',
    },
    otherMessage: {
      alignSelf: 'flex-start',
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      marginRight: 8,
    },
    messageContent: {
      flex: 1,
    },
    messageText: {
      fontSize: 16,
    },
    timeText: {
      fontSize: 12,
      color: '#999',
      marginTop: 4,
    },
    inputContainer: {
      flexDirection: 'row',
      padding: 16,
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#2C2C2C' : '#f0f0f0',
    },
    input: {
      flex: 1,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginRight: 8,
      maxHeight: 100,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#0047AB',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDarkMode ? '#121212' : '#f5f5f5' }]}>
        <ActivityIndicator size="large" color={isDarkMode ? '#fff' : '#0047AB'} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#f5f5f5' }]}
    >
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff' }]}>
        <Ionicons 
          name="arrow-back" 
          size={24} 
          color={isDarkMode ? '#fff' : '#000'} 
          style={styles.backButton}
          onPress={() => router.back()}
        />
        <Image 
          source={{ uri: recipient?.avatar_url || 'https://via.placeholder.com/40' }}
          style={styles.headerAvatar}
        />
        <Text style={[styles.headerTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
          {recipient?.username || 'Chat'}
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        onLayout={() => flatListRef.current?.scrollToEnd()}
        style={styles.messagesList}
      />

      <View style={[styles.inputContainer, { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff' }]}>
        <TextInput
          style={[styles.input, { 
            backgroundColor: isDarkMode ? '#121212' : '#f5f5f5',
            color: isDarkMode ? '#fff' : '#000'
          }]}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          multiline
        />
        <Pressable 
          style={[styles.sendButton, { opacity: newMessage.trim() ? 1 : 0.5 }]}
          onPress={sendMessage}
          disabled={!newMessage.trim()}
        >
          <Ionicons name="send" size={24} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

