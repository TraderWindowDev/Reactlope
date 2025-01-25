// settings layout

import { router, Stack } from 'expo-router';
import { useTheme } from '@/src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
export default function SettingsLayout() {
  const { isDarkMode } = useTheme();  
  return <Stack screenOptions={{ 
    headerTintColor: isDarkMode ? '#fff' : '#000',
    headerStyle: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
    },
    headerLeft: () => (
      <Ionicons name="arrow-back-outline" size={24} color={isDarkMode ? '#fff' : '#000'} style={{ marginLeft: 16 }} 
        onPress={() => router.replace('/(tabs)/profile')}
      />
    ),
  }} />;
}
