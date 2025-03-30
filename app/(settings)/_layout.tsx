import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '@/src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import ChangePasswordScreen from './change-password';
import NotificationsSettingsScreen from './notifications-page';
import SubscriptionScreen from './subscription';
import SettingsScreen from './settings';
import { useRouter } from 'expo-router';
import PrivacyPolicyScreen from './privacy-policy';
import TermsOfServiceScreen from './terms-of-service';
const Stack = createStackNavigator();

export default function SettingsLayout() {
  const router = useRouter();
  const { isDarkMode } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: isDarkMode ? '#fff' : '#000',
        headerStyle: {
          backgroundColor: isDarkMode ? '#000b15' : '#fff',
          borderBottomWidth: 0.2,
          borderBottomColor: '#6A3DE8',
        },
        headerLeft: () => (
          <Ionicons
            name="arrow-back-outline"
            size={24}
            color={isDarkMode ? '#fff' : '#000'}
            style={{ marginLeft: 16 }}
            onPress={() => router.back()}
          />
        ),
      }}
    >
      <Stack.Screen
        name="settings"
        component={SettingsScreen}
        options={{ title: 'Innstillinger' }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: 'Endre Passord' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsSettingsScreen}
        options={{ title: 'Notifikasjoner' }}
      />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{ title: 'Abonnement' }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: 'Privatliv og sikkerhet' }}
      />
      <Stack.Screen
        name="TermsOfService"
        component={TermsOfServiceScreen}
        options={{ title: 'Bruksvilkår' }}
      />
    </Stack.Navigator>
  );
}