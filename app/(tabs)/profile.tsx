import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, FlatList, Pressable, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { Button } from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

type Profile = {
  username: string;
  avatar_url: string;
  bio: string;
  followers_count: number;
  following_count: number;
};

type Post = {
  id: number;
  image_url: string;
  likes_count: number;
  comments_count: number;
};

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
    fetchUserPosts();
  }, []);

  const fetchProfile = async () => {
    try {
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          username,
          avatar_url,
          bio,
          followers:followers_count,
          following:following_count
        `)
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchUserPosts = async () => {
    try {
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profile:profiles!user_id (
            username,
            avatar_url
          ),
          likes:likes(count),
          comments:comments(count)
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our Post type
      const transformedPosts = data?.map(post => ({
        id: post.id,
        image_url: post.image_url || null,
        likes_count: post.likes?.length || 0,
        comments_count: post.comments?.length || 0
      })) || [];

      setPosts(transformedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  function CustomHeader() {
    return (
      <View style={styles.customHeader}>
        <Text style={styles.customHeaderTitle}>Profile</Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => router.push('/(settings)/settings')}
        >
          <Ionicons name="settings-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader />

      <View style={styles.header}>
        <Image
          source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/100' }}
          style={styles.avatar}
        />
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{posts.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile?.followers_count || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile?.following_count || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>
      </View>

      <Text style={styles.username}>{profile?.username || 'Username'}</Text>
      <Text style={styles.bio}>{profile?.bio || 'No bio yet'}</Text>

      <Button
        title="Edit Profile"
        onPress={() => {/* TODO: Navigate to edit profile */}}
        variant="outline"
        style={styles.editButton}
      />

      {posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={64} color="#666" />
          <Text style={styles.emptyTitle}>No Posts Yet</Text>
          <Text style={styles.emptyDescription}>
            Share your first photo or video!
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          numColumns={3}
          renderItem={({ item }) => (
            <Pressable style={styles.postThumbnail}>
              <Image
                source={{ uri: item.image_url }}
                style={styles.postImage}
              />
            </Pressable>
          )}
          keyExtractor={item => item.id.toString()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customHeader: {
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,

  },
  customHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  stats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  username: {
    fontSize: 16,
    paddingTop: 10,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  editButton: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  postThumbnail: {
    flex: 1/3,
    aspectRatio: 1,
  },
  postImage: {
    flex: 1,
    margin: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: 8,
  },
});