import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Image } from 'react-native';
import { useNotifications } from '../src/context/NotificationContext';
import { useTheme } from '../src/context/ThemeContext';
import { router } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { Button } from '../components/Button';

export default function NotificationsScreen() {
  const { notifications, markAllAsRead, refreshNotifications } = useNotifications();
  const { isDarkMode } = useTheme();
  const { session } = useAuth();

  useEffect(() => {
    const markNotificationsRead = async () => {
      if (!session?.user?.id) {
        console.log('No user session found');
        return;
      }

      try {
        console.log('Marking notifications as read for user:', session.user.id);
        
        // First, get unread notifications
        const { data: unreadNotifications, error: fetchError } = await supabase
          .from('notifications')
          .select('id, read, user_id')
          .eq('user_id', session.user.id)
          .eq('read', false);

        if (fetchError) {
          console.error('Error fetching unread notifications:', fetchError);
          return;
        }

        console.log('Found unread notifications:', unreadNotifications?.length || 0);

        if (unreadNotifications?.length > 0) {
          // Log the IDs we're about to update
          console.log('Updating notification IDs:', unreadNotifications.map(n => n.id));
          
          // Update each notification individually
          const updatePromises = unreadNotifications.map(notification => 
            supabase
              .from('notifications')
              .update({
                read: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', notification.id)
              .eq('user_id', session.user.id)
              .select()
          );

          const results = await Promise.all(updatePromises);
          
          // Check for any errors
          const errors = results.filter(result => result.error);
          if (errors.length > 0) {
            console.error('Errors updating notifications:', errors);
          }

          // Log successful updates
          const successfulUpdates = results.filter(result => !result.error);
          console.log('Successfully updated notifications:', successfulUpdates.length);

          await refreshNotifications();
        }
      } catch (error) {
        console.error('Error in markNotificationsRead:', error);
      }
    };

    markNotificationsRead();
  }, [session?.user?.id]);

  const CustomHeader = () => (
    <View style={styles.customHeader}>
      <Ionicons 
        name="arrow-back" 
        size={24} 
        color={isDarkMode ? '#fff' : '#000'} 
        onPress={() => router.back()} 
      />
      <Text style={[styles.customHeaderTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
        Notifications
      </Text>
    </View>
  );

  const clearAllNotifications = async () => {
    try {
      await supabase.from('notifications').delete().eq('user_id', session?.user?.id);
      await refreshNotifications();
      console.log('All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };
  
  const renderNotification = ({ item }) => {
    const handlePress = () => {
      // Navigate based on notification type
      switch (item.type) {
        case 'like':
        case 'comment':
          router.push(`/(tabs)/post/${item.related_id}`);
          break;
        case 'follow':
          router.push(`/(tabs)/profile/${item.sender_id}`);
          break;
        case 'message':
          router.push(`/(messages)/chat/${item.sender_id}`);
          break;
        case 'training':
          router.push(`/(training)/plan-details/${item.related_id}`);
          break;
      }
    };

    return (
      <Pressable 
        style={[
          styles.notificationItem,
          !item.read && styles.unreadNotification,
          { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff' }
        ]}
        onPress={handlePress}
      >
        <Image 
          source={{ uri: item.sender?.avatar_url || 'https://via.placeholder.com/40' }}
          style={styles.avatar}
        />
        <View style={styles.notificationContent}>
          <Text style={[styles.content, { color: isDarkMode ? '#fff' : '#000' }]}>
            {item.sender?.username || 'Someone'} {item.content}
          </Text>
          <Text style={styles.time}>
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </Text>
        </View>
      </Pressable>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 10,
      backgroundColor: isDarkMode ? '#121212' : '#f5f5f5',
    },
    notificationItem: {
      flexDirection: 'row',
      padding: 16,
      alignItems: 'center',
    },
    unreadNotification: {
      backgroundColor: '#E3F2FD',
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    notificationContent: {
      flex: 1,
    },
    content: {
      fontSize: 14,
      marginBottom: 4,
    },
    time: {
      fontSize: 12,
      color: '#666',
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
    customHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      paddingTop: 60,
      backgroundColor: isDarkMode ? '#121212' : '#fff',
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#2C2C2C' : '#f0f0f0',
    },
    customHeaderTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDarkMode ? '#fff' : '#000',
      marginLeft: 32,
    },
    clearButtonContainer: {
      marginTop: 10,
      marginBottom: 10,
      marginLeft: 10,
    },
    clearButton: {
      backgroundColor: isDarkMode ? '#2C2C2C' : '#f5f5f5',
      color: isDarkMode ? '#fff' : '#000',
    },
  });
  return (
    <>
      <CustomHeader />
      <View style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#f5f5f5' }]}>
        <View style={styles.clearButtonContainer}>
          <Button title="Clear All" style={styles.clearButton} onPress={clearAllNotifications} />
        </View>
        {notifications.length > 0 ? (
          // TODO: Add a clear button
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={48} color={isDarkMode ? '#666' : '#999'} />
            <Text style={[styles.emptyText, { color: isDarkMode ? '#fff' : '#000' }]}>
              No notifications yet
            </Text>
          </View>
        )}
      </View>
    </>
  );
}


