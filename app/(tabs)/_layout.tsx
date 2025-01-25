import React from 'react';
import { router, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View, StyleSheet, Pressable, Text } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useNotifications } from '@/src/context/NotificationContext';
import { useMessages } from '@/src/context/MessagesContext';
import { useAuth } from '../../src/context/AuthContext';
import { supabase } from '@/src/lib/supabase';

export default function TabLayout() {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();
  const { unreadCount: notificationCount } = useNotifications();
  const { chats = [] } = useMessages();
  const { session } = useAuth();

  // Calculate total unread messages
  const unreadMessagesCount = chats.reduce((count, chat) => {
    if (chat.unread) {
      return count + 1;
    }
    return count;
  }, 0);

  const MessageIcon = () => (
    <View>
      <Ionicons 
        name="chatbubbles-outline" 
        size={24} 
        color={isDarkMode ? '#fff' : '#000'} 
      />
      {unreadMessagesCount > 0 && (
        <View style={[styles.badge, { backgroundColor: '#FF3B30' }]}>
          <Text style={styles.badgeText}>
            {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
          </Text>
        </View>
      )}
    </View>
  );

  const NotificationIcon = () => (
    <View>
      <Ionicons 
        name="notifications-outline" 
        size={24} 
        color={isDarkMode ? '#fff' : '#000'} 
      />
      {notificationCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {notificationCount > 99 ? '99+' : notificationCount}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {

          let iconName;

          if (route.name === 'index') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'messages') {
            return (
              <View>
                <Ionicons 
                  name={focused ? "chatbubbles" : "chatbubbles-outline"} 
                  size={size} 
                  color={color} 
                />
                {unreadMessagesCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                    </Text>
                  </View>
                )}
              </View>
            );
          } else if (route.name === 'profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: isDarkMode ? '#0047AB' : '#0047AB',
        tabBarInactiveTintColor: isDarkMode ? '#979797' : '#757575',
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
          borderTopColor: isDarkMode ? '#333' : '#eee',
        },
        headerStyle: {
          backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
        },
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Lopeprat',
          tabBarLabel: 'Lopeprat',
          headerTintColor: isDarkMode ? '#fff' : '#000',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
              <Pressable 
                style={{ marginRight: 16 }}
                onPress={() => router.push('/(messages)/messages')}
              >
                <MessageIcon />
              </Pressable>
              <Pressable
                onPress={() => router.push('/notification')}
              >
                <NotificationIcon />
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="podcasts"
        options={{
          title: 'Podcasts',
          headerTintColor: isDarkMode ? '#fff' : '#000',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mic-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: 'Treningsplan',
          tabBarLabel: 'Treningsplan',
          headerTintColor: isDarkMode ? '#fff' : '#000',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="fitness-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTintColor: isDarkMode ? '#fff' : '#000',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
          headerRight: () => (
            <Ionicons 
              name="settings-outline" 
              size={24} 
              color={isDarkMode ? '#fff' : '#000'} 
              style={{ marginRight: 16 }} 
              onPress={() => router.push('/(settings)/settings')}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -6,
    top: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

