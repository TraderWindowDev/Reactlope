import { Stack } from 'expo-router';
import { useTheme } from '@/src/context/ThemeContext';

export default function MessagesLayout() {
  const { isDarkMode } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        animationDuration: 250,
        gestureResponseDistance: 100,
        headerStyle: {
          backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
        },
        contentStyle: {
          backgroundColor: isDarkMode ? '#121212' : '#f5f5f5',
        },
      }}
    >
      <Stack.Screen name="messages" />
      <Stack.Screen name="chat/[id]" />
    </Stack>
  );
} 