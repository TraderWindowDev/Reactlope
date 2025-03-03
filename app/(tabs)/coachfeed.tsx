import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

type ProgressItem = {
  id: string;
  user: {
    id: string;
    username: string;
    avatar_url: string;
  };
  training_plan: {
    id: string;
    title: string;
  };
  completed_exercises: number;
  total_exercises: number;
  last_activity: string;
};

export default function CoachFeedScreen() {
  const { session, isCoach } = useAuth();
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProgress = async () => {
    try {
      console.log('Fetching progress for coach:', session?.user?.id);
      
      const { data: trainingPlanExercises, error: exercisesError } = await supabase
        .from('training_plan_exercises')
        .select(`
          plan_id,
          completed,
          training_plans!inner(
            id,
            title,
            user_training_plans(
              user_id
            )
          )
        `)
        .eq('training_plans.coach_id', session?.user?.id);

      if (exercisesError) {
        console.error('Error fetching training plan exercises:', exercisesError);
        return;
      }

      const progressData: ProgressItem[] = [];
      const processedPlans = new Set();

      for (const exercise of trainingPlanExercises) {
        if (processedPlans.has(exercise.plan_id)) continue;
        processedPlans.add(exercise.plan_id);

        const userPlan = exercise.training_plans.user_training_plans[0];
        if (!userPlan) continue;

        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', userPlan.user_id)
          .single();

        if (userError) {
          console.error('Error fetching user data:', userError);
          continue;
        }

        // Get completed exercises count
        const { data: exercisesData, error: countError } = await supabase
          .from('training_plan_exercises')
          .select('completed')
          .eq('plan_id', exercise.plan_id);

        if (countError) {
          console.error('Error fetching exercises count:', countError);
          continue;
        }

        const totalExercises = exercisesData.length;
        const completedExercises = exercisesData.filter(ex => ex.completed).length;

        // Get latest activity
        const { data: latestActivity } = await supabase
          .from('training_plan_exercises')
          .select('completed_at')
          .eq('plan_id', exercise.plan_id)
          .eq('completed', true)
          .order('completed_at', { ascending: false })
          .limit(1)
          .single();

        progressData.push({
          id: `${exercise.plan_id}-${userPlan.user_id}`,
          user: userData,
          training_plan: {
            id: exercise.plan_id,
            title: exercise.training_plans.title
          },
          completed_exercises: completedExercises,
          total_exercises: totalExercises,
          last_activity: latestActivity?.completed_at || null
        });
      }

      setProgress(progressData.sort((a, b) => 
        new Date(b.last_activity || 0).getTime() - new Date(a.last_activity || 0).getTime()
      ));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isCoach) {
      router.replace('/training');
      return;
    }
    fetchProgress();
  }, [session?.user?.id, isCoach]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProgress();
  };

  const renderProgressItem = ({ item }: { item: ProgressItem }) => {
    const progress = (item.completed_exercises / item.total_exercises) * 100;
    
    return (
      <Pressable 
        style={[styles.card, { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff' }]}
        onPress={() => router.push(`/(training)/${item.training_plan.id}/view-progress`)}
      >
        <View style={styles.header}>
          <Image 
            source={{ uri: item.user.avatar_url || 'https://via.placeholder.com/40' }}
            style={styles.avatar}
          />
          <View style={styles.headerText}>
            <Text style={[styles.username, { color: isDarkMode ? '#fff' : '#000' }]}>
              {item.user.username}
            </Text>
            <Text style={styles.planTitle}>
              {item.training_plan.title}
            </Text>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${progress}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {item.completed_exercises} / {item.total_exercises} exercises completed
          </Text>
        </View>

        {item.last_activity && (
          <Text style={styles.lastActivity}>
            Last active {formatDistanceToNow(new Date(item.last_activity), { addSuffix: true })}
          </Text>
        )}
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDarkMode ? '#121212' : '#f5f5f5' }]}>
        <ActivityIndicator size="large" color="#0047AB" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#f5f5f5' }]}>
      <FlatList
        data={progress}
        renderItem={renderProgressItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        removeClippedSubviews={false}
        maxToRenderPerBatch={10}
        windowSize={5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDarkMode ? '#fff' : '#000'}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons 
              name="fitness-outline" 
              size={48} 
              color={isDarkMode ? '#666' : '#999'} 
            />
            <Text style={[styles.emptyText, { color: isDarkMode ? '#fff' : '#000' }]}>
              No training progress to show
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerText: {
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  planTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  lastActivity: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 16,
  },
});
