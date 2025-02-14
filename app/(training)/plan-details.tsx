'use client';

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Platform, Pressable, Modal, TextInput, Linking, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { Button } from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTheme } from '@/src/context/ThemeContext';

type UserComment = {
  id: string;
  comment: string;
  created_at: string;
  user_id: string;
  strava_link?: string;
};

type Exercise = {
  id: number;
  name: string;
  notes: string;
  sets: number;
  reps: number;
  duration_minutes: number;
  week_number: number;
  day_number: number;
  completed: boolean;
  completed_at: string | null;
  comments: UserComment[];
  strava_link?: string;
  coach_comments?: UserComment[];
  type: string;
};

const WEEKDAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];

export default function PlanDetailsScreen() {
  const { planId } = useLocalSearchParams();
  const { isDarkMode } = useTheme();
  const [plan, setPlan] = useState<any>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed'>('all');
  const [expandedWeek, setExpandedWeek] = useState<number | null>(1); // Default to Week 1 expanded
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDayTitle, setSelectedDayTitle] = useState('');
  const [commentText, setCommentText] = useState('');
  const [stravaLink, setStravaLink] = useState('');
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);
  
  useEffect(() => {
    fetchPlanDetails();
  }, [planId]);

  const fetchPlanDetails = async () => {
    try {
      // Fetch plan details
      const { data: planData, error: planError } = await supabase
        .from('training_plans')
        .select(`
          *,
          coach:profiles!coach_id (username)
        `)
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      // Fetch exercises
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('training_plan_exercises')
        .select('*')
        .eq('plan_id', planId)
        .order('week_number')
        .order('day_number');

      if (exercisesError) throw exercisesError;

      setPlan(planData);
      setExercises(exercisesData);

      // Set initial week/day based on start date
      const startDate = new Date(planData.start_date);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const currentWeek = Math.ceil(diffDays / 7);
      const currentDay = today.getDay() || 7; // Convert Sunday (0) to 7

      if (currentWeek <= planData.duration_weeks) {
        setSelectedWeek(currentWeek);
        setSelectedDay(currentDay);
      }
    } catch (error) {
      console.error('Error fetching plan details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentWeek = () => {
    if (!plan?.start_date) return 1;
    const startDate = new Date(plan.start_date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 7);
  };

  const handleExerciseComplete = async (exercise: Exercise) => {
    try {
      const { error } = await supabase
        .from('training_plan_exercises')
        .update({ 
          completed: !exercise.completed,
          completed_at: !exercise.completed ? new Date().toISOString() : null
        })
        .eq('id', exercise.id);

      if (error) throw error;
      fetchPlanDetails();
    } catch (error) {
      console.error('Error updating exercise:', error);
      alert('Failed to update exercise');
    }
  };

  const getTodaysExercises = () => {
    if (!plan?.start_date) return [];
    const startDate = new Date(plan.start_date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const currentWeek = Math.ceil(diffDays / 7);
    const currentDay = today.getDay() || 7;

    return exercises.filter(ex => 
      ex.week_number === currentWeek && 
      ex.day_number === currentDay
    );
  };

  const isExerciseCompleted = (exerciseId: number) => {
    const exercise = exercises.find(ex => ex.id === exerciseId);
    return exercise?.completed || false;
  };

  const handleDayPress = (weekNumber: number, dayIndex: number) => {
    const dayExercises = exercises.filter(ex => 
      ex.week_number === weekNumber && 
      ex.day_number === dayIndex + 1
    );
    
    if (dayExercises.length > 0) {
      const dateString = getDateForWeekDay(weekNumber, dayIndex);
      const duration = getDayDuration(weekNumber, dayIndex);
      setSelectedExercises(dayExercises);
      setSelectedDayTitle(`Uke ${weekNumber} - ${WEEKDAYS[dayIndex]} (${dateString}) • ${duration}`);
      setModalVisible(true);
    }
  };

  const getDayStatus = (weekNumber: number, dayIndex: number) => {
    const dayExercises = exercises.filter(ex => 
      ex.week_number === weekNumber && 
      ex.day_number === dayIndex + 1 &&
      ex.type !== 'rest'  // Exclude rest exercises
    );
    
    if (dayExercises.length === 0) {
      // Check if it's a rest day
      const isRestDay = exercises.some(ex => 
        ex.week_number === weekNumber && 
        ex.day_number === dayIndex + 1 &&
        ex.type === 'rest'
      );
      return isRestDay ? 'rest' : null;
    }
    
    const completedCount = dayExercises.filter(ex => ex.completed).length;
    
    if (completedCount === dayExercises.length) {
      return 'completed';
    }
    return 'ongoing';
  };

  const handleExerciseCompletion = async (exerciseId: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Create the comment object with explicit structure
      const commentObject = [{
        id: generateUUID(),
        comment: commentText.trim(),
        created_at: new Date().toISOString(),
        user_id: user.id,
        strava_link: stravaLink.trim() || undefined
      }];

      console.log('Saving comment:', JSON.stringify(commentObject, null, 2));

      const { error } = await supabase
        .from('training_plan_exercises')
        .update({ 
          comments: commentObject,
          strava_link: stravaLink.trim() || null
        })
        .eq('id', exerciseId);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setEditingExerciseId(null);
      setCommentText('');
      setStravaLink('');
      fetchPlanDetails();
    } catch (error) {
      console.error('Error saving comment:', error);
      alert('Failed to save comment');
    }
  };

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const getDateForWeekDay = (weekNumber: number, dayIndex: number) => {
    // Get today's date
    const today = new Date();
    
    // Get current week day (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const currentDayOfWeek = today.getDay();
    
    // Calculate days to subtract to get to the start of the current week (Monday)
    const daysToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    
    // Get the date for Monday of the current week
    const currentWeekMonday = new Date(today);
    currentWeekMonday.setDate(today.getDate() - daysToMonday);
    
    // Calculate the target date based on week number and day index
    const targetDate = new Date(currentWeekMonday);
    targetDate.setDate(currentWeekMonday.getDate() + ((weekNumber - 1) * 7) + dayIndex);
    
    // Format the date
    return `${targetDate.getDate()}. ${getMonthName(targetDate.getMonth())}`;
  };

  const getMonthName = (monthIndex: number): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
    return months[monthIndex];
  };

  const getDayDuration = (weekNumber: number, dayIndex: number) => {
    const dayExercises = exercises.filter(ex => 
      ex.week_number === weekNumber && 
      ex.day_number === dayIndex + 1
    );
    const totalMinutes = dayExercises.reduce((sum, ex) => sum + (ex.duration_minutes || 0), 0);
    
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}t ${minutes}min`;
    }
    return `${totalMinutes}min`;
  };

  const handleCommentSubmit = async (exerciseId: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // First, get the current exercise and its comments
      const { data: currentExercise, error: fetchError } = await supabase
        .from('training_plan_exercises')
        .select('comments')
        .eq('id', exerciseId)
        .single();

      if (fetchError) throw fetchError;

      // Prepare the new comment
      const newComment = {
        id: generateUUID(),
        comment: commentText.trim(),
        created_at: new Date().toISOString(),
        user_id: user.id,
        strava_link: stravaLink.trim() || undefined
      };

      // Combine existing comments with new comment
      const existingComments = Array.isArray(currentExercise?.comments) ? currentExercise.comments : [];
      const updatedComments = [...existingComments, newComment];

      // Update the exercise with all comments
      const { error } = await supabase
        .from('training_plan_exercises')
        .update({
          comments: updatedComments
        })
        .eq('id', exerciseId);

      if (error) throw error;

      setEditingExerciseId(null);
      setCommentText('');
      setStravaLink('');
      fetchPlanDetails();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#121212' : '#f5f5f5',
    },
    header: {
      padding: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDarkMode ? '#fff' : '#333',
    },
    subtitle: {
      fontSize: 16,
      color: isDarkMode ? '#fff' : '#333',
      marginTop: 4,
    },
    progressSection: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
      margin: 16,
      padding: 16,
      borderRadius: 12,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 16,
      color: isDarkMode ? '#fff' : '#000',
    },
    progressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    progressBar: {
      height: 8,
      backgroundColor: isDarkMode ? '#2C2C2C' : '#F5F5F5',
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: isDarkMode ? '#0047AB' : '#000',
      borderRadius: 4,
    },
    progressText: {
      color: isDarkMode ? '#fff' : '#000',
    },
    weekContainer: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: 12,
      overflow: 'hidden',
    },
    weekHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      color: isDarkMode ? '#fff' : '#000',
    },
    weekHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    weekTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: isDarkMode ? '#fff' : '#000',
    },
    dayRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#2C2C2C' : '#eee',

    },
    dayText: {
      fontSize: 16,
      color: isDarkMode ? '#fff' : '#000',
    },
    dateText: {
      fontSize: 12,
      color: isDarkMode ? '#fff' : '#666',
    },
    ongoingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5FF',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 16,
    },
    ongoingText: {
      color: isDarkMode ? '#fff' : '#666',
      fontSize: 14,
    },
    completedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDarkMode ? '#1E1E1E' : '#E8F5E9',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 16,
    },
    completedText: {
      textDecorationLine: 'line-through',
      color: isDarkMode ? '#fff' : '#666',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContainer: {
      width: '100%',
      maxWidth: 400,
      maxHeight: '80%',
      paddingBottom:200,
    },
    modalContent: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
      borderRadius: 12,
      padding: 20,
      paddingBottom: 250,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDarkMode ? '#fff' : '#000',
    },
    closeButton: {
      fontSize: 24,
      fontWeight: '400',
      color: isDarkMode ? '#fff' : '#000',
      padding: 4,
    },
    exerciseItem: {
      flexDirection: 'row',
      marginBottom: 20,
      padding: 12,
      backgroundColor: isDarkMode ? '#1E1E1E' : '#F8F8F8',
      borderRadius: 12,
      borderBottomColor: isDarkMode ? '#2C2C2C' : '#fff',
      borderBottomWidth: isDarkMode ? 1 : 0,
      gap: 12,
    },
    exerciseInfo: {
      flex: 1,
    },
    exerciseName: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 4,
      color: isDarkMode ? '#fff' : '#000',
    },
    exerciseDetails: {
      fontSize: 14,
      color: isDarkMode ? '#fff' : '#666',
    },
    checkboxContainer: {
      marginLeft: 8,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
    },
    ongoingButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDarkMode ? '#FF4B4B' : '#FF4B4B',
      alignItems: 'center',
    },
    ongoingButtonText: {
      color: isDarkMode ? '#FF4B4B' : '#FF4B4B',
      fontSize: 16,
      fontWeight: '500',
    },
    completeButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      backgroundColor: isDarkMode ? '#0047AB' : '#0047AB',
      alignItems: 'center',
    },
    completeButtonText: {
      color: isDarkMode ? '#fff' : '#fff',
      fontSize: 16,
      fontWeight: '500',
    },
    daySubtitle: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    durationText: {
      fontSize: 12,
      color: isDarkMode ? '#fff' : '#666',
      marginLeft: 4,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#121212' : '#f5f5f5',
    },
    commentContainer: {
      backgroundColor: isDarkMode ? '#2C2C2C' : '#fff',
      padding: 12,
      borderRadius: 8,
      marginTop: 8,
    },
    commentLabel: {
      fontSize: 12,
      color: '#999',
      marginBottom: 4,
    },
    commentText: {
      color: isDarkMode ? '#fff' : '#000',
      fontSize: 14,
    },
    commentDate: {
      fontSize: 12,
      color: '#666',
      marginTop: 4,
      textAlign: 'right',
    },
    stravaLink: {
      marginTop: 8,
    },
    stravaLinkText: {
      color: '#FC4C02',
      fontSize: 14,
    },
    commentForm: {
      marginTop: 8,
      gap: 8,
    },
    commentInput: {
      borderWidth: 1,
      borderColor: isDarkMode ? '#444' : '#ddd',
      borderRadius: 8,
      padding: 8,
      color: isDarkMode ? '#fff' : '#000',
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
    },
    commentButtons: {
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'flex-end',
    },
    addCommentButton: {
      marginTop: 8,
      padding: 8,
      backgroundColor: isDarkMode ? '#2C2C2C' : '#fff',
      borderRadius: 8,
      alignItems: 'center',
    },
    addCommentText: {
      color: isDarkMode ? '#fff' : '#000',
      fontSize: 14,
    },
    coachCommentContainer: {
      backgroundColor: isDarkMode ? '#1E3A8A' : '#E3F2FD',
    },
    description: {
      fontSize: 14,
      color: isDarkMode ? '#fff' : '#666',
    },
    restBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDarkMode ? '#2C2C2C' : '#F5F5F5',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 16,
    },
    restText: {
      fontSize: 14,
    },
  }); 
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={isDarkMode ? '#fff' : '#0047AB'} />
      </View>
    );
  }

  const todaysExercises = getTodaysExercises();

  const renderExercise = (exercise: Exercise) => (
    <View key={exercise.id} style={styles.exerciseItem}>
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <Text style={styles.exerciseDetails}>
          {exercise.sets} sets × {exercise.reps} reps • {exercise.duration_minutes}min
        </Text>
        {exercise.notes && (
          <Text style={styles.description}>{exercise.notes}</Text>
        )}
        
        {exercise.completed && renderComments(exercise)}

        {exercise.completed && editingExerciseId === exercise.id && (
          <View style={styles.commentForm}>
            <TextInput
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Legg inn kommentar..."
              placeholderTextColor={isDarkMode ? '#666' : '#666'}
              multiline
            />
            <TextInput
              style={styles.commentInput}
              value={stravaLink}
              onChangeText={setStravaLink}
              placeholder="Strava aktivitetslenke (valgfritt)"
              placeholderTextColor={isDarkMode ? '#666' : '#666'}
            />
            <View style={styles.commentButtons}>
              <Button 
                title="Avbryt"
                onPress={() => {
                  setEditingExerciseId(null);
                  setCommentText('');
                  setStravaLink('');
                }}
                style={{ backgroundColor: isDarkMode ? '#2C2C2C' : '#fff' }}
                textStyle={{ color: isDarkMode ? '#fff' : '#000' }}
              />
              <Button 
                title="Lagre" 
                onPress={() => handleCommentSubmit(exercise.id)}
                style={{ backgroundColor: isDarkMode ? '#2C2C2C' : '#fff' }}
                textStyle={{ color: isDarkMode ? '#fff' : '#000' }}
              />
            </View>
          </View>
        )}

        {exercise.completed && !editingExerciseId && (
          <Pressable 
            style={styles.addCommentButton}
            onPress={() => {
              setEditingExerciseId(exercise.id);
              setCommentText(exercise.comment || '');
              setStravaLink(exercise.strava_link || '');
            }}
          >
            <Text style={styles.addCommentText}>
              {exercise.comment ? 'Rediger kommentar' : 'Legg inn kommentar'}
            </Text>
          </Pressable>
        )}
      </View>

      <Pressable
        style={styles.checkboxContainer}
        onPress={() => handleExerciseComplete(exercise)}
        disabled={loadingProgress}
      >
        {exercise.type === 'rest' ? (
          <View style={styles.restBadge}>
            <Ionicons name="bed-outline" size={16} color={isDarkMode ? '#fff' : '#666'} />
            <Text style={[styles.restText, { color: isDarkMode ? '#fff' : '#666' }]}>
              Hviledag
            </Text>
          </View>
        ) : exercise.completed === false ? (
          <View style={styles.ongoingBadge}>
            <Ionicons name="time-outline" size={16} color="#7B61FF" />
            <Text style={styles.ongoingText}>
              {exercises.filter(ex => 
                ex.week_number === exercise.week_number && 
                ex.day_number === exercise.day_number && 
                ex.type !== 'rest' && 
                ex.completed
              ).length}/
              {exercises.filter(ex => 
                ex.week_number === exercise.week_number && 
                ex.day_number === exercise.day_number && 
                ex.type !== 'rest'
              ).length} 
            </Text>
          </View>
        ) : (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          </View>
        )}
      </Pressable>
    </View>
  );

  const renderComments = (exercise: Exercise) => {
    // Combine all comments and sort them by date
    const allComments = [
      ...(exercise.comments || []).map(comment => ({
        ...comment,
        type: 'user'
      })),
      ...(exercise.coach_comments || []).map(comment => ({
        ...comment,
        type: 'coach'
      }))
    ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return (
      <ScrollView>
        {allComments.map((comment, index) => (
          <View 
            key={comment.id || index} 
            style={[
              styles.commentContainer,
              comment.type === 'coach' && styles.coachCommentContainer
            ]}
          >
            <Text style={styles.commentLabel}>
              {comment.type === 'coach' ? 'Coach kommentar:' : 'Dine kommentarer:'}
            </Text>
            <Text style={styles.commentText}>{comment.comment}</Text>
            {comment.type === 'user' && comment.strava_link && (
              <Pressable 
                onPress={async () => {
                  const url = comment.strava_link!;
                  // Check if the URL can be opened
                  const canOpen = await Linking.canOpenURL(url);
                  if (canOpen) {
                    await Linking.openURL(url);
                  } else {
                    Alert.alert('Error', 'Cannot open Strava link');
                  }
                }}
                style={styles.stravaLink}
              >
                <Text style={[styles.stravaLinkText, { color: '#FC4C02' }]}>Se på Strava</Text>
              </Pressable>
            )}
            <Text style={styles.commentDate}>
              {format(new Date(comment.created_at), 'PPp')}
            </Text>
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Ditt program</Text>
          <Text style={styles.subtitle}>{plan?.duration_weeks}-ukers program</Text>
        </View>

        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>Fremgang</Text>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>Uke {getCurrentWeek()}</Text>
            <Text style={styles.progressText}>
              {exercises
                .filter(ex => 
                  ex.week_number === getCurrentWeek() && 
                  ex.type !== 'rest' &&
                  ex.completed
                ).length}/
              {exercises
                .filter(ex => 
                  ex.week_number === getCurrentWeek() && 
                  ex.type !== 'rest'
                ).length} fullført
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${(exercises
                    .filter(ex => ex.week_number === getCurrentWeek() && ex.type !== 'rest' && ex.completed).length / 
                    exercises.filter(ex => ex.week_number === getCurrentWeek() && ex.type !== 'rest').length) * 100}%` 
                }
              ]} 
            />
          </View>
        </View>

        {Array.from({ length: plan?.duration_weeks || 0 }).map((_, weekIndex) => {
          const weekNumber = weekIndex + 1;
          return (
            <View key={weekNumber} style={styles.weekContainer}>
              <Pressable 
                style={styles.weekHeader}
                onPress={() => setExpandedWeek(expandedWeek === weekNumber ? null : weekNumber)}
              >
                <View style={styles.weekHeaderLeft}>
                  <Ionicons name="calendar-outline" size={20} color={isDarkMode ? '#fff' : '#000'} />
                  <Text style={styles.weekTitle}>Uke {weekNumber}</Text>
                </View>
                <Ionicons 
                  name={expandedWeek === weekNumber ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={isDarkMode ? '#fff' : '#000'} 
                />
              </Pressable>

              {expandedWeek === weekNumber && WEEKDAYS.map((day, dayIndex) => {
                const hasExercises = exercises.some(ex => 
                  ex.week_number === weekNumber && 
                  ex.day_number === dayIndex + 1
                );
                
                if (!hasExercises) return null;
                
                const status = getDayStatus(weekNumber, dayIndex);
                const dateString = getDateForWeekDay(weekNumber, dayIndex);
                const duration = getDayDuration(weekNumber, dayIndex);

                return (
                  <Pressable 
                    key={dayIndex}
                    style={styles.dayRow}
                    onPress={() => handleDayPress(weekNumber, dayIndex)}
                  >
                    <View>
                      <Text style={styles.dayText}>{day}</Text>
                      <View style={styles.daySubtitle}>
                        <Text style={styles.dateText}>{dateString}</Text>
                        {/* If exercise type is rest, do not show duration */}
                        {status !== 'rest' && (
                          <Text style={styles.durationText}>• {duration}</Text>
                        )}
                      </View>
                    </View>
                    {status === 'rest' ? (
                      <View style={styles.restBadge}>
                        <Ionicons name="bed-outline" size={16} color={isDarkMode ? '#fff' : '#666'} />
                        <Text style={[styles.restText, { color: isDarkMode ? '#fff' : '#666' }]}>
                          Hviledag
                        </Text>
                      </View>
                    ) : status === 'ongoing' ? (
                      <View style={styles.ongoingBadge}>
                        <Ionicons name="time-outline" size={16} color="#7B61FF" />
                        <Text style={styles.ongoingText}>
                          {exercises.filter(ex => 
                            ex.week_number === weekNumber && 
                            ex.day_number === dayIndex + 1 && 
                            ex.type !== 'rest' && 
                            ex.completed
                          ).length}/
                          {exercises.filter(ex => 
                            ex.week_number === weekNumber && 
                            ex.day_number === dayIndex + 1 && 
                            ex.type !== 'rest'
                          ).length} fullført
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.completedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                        <Text style={styles.completedText}>
                          {exercises.filter(ex => 
                            ex.week_number === weekNumber && 
                            ex.day_number === dayIndex + 1 && 
                            ex.type !== 'rest' && 
                            ex.completed
                          ).length}/
                          {exercises.filter(ex => 
                            ex.week_number === weekNumber && 
                            ex.day_number === dayIndex + 1 && 
                            ex.type !== 'rest'
                          ).length} fullført
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
      {/* Only show modal if the selected exercises are NOT rest type */}
      {selectedExercises.some(exercise => exercise.type !== 'rest') && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedDayTitle}</Text>
                  <Pressable 
                    onPress={() => setModalVisible(false)}
                    hitSlop={10}
                  >
                    <Text style={styles.closeButton}>×</Text>
                  </Pressable>
                </View>
             
                {selectedExercises
                  .filter(exercise => exercise.type !== 'rest')
                  .map((exercise) => renderExercise(exercise))}
             
                <View style={styles.modalButtons}>
                  {!selectedExercises.filter(ex => ex.type !== 'rest').every(exercise => exercise.completed) ? (
                    <Pressable
                      style={styles.completeButton}
                      onPress={async () => {
                        for (const exercise of selectedExercises.filter(ex => ex.type !== 'rest')) {
                          if (!exercise.completed) {
                            await handleExerciseComplete(exercise);
                          }
                        }
                        setModalVisible(false);
                      }}
                    >
                      <Text style={styles.completeButtonText}>Fullfør</Text>
                    </Pressable>
                  ) : (
                    <Pressable style={{ backgroundColor: 'transparent' }} />
                  )}
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

