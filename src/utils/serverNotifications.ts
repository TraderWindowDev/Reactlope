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
    // Check for existing notification
    const { data: existingNotification, error: fetchError } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('sender_id', senderId)
      .eq('type', type)
      .eq('related_id', relatedId)
      .single();

    if (fetchError) {
      console.error('Error fetching existing notification:', fetchError);
      return;
    }

    if (existingNotification) {
      // Update existing notification
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ content: body, read: false, updated_at: new Date().toISOString() })
        .eq('id', existingNotification.id);

      if (updateError) {
        console.error('Error updating notification:', updateError);
      }
    } else {
      // Create new notification
      const { error: insertError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          content: body,
          sender_id: senderId,
          related_id: relatedId,
          read: false
        });

      if (insertError) {
        console.error('Error creating notification:', insertError);
      }
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
      notificationId: existingNotification?.id || insertError?.id
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