import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TrainingLayout() {
  const router = useRouter();

  return (
    <Stack>
      <Stack.Screen 
        name="create-plan" 
        options={{ 
          title: 'Create Training Plan',
          presentation: 'modal',
          headerLeft: () => (
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color="#007AFF"
              style={{ marginLeft: 16 }}
              onPress={() => router.navigate('training')}
            />
          ),
        }} 
      />
      <Stack.Screen 
        name="plan-details" 
        options={{ 
          title: 'Plan Details',
          headerLeft: () => (
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color="#007AFF"
              style={{ marginLeft: 16 }}
              onPress={() => router.navigate('training')}
            />
          ),
        }} 
      />
      <Stack.Screen 
        name="edit-plan" 
        options={{ 
          title: 'Edit Training Plan',
          presentation: 'modal',
          headerLeft: () => (
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color="#007AFF"
              style={{ marginLeft: 16 }}
              onPress={() => router.navigate('training')}
            />
          ),
        }} 
      />
    </Stack>
  );
} 