'use client';

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';

type Exercise = {
  id: number;
  name: string;
  description: string;
  sets: number;
  reps: number;
  duration_minutes: number;
  week_number: number;
  day_number: number;
  notes: string;
};

type RoutineProgress = {
  id: number;
  current_week: number;
  completed_exercises: number[];
  status: 'active' | 'completed';
};

export default function PlanDetailsScreen() {
  const { planId } = useLocalSearchParams();
  const [plan, setPlan] = useState<any>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [routineProgress, setRoutineProgress] = useState<RoutineProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  
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
            current_week: currentWeek,
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
            current_week: currentWeek
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

  const getExercisesForWeekDay = (week: number, day: number) => {
    return exercises.filter(ex => 
      ex.week_number === week && 
      ex.day_number === day
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const todaysExercises = getTodaysExercises();

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Text style={styles.title}>{plan.title}</Text>
        <Text style={styles.description}>{plan.description}</Text>
        <View style={styles.planMeta}>
          <Text style={styles.metaText}>Difficulty: {plan.difficulty}</Text>
          <Text style={styles.metaText}>Coach: {plan.coach?.username}</Text>
        </View>
      </Card>

      {/* Today's Exercises */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Exercises</Text>
        {todaysExercises.length > 0 ? (
          todaysExercises.map(exercise => (
            <Card key={exercise.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Button
                  title={routineProgress?.completed_exercises?.includes(exercise.id) 
                    ? "Completed ✓" 
                    : "Mark Complete"}
                  onPress={() => handleExerciseComplete(exercise.id)}
                  variant={routineProgress?.completed_exercises?.includes(exercise.id) 
                    ? "outline" 
                    : "primary"}
                  style={styles.exerciseButton}
                />
              </View>
              <Text style={styles.exerciseDescription}>{exercise.description}</Text>
              <View style={styles.exerciseDetails}>
                <Text>Sets: {exercise.sets}</Text>
                <Text>Reps: {exercise.reps}</Text>
                {exercise.duration_minutes > 0 && (
                  <Text>Duration: {exercise.duration_minutes}min</Text>
                )}
              </View>
              {exercise.notes && (
                <Text style={styles.notes}>{exercise.notes}</Text>
              )}
            </Card>
          ))
        ) : (
          <Text style={styles.emptyText}>No exercises scheduled for today</Text>
        )}
      </View>

      {/* Week Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Training Schedule</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekSelector}>
          {Array.from({ length: plan.duration_weeks }, (_, i) => i + 1).map(week => (
            <Button
              key={week}
              title={`Week ${week}`}
              onPress={() => {
                setSelectedWeek(week);
                setSelectedDay(null);
              }}
              variant={selectedWeek === week ? "primary" : "outline"}
              style={styles.weekButton}
            />
          ))}
        </ScrollView>

        {/* Day Selector */}
        {selectedWeek && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
            {Array.from({ length: 7 }, (_, i) => i + 1).map(day => (
              <Button
                key={day}
                title={`Day ${day}`}
                onPress={() => setSelectedDay(day)}
                variant={selectedDay === day ? "primary" : "outline"}
                style={styles.dayButton}
              />
            ))}
          </ScrollView>
        )}

        {/* Selected Day Exercises */}
        {selectedWeek && selectedDay && (
          <View style={styles.selectedDayExercises}>
            <Text style={styles.dayTitle}>Week {selectedWeek}, Day {selectedDay}</Text>
            {getExercisesForWeekDay(selectedWeek, selectedDay).map(exercise => (
              <Card key={exercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Button
                    title={routineProgress?.completed_exercises?.includes(exercise.id) 
                      ? "Completed ✓" 
                      : "Mark Complete"}
                    onPress={() => handleExerciseComplete(exercise.id)}
                    variant={routineProgress?.completed_exercises?.includes(exercise.id) 
                      ? "outline" 
                      : "primary"}
                    style={styles.exerciseButton}
                  />
                </View>
                <Text style={styles.exerciseDescription}>{exercise.description}</Text>
                <View style={styles.exerciseDetails}>
                  <Text>Sets: {exercise.sets}</Text>
                  <Text>Reps: {exercise.reps}</Text>
                  {exercise.duration_minutes > 0 && (
                    <Text>Duration: {exercise.duration_minutes}min</Text>
                  )}
                </View>
                {exercise.notes && (
                  <Text style={styles.notes}>{exercise.notes}</Text>
                )}
              </Card>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerCard: {
    margin: 16,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  planMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  weekSelector: {
    marginBottom: 16,
  },
  weekButton: {
    marginRight: 8,
    minWidth: 100,
  },
  daySelector: {
    marginBottom: 16,
  },
  dayButton: {
    marginRight: 8,
    minWidth: 80,
  },
  exerciseCard: {
    marginBottom: 12,
    padding: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  exerciseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  notes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  exerciseButton: {
    minWidth: 120,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 16,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
}); 