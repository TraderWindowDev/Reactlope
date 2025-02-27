import { Redirect } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { session, loading } = useAuth();
  
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // If no session, redirect to login
  if (!session) {
    return <Redirect href="/login" />;
  }

  // If authenticated, redirect to training
  return <Redirect href="/(tabs)/training" />;
}

