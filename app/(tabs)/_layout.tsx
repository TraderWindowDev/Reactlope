import React, { useEffect, useState, useRef } from 'react';
import { router, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View, StyleSheet, Pressable, Text, AppState, AppStateStatus } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { DrawerActions, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useNotifications } from '@/src/context/NotificationContext';
import { useMessages } from '@/src/context/MessagesContext';
import { useAuth } from '@/src/context/AuthContext';
import { Link } from 'expo-router';
import { supabase } from '@/src/lib/supabase';

export default function TabLayout() {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();
  const { unreadCount: notificationCount } = useNotifications();
  const { chats = [], unreadCount: contextUnreadCount } = useMessages();
  const { session, userProfile } = useAuth();
  const isCoach = userProfile?.role === 'coach';
  const [localUnreadCount, setLocalUnreadCount] = useState(0);
  const appStateRef = useRef(AppState.currentState);
  const subscriptionRef = useRef(null);

  // Calculate total unread messages from context
  const unreadMessagesCount = localUnreadCount || contextUnreadCount;

  // Function to fetch unread count directly
  const fetchUnreadCount = async () => {
    if (!session?.user?.id) return;
    
    try {
      console.log('Fetching unread count in tab layout for user:', session.user.id);
      
      const { data, error } = await supabase
        .from('messages')
        .select('sender_id, read')
        .eq('recipient_id', session.user.id)
        .eq('read', false);
        
      if (error) {
        console.error('Error fetching unread count in tab layout:', error);
        return;
      }
      
      console.log('Raw unread messages data:', data);
      
      // Count unique senders with unread messages
      const uniqueSenders = new Set();
      data.forEach(msg => uniqueSenders.add(msg.sender_id));
      const count = uniqueSenders.size;
      
      console.log(`Tab layout unread count updated: ${count} (unique senders: ${Array.from(uniqueSenders).join(', ')})`);
      setLocalUnreadCount(count);
    } catch (error) {
      console.error('Error in tab layout fetchUnreadCount:', error);
    }
  };

  // Set up subscription
  const setupSubscription = () => {
    if (!session?.user?.id) return;
    
    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }
    
    console.log('Setting up tab layout subscription');
    
    const channel = supabase.channel(`tab-layout-messages-${session.user.id}`);
    
    subscriptionRef.current = channel
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `recipient_id.eq.${session.user.id}`
        }, 
        (payload) => {
          console.log('New message detected in tab layout:', payload);
          fetchUnreadCount();
        }
      )
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'messages',
          filter: `recipient_id.eq.${session.user.id}`
        }, 
        (payload) => {
          console.log('Message updated in tab layout:', payload);
          fetchUnreadCount();
        }
      )
      .subscribe((status) => {
        console.log('Tab layout subscription status:', status);
      });
  };

  // Initial setup
  useEffect(() => {
    if (!session?.user?.id) return;
    
    fetchUnreadCount();
    setupSubscription();
    
    // Listen for app state changes
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) && 
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground, refreshing tab layout');
        fetchUnreadCount();
        setupSubscription();
      }
      
      appStateRef.current = nextAppState;
    });
    
    return () => {
      console.log('Cleaning up tab layout resources');
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      subscription.remove();
    };
  }, [session?.user?.id]);

  // Refresh on tab focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('Tab layout focused, refreshing unread count');
      fetchUnreadCount();
      return () => {};
    }, [session?.user?.id])
  );

  // Update local count when context count changes
  useEffect(() => {
    if (contextUnreadCount > 0) {
      console.log(`Context unread count changed to ${contextUnreadCount}, updating local count`);
      setLocalUnreadCount(contextUnreadCount);
    }
  }, [contextUnreadCount]);

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
              <Pressable onPress={() => console.log('Messages icon pressed')}>
                <View>
                  <Ionicons 
                    name="chatbubble-outline" 
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
              </Pressable>
            </Link>
            <Link href="/notification" asChild>
              <Pressable>
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
              </Pressable>
            </Link>
          </View>
        ),
      }}
      initialRouteName="training"
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
        name="calculator"
        options={{
          title: 'Kalkulator',
          tabBarLabel: 'Kalkulator',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calculator-outline" size={size} color={color} />
          ),
          href: isCoach ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
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

