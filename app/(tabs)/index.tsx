import { Redirect } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { isCoach, session, loading } = useAuth();
  
  // Wait for auth and role to be initialized
  if (loading || !session) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  console.log('Index redirect - isCoach:', isCoach, 'loading:', loading);
  
  // Only redirect when we're sure about the role
  if (isCoach) {
    return <Redirect href="/(tabs)/coachfeed" />;
  }
  return <Redirect href="/(tabs)/training" />;
}

