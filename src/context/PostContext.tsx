import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
  likePost: (postId: number) => Promise<void>;
  unlikePost: (postId: number) => Promise<void>;
  refreshPosts: () => Promise<void>;
};

const PostContext = createContext<PostContextType | undefined>(undefined);

export function PostProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

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

  const likePost = async (postId: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: existingLike } = await supabase
        .from('likes')
        .select()
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      if (!existingLike) {
        const { error } = await supabase.from('likes').insert({
          post_id: postId,
          user_id: user.id
        });
        if (error) throw error;
      }
      
      await fetchPosts();
    } catch (error) {
      console.error('Error liking post:', error);
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

  useEffect(() => {
    fetchPosts();
  }, []);

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