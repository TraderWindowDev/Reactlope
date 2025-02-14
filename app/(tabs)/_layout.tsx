import React from 'react';
import { router, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View, StyleSheet, Pressable, Text } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useNotifications } from '@/src/context/NotificationContext';
import { useMessages } from '@/src/context/MessagesContext';
import { useAuth } from '@/src/context/AuthContext';
import { Link } from 'expo-router';

export default function TabLayout() {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();
  const { unreadCount: notificationCount } = useNotifications();
  const { chats = [] } = useMessages();
  const { isCoach } = useAuth();

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
      screenOptions={{
        headerTintColor: isDarkMode ? '#fff' : '#000',
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
        },
        headerStyle: {
          backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
        },
        tabBarActiveTintColor: '#0047AB',
        headerRight: () => (
          <View style={{ flexDirection: 'row', gap: 16, marginRight: 16 }}>
            <Link href="/messages" asChild>
              <Pressable>
                <Ionicons 
                  name="chatbubble-outline" 
                  size={24} 
                  color={isDarkMode ? '#fff' : '#000'} 
                />
              </Pressable>
            </Link>
            <Link href="/notification" asChild>
              <Pressable>
                <Ionicons 
                  name="notifications-outline" 
                  size={24} 
                  color={isDarkMode ? '#fff' : '#000'} 
                />
              </Pressable>
            </Link>
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />

  
      
      <Tabs.Screen
        name="coachfeed"
        options={{
          title: 'Athletes Progress',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
          href: isCoach ? undefined : null,
        }}
      />
    <Tabs.Screen
        name="training"
        options={{
          title: 'Treningsplan',
          tabBarLabel: 'Treningsplan',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="fitness-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="podcasts"
        options={{
          title: 'Podcasts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mic-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
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

