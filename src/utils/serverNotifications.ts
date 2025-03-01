import { supabase } from '@/src/lib/supabase';

export async function sendNotificationToUser(
  userId: string,
  title: string,
  body: string,
  type: string,
  senderId: string,
  relatedId?: string
) {
  try {
    // First, create a notification record in the database
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        content: body,
        sender_id: senderId,
        related_id: relatedId,
        read: false
      })
      .select()
      .single();
      
    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      return;
    }
    
    // Then get the user's push token
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_push_tokens')
      .select('token')
      .eq('user_id', userId)
      .single();
      
    if (tokenError || !tokenData?.token) {
      console.log('No push token found for user:', userId);
      return;
    }
    
    // Send the push notification
    const notificationData = {
      type,
      senderId,
      notificationId: notification.id
    };
    
    if (relatedId) {
      notificationData.relatedId = relatedId;
    }
    
    // Send the notification using Expo's push notification service
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: tokenData.token,
        title,
        body,
        data: notificationData,
        sound: 'default',
        badge: 1,
      }),
    });
    
    const result = await response.json();
    console.log('Push notification sent:', result);
    
    return result;
  } catch (error) {
    console.error('Error sending notification to user:', error);
    return null;
  }
} 