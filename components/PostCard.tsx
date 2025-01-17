import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type PostCardProps = {
  post: {
    id: number;
    content: string;
    image_url?: string;
    created_at: string;
    user: {
      username: string;
      avatar_url: string;
    };
    likes_count: number;
    comments_count: number;
    liked_by_user?: boolean;
  };
  onLike: () => void;
  onUnlike: () => void;
};

export default function PostCard({ post, onLike, onUnlike }: PostCardProps) {
  const likesCount = post.likes_count?.length || 0;
  const commentsCount = post.comments_count?.length || 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Image
          source={{ uri: post.user?.avatar_url || 'https://via.placeholder.com/40' }}
          style={styles.avatar}
        />
        <View>
          <Text style={styles.username}>{post.user?.username || 'Anonymous'}</Text>
          <Text style={styles.time}>
            {new Date(post.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <Text style={styles.content}>{post.content}</Text>
      
      {post.image_url && (
        <Image
          source={{ uri: post.image_url }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.footer}>
        <Pressable 
          style={styles.actionButton} 
          onPress={post.liked_by_user ? onUnlike : onLike}
        >
          <Ionicons
            name={post.liked_by_user ? "heart" : "heart-outline"}
            size={24}
            color={post.liked_by_user ? "#FF4B4B" : "#666"}
          />
          <Text style={styles.actionText}>{likesCount}</Text>
        </Pressable>

        <View style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={24} color="#666" />
          <Text style={styles.actionText}>{commentsCount}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  header: {
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
  username: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  time: {
    fontSize: 12,
    color: '#666',
  },
  content: {
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
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
}); 