import React, { useEffect, useState, useRef } from 'react';
import { router, Tabs, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View, StyleSheet, Pressable, Text, AppState, AppStateStatus, Image } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { DrawerActions, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useNotifications } from '@/src/context/NotificationContext';
import { useMessages } from '@/src/context/MessagesContext';
import { useAuth } from '@/src/context/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { useUnreadMessages } from '@/src/hooks/useUnreadMessages';

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
  const { unreadCount } = useUnreadMessages();

  // Calculate total unread messages from context
  const unreadMessagesCount = localUnreadCount || contextUnreadCount;

  // Logo colors
  const primaryColor = '#6A3DE8'; // Purple from logo
  const secondaryColor = '#3D7BE8'; // Blue from logo

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

  // Add these console logs to debug the notification bubble
  useEffect(() => {
    console.log("Current unreadCount state:", unreadCount);
    console.log("Current localUnreadCount state:", localUnreadCount);
    console.log("Current contextUnreadCount:", contextUnreadCount);
    
    // Make sure the badge is visible when there are unread messages
    if (unreadCount > 0 || localUnreadCount > 0 || contextUnreadCount > 0) {
      console.log("Should be showing notification badge with count:", 
        Math.max(unreadCount, localUnreadCount, contextUnreadCount));
    }
  }, [unreadCount, localUnreadCount, contextUnreadCount]);

  // Update the NotificationBubble component to ensure it's visible
  const NotificationBubble = ({ count }) => {
    console.log("Rendering NotificationBubble with count:", count);
    
    // Force the bubble to show for testing
    const shouldShow = count > 0;
    
    if (!shouldShow) {
      console.log("NotificationBubble hidden because count is zero or undefined");
      return null;
    }
    
    return (
      <View style={{
        position: 'absolute',
        right: -6,
        top: -3,
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        // Add these to make sure it's visible
        zIndex: 999,
        elevation: 5,
      }}>
        <Text style={{
          color: '#fff',
          fontSize: 12,
          fontWeight: 'bold',
        }}>
          {count > 99 ? '99+' : count}
        </Text>
      </View>
    );
  };

  useEffect(() => {
    if (!session?.user?.id) return;
    
    // Set up real-time subscription for new messages
    const channel = supabase.channel(`unread-messages-${Date.now()}`);
    
    channel
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `recipient_id=eq.${session.user.id}` 
        }, 
        (payload) => {
          // Check if the new message is unread
          if (payload.new && !payload.new.read) {
            console.log('New unread message received:', payload.new);
            // Force refresh the unread count
            setLocalUnreadCount(prev => prev + 1);
          }
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${session.user.id}`
        },
        (payload) => {
          // If a message was marked as read, refresh the count
          console.log('Message updated:', payload.new);
          // We need to recalculate the total unread count
          fetchUnreadCount();
        }
      )
      .subscribe((status) => {
        console.log('Tab layout subscription status:', status);
      });
    
    // Cleanup function
    return () => {
      console.log('Cleaning up tab layout subscription');
      channel.unsubscribe();
    };
  }, [session?.user?.id]);

  return (
    <Tabs
      screenOptions={{
        headerTintColor: isDarkMode ? '#fff' : '#000',
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#000b15' : '#fff',
          borderTopWidth: 0.2,
          borderTopColor: '#6A3DE8',
        },
        headerStyle: {
          backgroundColor: isDarkMode ? '#000b15' : '#fff',
          height: 110,
          borderBottomWidth: 0.2,
          borderBottomColor: '#6A3DE8',
        },
        tabBarActiveTintColor: primaryColor,
        headerLeft: () => (
          <View style={{ marginLeft: 15, flexDirection: 'row', alignItems: 'center' }}>
            <Image 
              source={require('../../assets/images/LP2.png')} 
              style={{ width: 40, height: 35 }}
              resizeMode="contain"
            />
          </View>
        ),
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
                  <NotificationBubble count={unreadCount} />
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
        name="training"
        options={{
          title: isCoach ? 'Treningsplaner' : 'Din Plan',
          tabBarLabel: isCoach ? 'Treningsplaner' : 'Din Plan',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="fitness-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="diet"
        options={{
          title: "Diett",
          tabBarIcon: ({ color, size }) => <Ionicons name="restaurant" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="coachfeed"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
          href: isCoach ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="podcasts"
        options={{
          title: 'Podkast',
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
      <Tabs.Screen
        name="(messages)"
        options={{
          title: 'Messages',
          headerShown: false,
          tabBarIcon: ({ color, size }) => {
            console.log("Rendering Messages tab icon with counts:", {
              unreadCount,
              localUnreadCount,
              contextUnreadCount,
              unreadMessagesCount
            });
            
            return (
              <View>
                <Ionicons name="chatbubble" size={size} color={color} />
                <View style={{
                  position: 'absolute',
                  right: -6,
                  top: -3,
                  backgroundColor: '#FF3B30',
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 4,
                  zIndex: 999,
                }}>
                  <Text style={{
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 'bold',
                  }}>
                    {unreadMessagesCount || localUnreadCount || unreadCount}
                  </Text>
                </View>
              </View>
            );
          },
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

