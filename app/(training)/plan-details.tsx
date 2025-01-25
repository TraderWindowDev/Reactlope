'use client';

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Platform, Pressable, Modal } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTheme } from '@/src/context/ThemeContext';
type Exercise = {
  id?: number;
  name: string;
  description: string;
  sets: number;
  reps: number;
  duration_minutes: number;
  week_number: number;
  day_number: number;
  notes: string;
  difficulty: string;
  completed: boolean;
  plan_id: number;
};

type RoutineProgress = {
  id: number;
  current_week: number;
  completed_exercises: number[];
  status: 'active' | 'completed';
};

const WEEKDAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];

export default function PlanDetailsScreen() {
  const { planId } = useLocalSearchParams();
  const { isDarkMode } = useTheme();
  const [plan, setPlan] = useState<any>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [routineProgress, setRoutineProgress] = useState<RoutineProgress | null>(null);
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
  
  useEffect(() => {
    fetchPlanDetails();
    fetchRoutineProgress();
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

  const fetchRoutineProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('routine_progress')
        .select('*')
        .eq('user_id', user?.id)
        .eq('plan_id', planId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setRoutineProgress(data || null);
    } catch (error) {
      console.error('Error fetching routine progress:', error);
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

  const handleExerciseComplete = async (exerciseId: number) => {
    try {
      setLoadingProgress(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      let progress = routineProgress;
      if (!progress) {
        // Create new routine progress if it doesn't exist
        const { data, error } = await supabase
          .from('routine_progress')
          .insert({
            user_id: user?.id,
            plan_id: planId,
            current_week: getCurrentWeek(),
            completed_exercises: [exerciseId],
            status: 'active'
          })
          .select()
          .single();

        if (error) throw error;
        progress = data;
      } else {
        // Update existing routine progress
        const completed = progress.completed_exercises || [];
        const newCompleted = completed.includes(exerciseId)
          ? completed.filter(id => id !== exerciseId)
          : [...completed, exerciseId];

        const { data, error } = await supabase
          .from('routine_progress')
          .update({
            completed_exercises: newCompleted,
            current_week: getCurrentWeek()
          })
          .eq('id', progress.id)
          .select()
          .single();

        if (error) throw error;
        progress = data;
      }

      setRoutineProgress(progress);
    } catch (error) {
      console.error('Error updating exercise progress:', error);
      alert('Failed to update progress');
    } finally {
      setLoadingProgress(false);
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
    return routineProgress?.completed_exercises?.includes(exerciseId) || false;
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
      ex.day_number === dayIndex + 1
    );
    
    if (dayExercises.length === 0) return null;
    
    const completedCount = dayExercises.filter(ex => isExerciseCompleted(ex.id)).length;
    
    if (completedCount === dayExercises.length) {
      return 'completed';
    }
    return 'ongoing';
  };

  const handleExerciseCompletion = async (exercise: Exercise) => {
    try {
      const { error } = await supabase
        .from('training_plan_exercises')
        .update({ completed: !exercise.completed })
        .eq('id', exercise.id);

      if (error) throw error;

      // Check if all exercises are completed after this update
      const { data: exercises } = await supabase
        .from('training_plan_exercises')
        .select('completed')
        .eq('plan_id', planId);

      const allCompleted = exercises?.every(ex => ex.completed) ?? false;
      if (allCompleted) {
        // Update plan completion status
        const { data: { user } } = await supabase.auth.getUser();
        await supabase
          .from('user_training_plans')
          .update({ completed: true })
          .eq('plan_id', planId)
          .eq('user_id', user?.id);
      }

      fetchPlanDetails(); // Refresh the view
    } catch (error) {
      console.error('Error updating exercise completion:', error);
      alert('Failed to update exercise completion');
    }
  };

  const getDateForWeekDay = (weekNumber: number, dayIndex: number) => {
    if (!plan?.start_date) return '';
    const startDate = new Date(plan.start_date);
    const dayOffset = (weekNumber - 1) * 7 + dayIndex;
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + dayOffset);
    return format(date, 'd. MMM'); // Will format as e.g. "15. Mar"
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
    },
    modalContent: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
      borderRadius: 12,
      padding: 20,
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
  }); 
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={isDarkMode ? '#fff' : '#0047AB'} />
      </View>
    );
  }

  const todaysExercises = getTodaysExercises();

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
                .filter(ex => ex.week_number === getCurrentWeek() && 
                  routineProgress?.completed_exercises?.includes(ex.id))
                .length}/
              {exercises.filter(ex => ex.week_number === getCurrentWeek()).length} fullført
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${((routineProgress?.completed_exercises?.length || 0) / exercises.filter(ex => ex.week_number === getCurrentWeek()).length) * 100}%` 
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
                        <Text style={styles.durationText}>• {duration}</Text>
                      </View>
                    </View>
                    {status === 'ongoing' ? (
                      <View style={styles.ongoingBadge}>
                        <Ionicons name="time-outline" size={16} color="#7B61FF" />
                        <Text style={styles.ongoingText}>{exercises.filter(ex => ex.week_number === weekNumber && ex.day_number === dayIndex + 1 && ex.completed).length}/{exercises.filter(ex => ex.week_number === weekNumber && ex.day_number === dayIndex + 1).length} fullført</Text>
                      </View>
                    ) : (
                      <View style={styles.completedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                        <Text style={styles.completedText}>{exercises.filter(ex => ex.week_number === weekNumber && ex.day_number === dayIndex + 1 && routineProgress?.completed_exercises?.includes(ex.id)).length}/{exercises.filter(ex => ex.week_number === weekNumber && ex.day_number === dayIndex + 1).length} fullført</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

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

              {selectedExercises.map((exercise) => (
                <Pressable
                  key={exercise.id}
                  style={styles.exerciseItem}
                >
                  <View style={styles.exerciseInfo}>
                    <Text style={[styles.exerciseName, exercise.completed && styles.completedText]}>
                      {exercise.name}
                    </Text>
                    <Text style={styles.exerciseDetails}>
                      {exercise.sets} sets × {exercise.reps} reps
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleExerciseCompletion(exercise)}
                    style={styles.checkboxContainer}
                  >
                    <Ionicons 
                      name={exercise.completed ? "checkmark-circle" : "checkmark-circle-outline"} 
                      size={24} 
                      color={exercise.completed ? "#4CAF50" : "#666"} 
                    />
                  </Pressable>
                </Pressable>
              ))}

              <View style={styles.modalButtons}>
                
                <Pressable
                  style={styles.completeButton}
                  onPress={async () => {
                    for (const exercise of selectedExercises) {
                      if (!isExerciseCompleted(exercise.id)) {
                        await handleExerciseComplete(exercise.id);
                      }
                    }
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.completeButtonText}>Fullfør</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

