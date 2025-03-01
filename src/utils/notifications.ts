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
export async function savePushToken(userId: string, token: string) {
  if (!userId || !token) {
    console.error('Missing userId or token in savePushToken:', { userId, token });
    return false;
  }

  try {
    console.log('Saving push token for user:', userId, 'Token:', token);
    
    // First, check if the token already exists for this user
    const { data: existingToken, error: checkError } = await supabase
      .from('user_push_tokens')
      .select('*')
      .eq('user_id', userId);
      
    if (checkError) {
      console.error('Error checking existing token:', checkError);
      return false;
    }
    
    let result;
    
    if (existingToken && existingToken.length > 0) {
      // Update existing token
      console.log('Updating existing token for user:', userId);
      result = await supabase
        .from('user_push_tokens')
        .update({ 
          token: token,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
    } else {
      // Insert new token
      console.log('Inserting new token for user:', userId);
      result = await supabase
        .from('user_push_tokens')
        .insert({ 
          user_id: userId, 
          token: token,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }
    
    if (result.error) {
      console.error('Error saving push token:', result.error);
      return false;
    }
    
    console.log('Push token saved successfully');
    
    // Verify the token was saved
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_push_tokens')
      .select('*')
      .eq('user_id', userId);
      
    if (verifyError) {
      console.error('Error verifying saved token:', verifyError);
      return false;
    }
    
    console.log('Verified token in database:', verifyData);
    return true;
  } catch (error) {
    console.error('Exception in savePushToken:', error);
    return false;
  }
}

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
