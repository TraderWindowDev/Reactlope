import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import Constants from 'expo-constants';

// Configure notifications behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Request permissions and get token
export async function registerForPushNotificationsAsync() {
  let token;
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0047AB',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    // Get the token
    try {
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: "e0616b34-a0ad-43bc-b387-4ae4ba08a520",
      })).data;
      console.log('Push token:', token);
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

// Save token to database
export const savePushToken = async (userId: string, token: string) => {
  try {
    console.log(`Saving push token for user ${userId}: ${token}`);
    console.log('User ID type:', typeof userId);
    console.log('Token type:', typeof token);
    
    // Validate the user ID is a proper UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      console.error('Invalid user ID format:', userId);
      return false;
    }
    
    // First check if this exact token already exists for this user
    const { data: existingTokens, error: queryError } = await supabase
      .from('user_push_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('token', token);
      
    if (queryError) {
      console.error('Error checking for existing token:', queryError);
      return false;
    }
    
    console.log('Existing tokens query result:', existingTokens);
    
    // If token already exists, just update the timestamp
    if (existingTokens && existingTokens.length > 0) {
      console.log('Token already exists, updating timestamp');
      
      const { error: updateError } = await supabase
        .from('user_push_tokens')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', existingTokens[0].id);
        
      if (updateError) {
        console.error('Error updating token timestamp:', updateError);
        return false;
      }
      
      return true;
    }
    
    // Otherwise insert a new token
    console.log('Inserting new token record');
    const insertData = {
      user_id: userId,
      token: token,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    console.log('Insert data:', insertData);
    
    const { data: insertResult, error: insertError } = await supabase
      .from('user_push_tokens')
      .insert(insertData)
      .select();
      
    if (insertError) {
      console.error('Error inserting new token:', insertError);
      return false;
    }
    
    console.log('Token inserted successfully:', insertResult);
    return true;
  } catch (error) {
    console.error('Exception in savePushToken:', error);
    return false;
  }
};

// Send push notification
export async function sendPushNotification(token: string, title: string, body: string, data: any = {}) {
  try {
    const message = {
      to: token,
      sound: 'default',
      title,
      body,
      data,
      badge: 1,
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return null;
  }
}

// Handle notification received while app is running
export function setupNotificationListeners(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationResponse: (response: Notifications.NotificationResponse) => void
) {
  // When a notification is received while the app is in the foreground
  const receivedSubscription = Notifications.addNotificationReceivedListener(onNotificationReceived);
  
  // When the user taps on a notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

// Set badge count
export async function setBadgeCount(count: number) {
  return await Notifications.setBadgeCountAsync(count);
}

// Schedule workout reminder
export const scheduleWorkoutReminder = async (exerciseId: number, date: Date) => {
  try {
    // Remove any existing notification for this exercise
    await Notifications.cancelScheduledNotificationAsync(`exercise_${exerciseId}`);

    // Schedule new notification
    await Notifications.scheduleNotificationAsync({
      identifier: `exercise_${exerciseId}`,
      content: {
        title: 'Workout Reminder',
        body: 'Time for your workout!',
      },
      trigger: {
        hour: date.getHours(),
        minute: date.getMinutes(),
        repeats: true,
      },
    });
  } catch (error) {
    console.error('Error scheduling notification:', error);
    // Don't throw the error - just log it
  }
};

// Send motivational notification
export async function sendMotivationalNotification() {
  const messages = [
    'Hver økt teller! 💪',
    'Du er sterkere enn du tror! 🌟',
    'Konsistens er nøkkelen til suksess! 🎯',
    'En liten fremgang hver dag blir stor over tid! 📈',
    'Du har dette! Fortsett det gode arbeidet! 🔥'
  ];

  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Motivasjon for dagen',
      body: randomMessage,
    },
    trigger: {
      hour: 9, // Send at 9 AM
      minute: 0,
      repeats: true,
    },
  });
}
