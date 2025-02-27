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
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Dimensions
} from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/src/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { Image } from 'expo-image';
import { useMessages } from '@/src/context/MessagesContext';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { Video } from 'expo-av';

// Add these types
type MediaType = 'image' | 'video';

type MessageMedia = {
  id: string;
  url: string;
  type: MediaType;
  message_id: string;
};

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
  
  // Media state
  const [mediaPreviewVisible, setMediaPreviewVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string, type: MediaType } | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Add these state variables
  const [fullScreenMedia, setFullScreenMedia] = useState<{ url: string, type: MediaType } | null>(null);
  const [fullScreenVisible, setFullScreenVisible] = useState(false);

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
        recipient:profiles!recipient_id(username, avatar_url),
        media:message_media(id, url, type)
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
            recipient:profiles!recipient_id(username, avatar_url),
            media:message_media(id, url, type)
          `)
          .eq('id', payload.messageId)
          .single();

        if (!error && data) {
          setMessages(prev => [...prev, data]);
        }
      })
      .subscribe();

    return () => {
      chatChannel.unsubscribe();
    };
  };

  // Function to pick image from gallery
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      alert('Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const mediaType: MediaType = asset.type === 'video' ? 'video' : 'image';
      setSelectedMedia({ uri: asset.uri, type: mediaType });
      setMediaPreviewVisible(true);
    }
  };

  // Function to take a photo with camera
  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      alert('Permission to access camera is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedMedia({ uri: result.assets[0].uri, type: 'image' });
      setMediaPreviewVisible(true);
    }
  };

  // Function to upload media to Supabase storage
  const uploadMedia = async (uri: string, type: MediaType): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Convert to base64 for Supabase storage
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = async () => {
          try {
            const base64 = reader.result?.toString().split(',')[1];
            if (!base64) {
              reject('Failed to convert to base64');
              return;
            }
            
            const fileExt = uri.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `media/${type}/${fileName}`;
            
            // Set the correct content type based on file extension
            let contentType;
            if (type === 'image') {
              contentType = 'image/jpeg';
            } else if (type === 'video') {
              // Check file extension for video type
              if (fileExt === 'mp4') {
                contentType = 'video/mp4';
              } else if (fileExt === 'mov') {
                contentType = 'video/quicktime';
              } else if (fileExt === 'webm') {
                contentType = 'video/webm';
              } else {
                // Default video type
                contentType = 'application/octet-stream';
              }
            }
            
            const { data, error } = await supabase.storage
              .from('post-images') // Using your existing bucket
              .upload(filePath, decode(base64), {
                contentType: contentType,
                upsert: true
              });
              
            if (error) throw error;
            
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('post-images')
              .getPublicUrl(filePath);
              
            resolve(publicUrl);
          } catch (error) {
            console.error('Upload error:', error);
            reject(error);
          }
        };
        reader.onerror = () => {
          reject('Failed to read file');
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Media upload error:', error);
      return null;
    }
  };

  const sendMessage = async (mediaUri?: string, mediaType?: MediaType) => {
    if ((!newMessage.trim() && !mediaUri) || !recipient) return;
    
    try {
      setUploadingMedia(mediaUri ? true : false);
      
      // Upload media if provided
      let mediaUrl = null;
      if (mediaUri && mediaType) {
        mediaUrl = await uploadMedia(mediaUri, mediaType);
        if (!mediaUrl) {
          console.error('Error in send message flow:', 'Failed to upload media');
          setUploadingMedia(false);
          return;
        }
      }
      
      // Insert the message
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          content: newMessage.trim(),
          sender_id: session.user.id,
          recipient_id: id,
          read: false
        })
        .select()
        .single();
        
      if (messageError) {
        console.error('Error in send message flow:', messageError);
        setUploadingMedia(false);
        return;
      }
      
      // If media was uploaded, link it to the message
      if (mediaUrl && messageData) {
        const { error: mediaError } = await supabase
          .from('message_media')
          .insert({
            message_id: messageData.id,
            url: mediaUrl,
            type: mediaType
          });
          
        if (mediaError) {
          console.error('Error linking media to message:', mediaError);
        }
      }
      
      // Create a notification for the recipient
      if (recipient.notification_token) {
        // First, create a notification record in the database
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: id, // recipient's ID
            sender_id: session.user.id,
            type: 'message',
            content: 'sent you a message',
            related_id: messageData.id,
            read: false
          });
          
        if (notificationError) {
          console.error('Error creating notification record:', notificationError);
        }
        
        // Then send a push notification
        try {
          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: recipient.notification_token,
              title: session.user.user_metadata.username || 'New message',
              body: mediaUrl ? 'Sent you a media message' : newMessage.trim().substring(0, 100),
              data: {
                type: 'message',
                senderId: session.user.id,
                messageId: messageData.id
              },
              sound: 'default',
              badge: 1,
            }),
          });
          
          const result = await response.json();
          console.log('Push notification result:', result);
        } catch (pushNotificationError) {
          console.error('Error sending push notification:', pushNotificationError);
        }
      }

      // Fetch the complete message with media
      const { data: updatedMessage, error: fetchError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id(username, avatar_url),
          recipient:profiles!recipient_id(username, avatar_url),
          media:message_media(id, url, type)
        `)
        .eq('id', messageData.id)
        .single();

      if (!fetchError && updatedMessage) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageData.id ? updatedMessage : msg
        ));
      }

    } catch (error) {
      console.error('Error in send message flow:', error);
      setUploadingMedia(false);
    } finally {
      setUploadingMedia(false);
      setMediaPreviewVisible(false);
      setSelectedMedia(null);
    }
  };

  const renderMessage = ({ item }) => {
    const isOwnMessage = item.sender_id === session.user.id;
    const hasMedia = item.media && item.media.length > 0;

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage,
        { backgroundColor: isDarkMode ? (isOwnMessage ? '#0047AB' : '#1E1E1E') : (isOwnMessage ? '#0047AB' : '#fff') }
      ]}>
        {!isOwnMessage && (
          <Image
            source={{ uri: item.sender?.avatar_url || 'https://via.placeholder.com/40' }}
            style={styles.avatar}
          />
        )}
        <View style={styles.messageContent}>
          {item.content ? (
            <Text style={[styles.messageText, { color: isDarkMode ? '#fff' : (isOwnMessage ? '#fff' : '#000') }]}>
              {item.content}
            </Text>
          ) : null}
          
          {hasMedia && item.media.map(media => (
            <View key={media.id} style={styles.mediaContainer}>
              {media.type === 'image' ? (
                <Image 
                  source={{ uri: media.url }} 
                  style={styles.messageMedia}
                  contentFit="cover"
                />
              ) : (
                <Video
                  source={{ uri: media.url }}
                  style={styles.messageMedia}
                  useNativeControls
                  resizeMode="contain"
                />
              )}
            </View>
          ))}
          
          <Text style={styles.timeText}>
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </Text>
        </View>
      </View>
    );
  };

  // Media preview modal component
  const MediaPreviewModal = () => (
    <Modal
      visible={mediaPreviewVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setMediaPreviewVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.mediaPreviewContainer}>
          <View style={styles.mediaPreviewHeader}>
            <TouchableOpacity onPress={() => setMediaPreviewVisible(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.mediaPreviewTitle}>Preview</Text>
            <TouchableOpacity 
              onPress={() => {
                if (selectedMedia) {
                  sendMessage(selectedMedia.uri, selectedMedia.type);
                }
              }}
              disabled={uploadingMedia}
            >
              {uploadingMedia ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={24} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          
          {selectedMedia?.type === 'image' ? (
            <Image 
              source={{ uri: selectedMedia.uri }} 
              style={styles.mediaPreview} 
              contentFit="contain"
            />
          ) : selectedMedia?.type === 'video' ? (
            <Video
              source={{ uri: selectedMedia.uri }}
              style={styles.mediaPreview}
              useNativeControls
              resizeMode="contain"
              isLooping
            />
          ) : null}
          
          <TextInput
            style={styles.mediaCaption}
            placeholder="Add a caption..."
            placeholderTextColor="#999"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />
        </View>
      </View>
    </Modal>
  );

  // Add this function to handle media taps
  const handleMediaPress = (media) => {
    setFullScreenMedia(media);
    setFullScreenVisible(true);
  };

  // Add this component for full screen media viewing
  const FullScreenMediaModal = () => (
    <Modal
      visible={fullScreenVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setFullScreenVisible(false)}
    >
      <View style={styles.fullScreenContainer}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => setFullScreenVisible(false)}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        
        {fullScreenMedia?.type === 'image' ? (
          <Image 
            source={{ uri: fullScreenMedia.url }} 
            style={styles.fullScreenMedia}
            contentFit="contain"
          />
        ) : fullScreenMedia?.type === 'video' ? (
          <Video
            source={{ uri: fullScreenMedia.url }}
            style={styles.fullScreenMedia}
            useNativeControls
            resizeMode="contain"
            shouldPlay
          />
        ) : null}
      </View>
    </Modal>
  );

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
    mediaButton: {
      marginHorizontal: 8,
    },
    mediaContainer: {
      marginVertical: 8,
      borderRadius: 12,
      overflow: 'hidden',
    },
    messageMedia: {
      width: 200,
      height: 200,
      borderRadius: 12,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'center',
    },
    mediaPreviewContainer: {
      backgroundColor: '#000',
      borderRadius: 10,
      margin: 20,
      overflow: 'hidden',
    },
    mediaPreviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 15,
      backgroundColor: '#333',
    },
    mediaPreviewTitle: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    mediaPreview: {
      width: '100%',
      height: 300,
      backgroundColor: '#000',
    },
    mediaCaption: {
      padding: 15,
      color: '#fff',
      backgroundColor: '#222',
    },
    fullScreenContainer: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'center',
    },
    closeButton: {
      position: 'absolute',
      top: 20,
      right: 20,
    },
    fullScreenMedia: {
      width: Dimensions.get('window').width,
      height: Dimensions.get('window').height,
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
        <TouchableOpacity onPress={pickImage} style={styles.mediaButton}>
          <Ionicons name="image" size={24} color={isDarkMode ? '#fff' : '#666'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={takePhoto} style={styles.mediaButton}>
          <Ionicons name="camera" size={24} color={isDarkMode ? '#fff' : '#666'} />
        </TouchableOpacity>
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
          onPress={() => sendMessage()}
          disabled={!newMessage.trim()}
        >
          <Ionicons name="send" size={24} color="#fff" />
        </Pressable>
      </View>
      
      <MediaPreviewModal />
      <FullScreenMediaModal />
    </KeyboardAvoidingView>
  );
}

