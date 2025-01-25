import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

type Post = {
  id: number;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
  likes_count: number[];
  comments_count: number[];
  liked_by_user: boolean;
};

type PostContextType = {
  posts: Post[];
  loading: boolean;
  createPost: (content: string, imageUrl?: string) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: number) => Promise<void>;
  refreshPosts: () => Promise<void>;
};

const PostContext = createContext<PostContextType | undefined>(undefined);

export function PostProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  const fetchPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profile:profiles!user_id (
            username,
            avatar_url
          ),
          likes:likes(*),
          comments:comments(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const postsWithLikeStatus = data?.map(post => ({
        ...post,
        liked_by_user: post.likes?.some(like => like.user_id === user?.id) || false,
        likes_count: post.likes?.length || 0,
        comments_count: post.comments?.length || 0
      }));

      console.log('Posts with likes:', postsWithLikeStatus);
      setPosts(postsWithLikeStatus || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (content: string, imageUrl?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase.from('posts').insert({
        content,
        image_url: imageUrl,
        user_id: user.id  // This links the post to the user's profile
      });

      if (error) throw error;
      await fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchPosts();

    // Set up real-time subscription for posts
    const postsSubscription = supabase
      .channel('posts_channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'posts' 
        }, 
        () => {
          fetchPosts();
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'likes' 
        }, 
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      postsSubscription.unsubscribe();
    };
  }, [session]);

  const likePost = async (postId: string) => {
    if (!session?.user?.id) {
      console.log('No session user');
      return;
    }

    try {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('likes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', session.user.id)
        .single();

      if (existingLike) {
        console.log('Post already liked');
        return;
      }

      // Add like to post
      const { error: likeError } = await supabase
        .from('likes')
        .insert({ 
          post_id: postId, 
          user_id: session.user.id 
        });

      if (likeError) {
        console.error('Like error:', likeError);
        throw likeError;
      }

      console.log('Like added successfully');

      // Get post owner
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('user_id, profile:profiles(username)')
        .eq('id', postId)
        .single();

      if (postError) {
        console.error('Post fetch error:', postError);
        throw postError;
      }

      console.log('Post data:', postData);

      if (postData && postData.user_id !== session.user.id) {
        // Create notification
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: postData.user_id,
            sender_id: session.user.id,
            type: 'like',
            content: 'liked your post',
            related_id: postId
          });

        if (notificationError) {
          console.error('Error creating notification:', notificationError);
        }
      }
    } catch (error) {
      console.error('Error in likePost:', error);
    }
  };

  const unlikePost = async (postId: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('likes')
        .delete()
        .match({ post_id: postId, user_id: user.id });
      if (error) throw error;
      await fetchPosts();
    } catch (error) {
      console.error('Error unliking post:', error);
      throw error;
    }
  };

  return (
    <PostContext.Provider value={{ 
      posts, 
      loading, 
      createPost, 
      likePost, 
      unlikePost,
      refreshPosts: fetchPosts 
    }}>
      {children}
    </PostContext.Provider>
  );
}

export const usePosts = () => {
  const context = useContext(PostContext);
  if (context === undefined) {
    throw new Error('usePosts must be used within a PostProvider');
  }
  return context;
}; 