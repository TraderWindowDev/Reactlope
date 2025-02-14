import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/src/lib/supabase';

// Configure notifications behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Request permissions
export async function registerForPushNotificationsAsync() {
  let token;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  token = (await Notifications.getExpoPushTokenAsync()).data;

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7B61FF',
    });
  }

  return token;
}

// Schedule workout reminder
export async function scheduleWorkoutReminder(exerciseId: number, time: Date) {
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Tid for trening! 💪',
      body: 'Din planlagte økt starter snart. Er du klar?',
      data: { exerciseId },
    },
    trigger: {
      date: time,
    },
  });
  return identifier;
}

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

// Save notification token to user profile
export async function saveNotificationToken(userId: string, token: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ notification_token: token })
    .eq('id', userId);

  if (error) {
    console.error('Error saving notification token:', error);
  }
}
