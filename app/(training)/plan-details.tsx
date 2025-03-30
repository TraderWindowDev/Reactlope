'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Platform, Pressable, Modal, TextInput, Linking, Alert, AppState, AppStateStatus, RefreshControl } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { Button } from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, getDay, addDays, eachWeekOfInterval, isSameWeek, startOfDay, parseISO } from 'date-fns';
import { useTheme } from '@/src/context/ThemeContext';
import { nb } from 'date-fns/locale';

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
  distance?: number;
  pace?: string;
  description?: string;
  perceived_exertion?: number; // 1-5 rating
};


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
  const [viewMode, setViewMode] = useState<'calendar' | 'weeks'>('weeks');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isDescriptionCollapsed, setIsDescriptionCollapsed] = useState(true);
  const [selectedDayExercises, setSelectedDayExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const [showExertionRating, setShowExertionRating] = useState(false);
  const [selectedExertion, setSelectedExertion] = useState<number | null>(null);
  
  // Define onRefresh callback outside of useEffect to maintain consistent hook order
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPlanDetails().finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    fetchPlanDetails();
  }, [planId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) && 
        nextAppState === 'active'
      ) {
        fetchPlanDetails();
      }
      
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

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

      // Calculate current week based on start_date
      const startDate = new Date(planData.start_date);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const currentWeek = Math.ceil(diffDays / 7);

      // Calculate the current day number (1-7) based on the start date
      const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const currentDay = (daysSinceStart % 7) + 1;

      if (currentWeek <= planData.duration_weeks) {
        setSelectedWeek(currentWeek);
        setSelectedDay(currentDay);
        setExpandedWeek(currentWeek);
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
      if (!exercise.completed) {
        // If marking as completed, show exertion rating first
        setShowExertionRating(true);
        return; // Exit early to show rating
      }
      
      // If marking as not completed, proceed normally
      const updatedExercise = {
        ...exercise,
        completed: !exercise.completed,
        completed_at: !exercise.completed ? new Date().toISOString() : null
      };
      
      // Update the local state immediately for a responsive UI
      setSelectedExercise(updatedExercise);
      
      // Update the exercises array to reflect the change
      setExercises(prevExercises => 
        prevExercises.map(ex => 
          ex.id === exercise.id ? updatedExercise : ex
        )
      );

      // Then update in the database
      const { error } = await supabase
        .from('training_plan_exercises')
        .update({ 
          completed: updatedExercise.completed,
          completed_at: updatedExercise.completed_at,
          perceived_exertion: null // Clear exertion when marking as not completed
        })
        .eq('id', exercise.id);

      if (error) {
        // If there's an error, revert the local changes
        console.error('Error updating exercise:', error);
        setSelectedExercise(exercise);
        setExercises(prevExercises => 
          prevExercises.map(ex => 
            ex.id === exercise.id ? exercise : ex
          )
        );
        throw error;
      }
    } catch (error) {
      console.error('Error updating exercise:', error);
      alert('Failed to update exercise');
    }
  };

  const handleExertionSelect = async (rating: number) => {
    if (!selectedExercise) return;
    
    try {
      // Update the exercise with completion and exertion rating
      const updatedExercise = {
        ...selectedExercise,
        completed: true,
        completed_at: new Date().toISOString(),
        perceived_exertion: rating
      };
      
      // Update local state
      setSelectedExercise(updatedExercise);
      setSelectedExertion(rating);
      
      // Update exercises array
      setExercises(prevExercises => 
        prevExercises.map(ex => 
          ex.id === selectedExercise.id ? updatedExercise : ex
        )
      );
      
      // Update in database
      const { error } = await supabase
        .from('training_plan_exercises')
        .update({ 
          completed: true,
          completed_at: new Date().toISOString(),
          perceived_exertion: rating
        })
        .eq('id', selectedExercise.id);
        
      if (error) throw error;
      
      // Hide exertion rating and show comment form
      setShowExertionRating(false);
      setEditingExerciseId(selectedExercise.id);
    } catch (error) {
      console.error('Error saving exertion rating:', error);
      alert('Failed to save rating');
      setShowExertionRating(false);
    }
  };

  const getExertionEmoji = (rating: number) => {
    switch (rating) {
      case 1: return '😌';
      case 2: return '🙂';
      case 3: return '😊';
      case 4: return '😓';
      case 5: return '😫';
      default: return '';
    }
  };

  const getExertionLabel = (rating: number) => {
    switch (rating) {
      case 1: return 'Svært lett';
      case 2: return 'Lett';
      case 3: return 'Moderat';
      case 4: return 'Hard';
      case 5: return 'Maks anstrengelse';
      default: return 'Moderat';
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

  const handleDayPress = (weekNumber: number, dayNumber: number) => {
    const dayExercises = exercises.filter(ex => 
      ex.week_number === weekNumber && 
      ex.day_number === dayNumber
    );
    
    if (dayExercises.length > 0) {
      setSelectedExercise(dayExercises[0]); // Or handle multiple exercises if needed
      setModalVisible(true);
    }
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

  const getDateForWeekDay = (weekNumber: number, dayNumber: number) => {
    if (!plan?.start_date) return '';
    
    try {
      // Parse the ISO date string properly
      const startDate = parseISO(plan.start_date);
      
      // Calculate days to add
      const daysToAdd = ((weekNumber - 1) * 7) + (dayNumber - 1);
      
      // Create new date by adding days
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + daysToAdd);
      
    
      
      return format(date, 'dd.MM', { locale: nb });
    } catch (error) {
      console.error('Date calculation error:', error);
      return '';
    }
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

  const calculateRemainingWeeks = (plan: any) => {
    if (!plan?.start_date || !plan?.duration_weeks) return 0;
    
    const startDate = new Date(plan.start_date);
    const currentDate = new Date();
    const weeksPassed = Math.floor((currentDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const remainingWeeks = Math.max(0, plan.duration_weeks - weeksPassed);
    
    return remainingWeeks;
  };

  const calculateWeekDistance = () => {
    const weekExercises = exercises.filter(ex => ex.week_number === selectedWeek);
    const totalDistance = weekExercises.reduce((sum, exercise) => {
      return sum + (exercise.distance || 0);
    }, 0);
    return totalDistance;
  };

  const handleWeekChange = (change: number) => {
    const newWeek = selectedWeek + change;
    if (newWeek > 0 && newWeek <= (plan?.duration_weeks || 0)) {
      setSelectedWeek(newWeek);
    }
  };

  const getDayName = (dayIndex: number) => {
    const days = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];
    return days[dayIndex];
  };

  const getExerciseIcon = (type: string) => {
    switch (type) {
      case 'interval':
        return 'flash-outline';
      case 'rolig':
        return 'walk-outline';
      case 'terskel':
        return 'trending-up-outline';
      case 'moderat':
        return 'speedometer-outline';
      case 'lang':
        return 'infinite-outline';
      case 'rest':
        return 'bed-outline';
      default:
        return 'fitness-outline';
    }
  };

  const getExerciseColor = (type: string) => {
    switch (type) {
      case 'interval':
        return '#FF4081'; // Pink
      case 'rolig':
        return '#4CAF50'; // Green
      case 'terskel':
        return '#9C27B0'; // Purple
      case 'moderat':
        return '#FF9800'; // Orange
      case 'lang':
        return '#E91E63'; // Deep Pink
      case 'rest':
        return '#9E9E9E'; // Grey
      default:
        return '#2196F3'; // Blue
    }
  };

  const getShortExerciseType = (type: string) => {
    switch (type.toLowerCase()) {
      case 'interval':
        return 'Inter';
      case 'rolig':
        return 'Rolig';
      case 'terskel':
        return 'Tersk';
      case 'moderat':
        return 'Mod';
      case 'lang':
        return 'Lang';
      case 'rest':
        return 'Hvile';
      default:
        return type;
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#05101a' : '#f5f5f5',
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
      padding: 16,
      backgroundColor: isDarkMode ? '#000b15' : '#fff',
      borderRadius: 12,
      borderWidth: 0.2,
      borderColor: '#6A3DE8',
      margin: 16,
    },
    weekHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    weekNavText: {
      color: '#0047AB',
      fontSize: 16,
    },
    weekNumberContainer: {
      alignItems: 'center',
    },
    weekLabel: {
      fontSize: 14,
      color: '#666',
    },
    weekNumber: {
      fontSize: 32,
      fontWeight: '600',
      color: isDarkMode ? '#fff' : '#000',
    },
    totalDistance: {
      fontSize: 16,
      color: '#666',
      marginBottom: 16,
    },
    dayRow: {
      marginBottom: 16,
      padding: 12,
      borderRadius: 12,
      borderWidth: 0.2,
      borderColor: '#6A3DE8',
      backgroundColor: isDarkMode ? '#05101a' : '#f5f5f5',
    },
    dayRowWithExercise: {
      backgroundColor: isDarkMode ? '#05101a' : '#f5f5f5',
      borderWidth: 0.2,
      borderColor: '#6A3DE8',
    },
    dayInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    dayName: {
      fontSize: 16,
      fontWeight: '500',
      color: isDarkMode ? '#fff' : '#000',
    },
    dayDate: {
      fontSize: 14,
      color: '#666',
    },
    exerciseCard: {
      backgroundColor: isDarkMode ? '#000b15' : '#fff',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    exerciseHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    exerciseTypeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    exerciseType: {
      fontSize: 14,
      fontWeight: '500',
    },
    exerciseStatus: {
      fontSize: 14,
      color: '#666',
    },
    exerciseName: {
      fontSize: 16,
      fontWeight: '500',
      color: isDarkMode ? '#fff' : '#000',
      marginBottom: 8,
    },
    exerciseDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
      color: isDarkMode ? '#fff' : '#000',
    },
    detailLabel: {
      fontSize: 14,
      color: '#666',
    },
    detailValue: {
      fontSize: 14,
      color: isDarkMode ? '#fff' : '#000',
    },
    restDay: {
      fontSize: 16,
      color: '#666',
      textAlign: 'center',
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
      justifyContent: 'flex-start',
      paddingTop: 100,
    },
    modalContainer: {
      width: '100%',
      maxWidth: 400,
      maxHeight: '80%',
      paddingBottom:100,
    },
    modalContent: {
      margin: 20,
      borderRadius: 16,
      padding: 20,
      backgroundColor: '#fff',
    },
    modalContentDark: {
      backgroundColor: '#05101a',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
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
      backgroundColor: isDarkMode ? '#000b15' : '#F8F8F8',
      borderRadius: 12,
      borderBottomColor: isDarkMode ? '#2C2C2C' : '#fff',
      borderBottomWidth: isDarkMode ? 1 : 0,
      gap: 12,
    },
    exerciseInfo: {
      flex: 1,
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
      backgroundColor: isDarkMode ? '#000b15' : '#f5f5f5',
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
      backgroundColor: isDarkMode ? '#2C2C2C' : '#2C2C2C',
      borderRadius: 8,
      alignItems: 'center',
    },
    addCommentText: {
      color: isDarkMode ? '#fff' : '#fff',
      fontSize: 14,
    },
    coachCommentContainer: {
      backgroundColor: isDarkMode ? '#1E3A8A' : '#E3F2FD',
    },
    description: {
      fontSize: 14,
      color: isDarkMode ? '#fff' : '#666',
      marginBottom: 8,
      borderTopWidth: 1,
      width: '100%',
      borderColor: isDarkMode ? '#444' : '#ddd',
      padding: 8,
    },
    descriptionHeader: {
      fontSize: 12,
      marginTop: 20,
      marginBottom: 8,
      fontWeight: 'bold',
      color: isDarkMode ? '#fff' : '#000',
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
    calendarContainer: {
      padding: 16,
      backgroundColor: isDarkMode ? '#000b15' : '#fff',
      borderRadius: 12,
      borderWidth: 0.2,
      borderColor: '#6A3DE8',
      margin: 16,
    },
    calendarHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    monthTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    weekDays: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      marginBottom: 8,
    },
    weekDayText: {
      width: `${100/7}%`,
      textAlign: 'center',
      fontSize: 14,
      fontWeight: '500',
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: `${100/7}%`,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 4,
    },
    hasExercise: {
      backgroundColor: isDarkMode ? '#2C2C2C' : '#f5f5f5',
      borderRadius: 8,
    },
    otherMonthDay: {
      opacity: 0.3,
    },
    otherMonthText: {
      color: isDarkMode ? '#666' : '#999',
    },
    dayNumber: {
      fontSize: 16,
      fontWeight: '500',
    },
    exerciseTag: {
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 2,
    },
    exerciseTagText: {
      fontSize: 10,
      color: '#fff',
      fontWeight: '500',
    },
    viewToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: isDarkMode ? '#000b15' : '#fff',
      borderRadius: 12,
    },
    planHeader: {
      padding: 16,
      backgroundColor: isDarkMode ? '#000b15' : '#fff',
      borderRadius: 12,
      margin: 16,
      borderWidth: 0.2,
      borderColor: '#6A3DE8',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    planTitle: {
      fontSize: 24,
      fontWeight: '600',
      flex: 1,
    },
    weeksRemaining: {
      fontSize: 16,
      color: '#666',
    },
    planDate: {
      fontSize: 16,
      color: '#666',
      marginTop: 8,
    },
    descriptionCard: {
      backgroundColor: isDarkMode ? '#000b15' : '#fff',
      borderRadius: 12,
      margin: 16,
      padding: 16,
      borderWidth: 0.2,
      borderColor: '#6A3DE8',
    },
    descriptionTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 8,
      color: isDarkMode ? '#fff' : '#000',
    },
    descriptionText: {
      fontSize: 16,
      lineHeight: 24,
      color: '#666',
    },
    readMoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      gap: 4,
    },
    readMoreText: {
      color: '#666',
      fontSize: 14,
    },
    viewToggleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#000b15' : '#fff',
      margin: 16,
      borderWidth: 0.2,
      borderColor: '#6A3DE8',
      padding: 16,
      borderRadius: 12,
      gap: 8,
    },
    viewToggleText: {
      fontSize: 16,
      flex: 1,
    },
    modalScrollView: {
      maxHeight: '90%',
    },
    todayCell: {
      backgroundColor: isDarkMode ? '#0047AB30' : '#0047AB15',
      borderWidth: 0.5,
      borderColor: '#6A3DE8',
      borderRadius: 8,
    },
    todayRow: {
      borderWidth: 0.5,
      borderColor: '#6A3DE8',
      backgroundColor: isDarkMode ? '#0047AB15' : '#0047AB08',
    },
    todayText: {
      color: '#0047AB',
      fontWeight: '600',
    },
    darkText: {
      color: isDarkMode ? '#fff' : '#000',
    },
    textDark: {
      color: '#fff',
    },
    textLight: {
      color: '#000',
    },
    exerciseTypeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    detailsGrid: {
      marginBottom: 24,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    descriptionSection: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#333' : '#eee',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    completeCheckbox: {
      padding: 4,
    },
    exerciseNameRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
   exerciseStatusRow: {
      marginBottom: 12,
    },
    exerciseStatusText: {
      fontSize: 14,
    },
    completedStatusText: {
      color: '#4CAF50',
    },
    plannedStatusText: {
      color: '#666',
    },
    exertionCard: {
      backgroundColor: isDarkMode ? '#000b15' : '#fff',
      borderRadius: 12,
      borderWidth: 0.2,
      borderColor: '#6A3DE8',
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
    },
    exertionRating: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    exertionOption: {
      alignItems: 'center',
      padding: 8,
      borderRadius: 8,
      width: '18%',
    },
    selectedExertion: {
      backgroundColor: isDarkMode ? '#444' : '#e0e0e0',
    },
    exertionEmoji: {
      fontSize: 24,
      marginBottom: 4,
    },
    exertionLabel: {
      fontSize: 10,
      textAlign: 'center',
    },
    savedExertionDisplay: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
    },
    savedExertionLabel: {
      fontSize: 14,
      fontWeight: '500',
      marginTop: 4,
    },
    savedExertion: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 8,
    },
    savedExertionTitle: {
      fontSize: 14,
      fontWeight: '500',
    },
    savedExertionValue: {
      fontSize: 14,
      fontWeight: '500',
    },
    commentsSection: {
      marginBottom: 16,
    },
    commentsSectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
    },
    commentItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    saveCommentButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      backgroundColor: isDarkMode ? '#0047AB' : '#0047AB',
      alignItems: 'center',
    },
    saveCommentButtonText: {
      color: isDarkMode ? '#fff' : '#fff',
      fontSize: 16,
      fontWeight: '500',
    },
    noCommentsText: {
      fontStyle: 'italic',
      textAlign: 'center',
      padding: 12,
    },
    fakePlacement: {
      flex: 1,
      padding: 22,
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

  const renderModal = () => {
    if (!selectedExercise) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollView}>
            <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
              {/* Header with close button */}
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color={isDarkMode ? '#fff' : '#000'} />
                </Pressable>
              </View>

              {/* Main exercise info card */}
              <View style={styles.exerciseCard}>
                {/* Exercise type badge */}
                <View style={styles.exerciseTypeRow}>
                  <Ionicons 
                    name={getExerciseIcon(selectedExercise.type)} 
                    size={16} 
                    color={getExerciseColor(selectedExercise.type)} 
                  />
                  <Text style={[styles.exerciseType, { color: getExerciseColor(selectedExercise.type) }]}>
                    {selectedExercise.type}
                  </Text>
                </View>
                
                {/* Exercise name with completion checkbox */}
                <View style={styles.exerciseNameRow}>
                  <Text style={[
                    styles.exerciseName, 
                    { color: isDarkMode ? '#fff' : '#000' },
                    selectedExercise.completed && styles.completedText
                  ]}>
                    {selectedExercise.name}
                  </Text>
                  
                  <Pressable 
                    onPress={() => handleExerciseComplete(selectedExercise)}
                    style={styles.completeCheckbox}
                  >
                    <Ionicons 
                      name={selectedExercise.completed ? "checkmark-circle" : "ellipse-outline"} 
                      size={24} 
                      color={selectedExercise.completed ? "#4CAF50" : isDarkMode ? '#fff' : '#000'} 
                    />
                  </Pressable>
                </View>

                {/* Status text (Completed/Planned) */}
                <View style={styles.exerciseStatusRow}>
                  <Text style={[
                    styles.exerciseStatusText,
                    selectedExercise.completed ? styles.completedStatusText : styles.plannedStatusText
                  ]}>
                    {selectedExercise.completed ? 'Fullført' : 'Planlagt'}
                  </Text>
                </View>

                {/* Exercise details */}
                <Text style={[styles.exerciseDetails, { color: isDarkMode ? '#fff' : '#000' }]}>
                  {selectedExercise.sets > 0 && `${selectedExercise.sets} sets`}
                  {selectedExercise.sets > 0 && selectedExercise.reps > 0 && ' • '}
                  {selectedExercise.reps > 0 && `${selectedExercise.reps} reps`}
                  {(selectedExercise.sets > 0 || selectedExercise.reps > 0) && selectedExercise.duration_minutes && ' • '}
                  {selectedExercise.duration_minutes && `${selectedExercise.duration_minutes}min`}
                </Text>
                
                {/* Exercise description if available */}
                {selectedExercise.description && (
                  <View style={styles.descriptionSection}>
                    <Text style={[styles.descriptionTitle, { color: isDarkMode ? '#ddd' : '#333' }]}>
                      Beskrivelse
                    </Text>
                    <Text style={[styles.descriptionText, { color: isDarkMode ? '#bbb' : '#666' }]}>
                      {selectedExercise.description}
                    </Text>
                  </View>
                )}
              </View>

              {/* Exertion Rating Card */}
              {showExertionRating ? (
                <View style={styles.exertionCard}>
                  <Text style={[styles.cardTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
                  Opplevd anstrengelse
                  </Text>
                  <View style={styles.exertionRating}>
                    {[1, 2, 3, 4, 5].map(rating => (
                      <Pressable
                        key={rating}
                        style={[
                          styles.exertionOption,
                          selectedExertion === rating && styles.selectedExertion
                        ]}
                        onPress={() => handleExertionSelect(rating)}
                      >
                        <Text style={styles.exertionEmoji}>
                          {getExertionEmoji(rating)}
                        </Text>
                        <Text style={[styles.exertionLabel, { color: isDarkMode ? '#ddd' : '#333' }]}>
                          {getExertionLabel(rating)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : selectedExercise.completed && selectedExercise.perceived_exertion ? (
                <View style={styles.exertionCard}>
                  <Text style={[styles.cardTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
                    Opplevd anstrengelse
                  </Text>
                  <View style={styles.savedExertionDisplay}>
                    <Text style={styles.exertionEmoji}>
                      {getExertionEmoji(selectedExercise.perceived_exertion)}
                    </Text>
                    <Text style={[styles.savedExertionLabel, { color: isDarkMode ? '#fff' : '#000' }]}>
                      {getExertionLabel(selectedExercise.perceived_exertion)}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Comments Card - only show if exercise is completed and not showing exertion rating */}
              {selectedExercise.completed && !showExertionRating && (
                <View style={styles.commentsCard}>
                  <Text style={[styles.cardTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
                    Kommentar
                  </Text>
                  
                  {/* Existing comments */}
                  {selectedExercise.comments && selectedExercise.comments.length > 0 ? (
                    selectedExercise.comments.map((comment, index) => (
                      <View key={index} style={styles.commentItem}>
                        <Text style={[styles.commentText, { color: isDarkMode ? '#fff' : '#000' }]}>
                          {comment.comment}
                        </Text>
                        {comment.strava_link && (
                          <Pressable 
                            style={styles.stravaLink}
                            onPress={() => Linking.openURL(comment.strava_link)}
                          >
                            <Text style={styles.stravaLinkText}>View on Strava</Text>
                          </Pressable>
                        )}
                      </View>
                    ))
                  ) : editingExerciseId !== selectedExercise.id ? (
                    <Text style={[styles.noCommentsText, { color: isDarkMode ? '#aaa' : '#666' }]}>
                      Ingen kommentarer lagt til
                    </Text>
                  ) : null}
                  
                  {/* Add comment form or button */}
                  {editingExerciseId === selectedExercise.id ? (
                    <View style={styles.commentForm}>
                      <TextInput
                        style={[styles.commentInput, { color: isDarkMode ? '#fff' : '#000', backgroundColor: isDarkMode ? '#333' : '#f5f5f5' }]}
                        placeholder="Legg til kommentar..."
                        placeholderTextColor={isDarkMode ? '#aaa' : '#999'}
                        value={commentText}
                        onChangeText={setCommentText}
                        multiline
                      />
                      <TextInput
                        style={[styles.commentInput, { color: isDarkMode ? '#fff' : '#000', backgroundColor: isDarkMode ? '#333' : '#f5f5f5' }]}
                        placeholder="Strava lenke (valgfritt)"
                        placeholderTextColor={isDarkMode ? '#aaa' : '#999'}
                        value={stravaLink}
                        onChangeText={setStravaLink}
                      />
                      <Pressable 
                        style={styles.saveCommentButton}
                        onPress={() => handleExerciseCompletion(selectedExercise.id)}
                      >
                        <Text style={styles.saveCommentButtonText}>Save Notes</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable 
                      style={styles.addCommentButton}
                      onPress={() => setEditingExerciseId(selectedExercise.id)}
                    >
                      <Text style={styles.addCommentText}>Legg til kommentar</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const getCalendarDays = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  const getExerciseForDay = (date: Date) => {
    if (!plan?.start_date) return null;
    
    const startDate = new Date(plan.start_date);
    const diffTime = date.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Calculate week and day number from the difference
    const weekNumber = Math.floor(diffDays / 7) + 1;
    const dayNumber = date.getDay() || 7; // Convert Sunday (0) to 7
    
    return exercises.find(ex => 
      ex.week_number === weekNumber && 
      ex.day_number === dayNumber
    );
  };

  const CalendarView = () => {
    const days = getCalendarDays();
    const firstDayOfMonth = startOfMonth(currentMonth);
    const startDate = startOfWeek(firstDayOfMonth, { weekStartsOn: 1 });
    const daysToShow = [...Array(42)].map((_, index) => {
      const date = addDays(startDate, index);
      const exercise = getExerciseForDay(date);
      const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
      
      return (
        <Pressable 
          key={date.toString()} 
          style={[
            styles.dayCell, 
            exercise && styles.hasExercise,
            !isCurrentMonth && styles.otherMonthDay,
            isToday(date) && styles.todayCell
          ]}
          onPress={() => {
            if (exercise) {
              handleDayPress(exercise.week_number, exercise.day_number);
            }
          }}
        >
          <Text style={[
            styles.dayNumber, 
            isDarkMode && styles.darkText,
            !isCurrentMonth && styles.otherMonthText,
            isToday(date) && styles.todayText
          ]}>
            {format(date, 'd')}
          </Text>
          {exercise && (
            <View style={[styles.exerciseTag, { backgroundColor: getExerciseColor(exercise.type) }]}>
              <Text style={styles.exerciseTagText}>
                {exercise.type === 'rest' ? 'Hvile' : getShortExerciseType(exercise.type)}
              </Text>
            </View>
          )}
        </Pressable>
      );
    });
    
    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <Pressable 
            onPress={() => {
              setCurrentMonth(prev => {
                const newDate = new Date(prev);
                newDate.setMonth(prev.getMonth() - 1);
                return newDate;
              });
            }}
          >
            <Ionicons name="chevron-back" size={24} color={isDarkMode ? '#fff' : '#000'} />
          </Pressable>
          <Text style={[styles.monthTitle, isDarkMode && styles.darkText]}>
            {format(currentMonth, 'MMMM yyyy', { locale: nb })}
          </Text>
          <Pressable 
            onPress={() => {
              setCurrentMonth(prev => {
                const newDate = new Date(prev);
                newDate.setMonth(prev.getMonth() + 1);
                return newDate;
              });
            }}
          >
            <Ionicons name="chevron-forward" size={24} color={isDarkMode ? '#fff' : '#000'} />
          </Pressable>
        </View>

        <View style={styles.weekDays}>
          {['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'].map(day => (
            <Text key={day} style={[styles.weekDayText, isDarkMode && styles.darkText]}>{day}</Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {daysToShow}
        </View>
      </View>
    );
  };

  const WeekView = () => {
    // Get the first day of the current month
    const firstDayOfMonth = startOfMonth(currentMonth);
    
    // Get all the weeks in the month
    const weeks = eachWeekOfInterval(
      {
        start: startOfWeek(firstDayOfMonth, { weekStartsOn: 1 }),
        end: endOfMonth(currentMonth)
      },
      { weekStartsOn: 1 }
    );

    // Find the current week number within the month
    const currentWeekIndex = weeks.findIndex(week => 
      isSameWeek(new Date(), week, { weekStartsOn: 1 })
    );

    return (
      <View style={styles.weekContainer}>
        {/* Week Header */}
        <View style={styles.weekHeader}>
          <Pressable onPress={() => handleWeekChange(-1)}>
            {/* TODO: Remove forrige if week is 1 */}
            {/* TODO: Add disabled if week is 1 */}
            {(() => {
              if (selectedWeek === 1) {
                return <Text style={styles.fakePlacement}></Text>
              }
              else {
                return <Text style={styles.weekNavText}>Forrige</Text>
              }
            })()}
          </Pressable>
          <View style={styles.weekNumberContainer}>
            <Text style={styles.weekLabel}>Uke</Text>
            <Text style={styles.weekNumber}>{selectedWeek}</Text>
          </View>
          <Pressable onPress={() => handleWeekChange(1)}>
            {/* TODO: Remove neste if week is last week */}
            {(() => {
              if (selectedWeek !== 4) {
                return <Text style={styles.weekNavText}>Neste</Text>
              }
              else {
                return <Text style={styles.fakePlacement}></Text>
              }
            })()}
          </Pressable>
        </View>

        {/* Total Distance */}
        <Text style={styles.totalDistance}>Antall km: {calculateWeekDistance()} km</Text>

        {/* Days List */}
        {[1, 2, 3, 4, 5, 6, 7].map((dayNumber) => {
          const dayExercises = exercises.filter(ex => 
            ex.week_number === selectedWeek && 
            ex.day_number === dayNumber
          );
          const date = getDateForWeekDay(selectedWeek, dayNumber);
          
          return (
            <Pressable 
              key={dayNumber}
              style={[
                styles.dayRow,
                dayExercises.length > 0 && styles.dayRowWithExercise,
                isToday(new Date(date)) && styles.todayRow
              ]}
              onPress={() => dayExercises.length > 0 && handleDayPress(selectedWeek, dayNumber)}
            >
              <View style={styles.dayInfo}>
                <Text style={[
                  styles.dayName,
                  isToday(new Date(date)) && styles.todayText
                ]}>
                  {getDayName(dayNumber - 1)}
                </Text>
                <Text style={[
                  styles.dayDate,
                  isToday(new Date(date)) && styles.todayText
                ]}>
                  {date}
                </Text>
              </View>
              
              {dayExercises.map(exercise => (
                <View key={exercise.id} style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <View style={styles.exerciseTypeContainer}>
                      <Ionicons 
                        name={getExerciseIcon(exercise.type)} 
                        size={16} 
                        color={getExerciseColor(exercise.type)} 
                      />
                      <Text style={[styles.exerciseType, { color: getExerciseColor(exercise.type) }]}>
                        {exercise.type}
                      </Text>
                    </View>
                    <Text style={styles.exerciseStatus}>
                      {exercise.completed ? 'Fullført' : 'Planlagt'}
                    </Text>
                  </View>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  {exercise.distance && (
                    <View style={styles.exerciseDetails}>
                      <Text style={styles.detailLabel}>Distanse</Text>
                      <Text style={styles.detailValue}>{exercise.distance} km</Text>
                    </View>
                  )}
                  {exercise.pace && (
                    <View style={styles.exerciseDetails}>
                      <Text style={styles.detailLabel}>Pace</Text>
                      <Text style={styles.detailValue}>{exercise.pace}</Text>
                    </View>
                  )}
                </View>
              ))}
              
              {dayExercises.length === 0 && (
                <Text style={styles.restDay}>Hvile</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getFormattedTimeRemaining = () => {
    if (!plan?.start_date || !plan?.duration_weeks) return '';
    
    const startDate = new Date(plan.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time part for accurate day comparison
    
    // Calculate end date (start date + duration in weeks)
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (plan.duration_weeks * 7 - 1)); // Subtract 1 to make it inclusive
    
    // If plan hasn't started yet
    if (today < startDate) {
      const diffTime = startDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Starter i morgen';
      if (diffDays < 7) return `Starter om ${diffDays} dager`;
      
      const weeks = Math.floor(diffDays / 7);
      if (weeks === 1) return 'Starter om 1 uke';
      return `Starter om ${weeks} uker`;
    }
    
    // If plan has ended
    if (today > endDate) {
      return 'Fullført';
    }
    
    // If plan is in progress
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 dag igjen';
    if (diffDays < 7) return `${diffDays} dager igjen`;
    
    const weeks = Math.floor(diffDays / 7);
    const remainingDays = diffDays % 7;
    
    if (weeks === 1) {
      if (remainingDays === 0) return '1 uke igjen';
      return `1 uke og ${remainingDays} dager igjen`;
    }
    
    if (remainingDays === 0) return `${weeks} uker igjen`;
    return `${weeks} uker og ${remainingDays} dager igjen`;
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Plan Header */}
        <View style={styles.planHeader}>
          <View style={styles.titleRow}>
            <Ionicons name="flag" size={24} color={isDarkMode ? '#fff' : '#000'} />
            <Text style={[styles.planTitle, isDarkMode && styles.darkText]}>
              {plan?.title}
            </Text>
            <Text style={styles.weeksRemaining}>
              {getFormattedTimeRemaining()}
            </Text>
          </View>
          <Text style={styles.planDate}>
            {plan?.start_date && format(new Date(plan.start_date), 'EEEE d. MMMM yyyy', { locale: nb })}
          </Text>
        </View>

        {/* Description Section */}
        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionTitle}>Beskrivelse</Text>
          <Text 
            style={[styles.descriptionText, isDarkMode && styles.darkText]}
            numberOfLines={isDescriptionCollapsed ? 3 : undefined}
          >
            {plan?.description}
          </Text>
          <Pressable 
            onPress={() => setIsDescriptionCollapsed(!isDescriptionCollapsed)}
            style={styles.readMoreButton}
          >
            <Text style={styles.readMoreText}>
              {isDescriptionCollapsed ? 'Les mindre' : 'Les mer'} 
            </Text>
            <Ionicons 
              name={isDescriptionCollapsed ? "chevron-up" : "chevron-down"} 
              size={16} 
              color="#666" 
            />
          </Pressable>
        </View>

        {/* View Toggle */}
        <Pressable 
          style={styles.viewToggleCard}
          onPress={() => setViewMode(viewMode === 'calendar' ? 'weeks' : 'calendar')}
        >
          <Ionicons 
            name={viewMode === 'calendar' ? "list-outline" : "calendar-outline"} 
            size={20} 
            color={isDarkMode ? '#fff' : '#000'} 
          />
          <Text style={[styles.viewToggleText, isDarkMode && styles.darkText]}>
            {viewMode === 'calendar' ? 'Se uke for uke' : 'Se kalender'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#fff' : '#000'} />
        </Pressable>

        {viewMode === 'calendar' ? (
          <CalendarView />
        ) : (
          <WeekView />
        )}
      </ScrollView>
      {renderModal()}
    </View>
  );
}


