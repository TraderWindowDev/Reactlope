import React from 'react';
import { View, Text, FlatList, Image, StyleSheet, Pressable, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePosts } from '@/src/context/PostContext';
import PostCard from '../../components/PostCard';

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

type Story = {
  id: string;
  username: string;
  avatar: string;
  isYourStory?: boolean;
};

const stories: Story[] = [
  {
    id: 'your-story',
    username: 'Your Story',
    avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
    isYourStory: true,
  },
  {
    id: '1',
    username: 'Jonas',
    avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
  },
  {
    id: '2',
    username: 'Morten',
    avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
  },
  {
    id: '3',
    username: 'Mikkel',
    avatar: 'https://randomuser.me/api/portraits/women/4.jpg',
  },
  {
    id: '4',
    username: 'Ole',
    avatar: 'https://randomuser.me/api/portraits/men/5.jpg',
  },
];


const StoryCircle = ({ story }: { story: Story }) => (
  <View style={styles.storyContainer}>
    <View style={[styles.storyCircle, story.isYourStory && styles.yourStoryCircle]}>
      <Image source={{ uri: story.avatar }} style={styles.storyAvatar} />
      {story.isYourStory && (
        <View style={styles.addStoryButton}>
          <Ionicons name="add" size={18} color="#fff" />
        </View>
      )}
    </View>
    <Text style={styles.storyUsername} numberOfLines={1}>
      {story.username}
    </Text>
  </View>
);

function CustomHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>LOPEPRAT</Text>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="search" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIcon}>
          <View style={styles.notificationBadge}>
            <Text style={styles.badgeText}>3</Text>
          </View>
          <Ionicons name="notifications" size={24} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { posts, loading, likePost, unlikePost } = usePosts();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF4B4B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader />
      <FlatList
        data={posts}
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
        ListHeaderComponent={() => (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.storiesContainer}
            contentContainerStyle={styles.storiesContent}>
            {stories.map(story => (
              <StoryCircle key={story.id} story={story} />
            ))}
          </ScrollView>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginLeft: 20,
    position: 'relative',
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
    backgroundColor: '#fff',
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
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  timeAgo: {
    fontSize: 14,
    color: '#666',
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
  },
});