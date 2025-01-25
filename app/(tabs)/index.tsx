import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, Pressable, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePosts } from '@/src/context/PostContext';
import PostCard from '../../components/PostCard';
import {useTheme} from '@/src/context/ThemeContext';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { supabase } from '@/src/lib/supabase';

type Post = {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  content: string;
  image?: string;
  likes: number;
  comments: number;
  timeAgo: string;
};
type Profile = {
  username: string;
  avatar_url: string;
  name: string;
}
export default function HomeScreen() {
  const { isDarkMode } = useTheme();
  const { posts, loading, likePost, unlikePost, refreshPosts } = usePosts();
  const { session } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refreshPosts();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', session?.user?.id).single();
    if (error) console.error('Error fetching profile:', error);
    setProfile(data);
  };

  const CreatePostInput = () => (
    <View style={styles.createPostWrapper}>
      <Pressable 
        style={styles.createPostContainer}
        onPress={() => router.push('/(create)/create')}
      >
        <Image 
            source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/100' }}
            style={styles.avatar}
          />
        <View style={styles.createPostInputContainer}>
          <Text style={styles.createPostPlaceholder}>
            {profile?.username || 'Write something...'}
          </Text>
        </View>
      </Pressable>
      
      <View style={styles.quickActionsContainer}>
        <Pressable 
          style={styles.quickActionButton}
          onPress={() => router.push('/(create)/create?type=photo')}
        >
          <Ionicons 
            name="image-outline" 
            size={24} 
            color={isDarkMode ? '#fff' : '#666'} 
          />
          <Text style={styles.quickActionText}>Photo</Text>
        </Pressable>
        
        <Pressable 
          style={styles.quickActionButton}
          onPress={() => router.push('/(create)/create?type=video')}
        >
          <Ionicons 
            name="videocam-outline" 
            size={24} 
            color={isDarkMode ? '#fff' : '#666'} 
          />
          <Text style={styles.quickActionText}>Video</Text>
        </Pressable>
        
        <Pressable 
          style={styles.quickActionButton}
          onPress={() => router.push('/(create)/create?type=activity')}
        >
          <Ionicons 
            name="fitness-outline" 
            size={24} 
            color={isDarkMode ? '#fff' : '#666'} 
          />
          <Text style={styles.quickActionText}>Activity</Text>
        </Pressable>
      </View>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#121212' : '#f5f5f5',
      paddingTop: 10,
    },
    notificationBadge: {
      position: 'absolute',
      right: -6,
      top: -6,
      backgroundColor: 'red',
      borderRadius: 10,
      width: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    badgeText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: 'bold',
    },
    contentContainer: {
      padding: 16,
    },
    postCard: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    postHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    postHeaderText: {
      flex: 1,
      color: isDarkMode ? '#fff' : '#000',
    },
    userName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDarkMode ? '#fff' : '#000',
    },
    timeAgo: {
      fontSize: 14,
      color: isDarkMode ? '#fff' : '#666',
    },
    content: {
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 12,
    },
    postImage: {
      width: '100%',
      height: 200,
      borderRadius: 8,
      marginBottom: 12,
    },
    actions: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: '#eee',
      paddingTop: 12,
      marginTop: 4,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 24,
    },
    actionText: {
      marginLeft: 6,
      color: '#666',
      fontSize: 14,
    },
    storiesContainer: {
      marginBottom: 16,
    },
    storiesContent: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    storyContainer: {
      alignItems: 'center',
      marginRight: 16,
      width: 72,
    },
    storyCircle: {
      width: 68,
      height: 68,
      borderRadius: 34,
      borderWidth: 2,
      borderColor: '#1E90FF',
      padding: 2,
      marginBottom: 4,
    },
    yourStoryCircle: {
      borderColor: '#ddd',
    },
    storyAvatar: {
      width: '100%',
      height: '100%',
      borderRadius: 32,
    },
    addStoryButton: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      backgroundColor: '#1E90FF',
      borderRadius: 12,
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#fff',
    },
    storyUsername: {
      fontSize: 12,
      textAlign: 'center',
      width: '100%',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#121212' : '#f5f5f5',
    },
    createPostWrapper: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    createPostContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#2C2C2C' : '#eee',
    },
    createPostAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    createPostInputContainer: {
      flex: 1,
      height: 40,
      justifyContent: 'center',
      backgroundColor: isDarkMode ? '#2C2C2C' : '#f5f5f5',
      borderRadius: 20,
      paddingHorizontal: 16,
    },
    createPostPlaceholder: {
      color: isDarkMode ? '#666' : '#999',
      fontSize: 16,
    },
    quickActionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 8,
    },
    quickActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
    },
    quickActionText: {
      marginLeft: 4,
      fontSize: 14,
      color: isDarkMode ? '#fff' : '#666',
    },
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0047AB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        ListHeaderComponent={CreatePostInput}
        renderItem={({ item }) => (
          <PostCard
            post={{
              ...item,
              user: {
                username: item.profile?.username || 'Anonymous',
                avatar_url: item.profile?.avatar_url || 'https://via.placeholder.com/40'
              },
              likes_count: item.likes || [],
              comments_count: item.comments || []
            }}
            onLike={() => likePost(item.id)}
            onUnlike={() => unlikePost(item.id)}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDarkMode ? '#fff' : '#000'}
          />
        }
      />
    </View>
  );
}

