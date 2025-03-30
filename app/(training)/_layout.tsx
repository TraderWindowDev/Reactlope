import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme, View } from 'react-native';
import {useTheme} from '@/src/context/ThemeContext';

export default function TrainingLayout() {
  const router = useRouter();
  const { isDarkMode } = useTheme();

  return (
    <Stack>
      <Stack.Screen 
        name="create-plan" 
        options={{ 
          title: 'Lag et treningsprogram',
          headerTintColor: isDarkMode ? '#fff' : '#000',
          presentation: 'modal',
          headerLeft: () => (
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color={isDarkMode ? '#fff' : '#000'}
              style={{ marginLeft: 16 }}
              onPress={() => router.navigate('/(tabs)/training')}
            />
          ),
          headerStyle: {
            backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
          },
        }} 
      />
      <Stack.Screen 
        name="plan-details" 
        options={{ 
          title: 'Treningsprogram',
          headerTintColor: isDarkMode ? '#fff' : '#000',
          headerLeft: () => (
            <Ionicons 
                name="arrow-back" 
                size={24} 
                color={isDarkMode ? '#fff' : '#000'}
                style={{ marginLeft: 16}}
                onPress={() => router.navigate('/(tabs)/training')}
            />

          ),
          headerStyle: {
             backgroundColor: isDarkMode ? '#000b15' : '#fff'
          },
        }} 
      />
      <Stack.Screen 
        name="edit-plan" 
        options={{ 
          title: 'Rediger treningsprogram',
          headerTintColor: isDarkMode ? '#fff' : '#000',
          presentation: 'modal',
          headerLeft: () => (
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color={isDarkMode ? '#fff' : '#007AFF'}
              style={{ marginLeft: 16 }}
              onPress={() => router.navigate('/(tabs)/training')}
            />
          ),
          headerStyle: {
            backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
          },
        }} 
      />
      <Stack.Screen 
        name="manage-templates" 
        options={{ 
          title: 'Administrer maler',
          headerTintColor: isDarkMode ? '#fff' : '#000',
          presentation: 'modal',
          headerLeft: () => (
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color={isDarkMode ? '#fff' : '#000'}
              style={{ marginLeft: 16 }}
              onPress={() => router.back()}
            />
          ),
          headerStyle: {
            backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
          },
        }} 
      />
    </Stack>
  );
} 