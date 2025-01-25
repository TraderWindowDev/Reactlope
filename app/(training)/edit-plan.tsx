import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { supabase } from '@/src/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
const WEEKDAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];

type Exercise = {
  id?: number;
  name: string;
  sets: number;
  reps: number;
  duration_minutes: number;
  week_number: number;
  day_number: number;
  notes: string;
  plan_id: number;
};

export default function EditPlanScreen() {
  const { planId } = useLocalSearchParams();
  const [userName, setUserName] = useState<string>('');
  const [expandedWeek, setExpandedWeek] = useState<number | null>(1);
  const [schedule, setSchedule] = useState<Record<number, Record<number, Exercise[]>>>({});
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [exerciseDetails, setExerciseDetails] = useState({
    name: '',
    sets: '',
    reps: '',
    duration_minutes: '',
    notes: ''
  });
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedDay, setSelectedDay] = useState<number>(1);

  useEffect(() => {
    fetchPlanDetails();
    fetchUserDetails();
  }, [planId]);

  const fetchPlanDetails = async () => {
    try {
      const { data: exercises, error } = await supabase
        .from('training_plan_exercises')
        .select('*')
        .eq('plan_id', planId);

      if (error) throw error;

      // Convert exercises to schedule format
      const newSchedule: Record<number, Record<number, Exercise[]>> = {};
      exercises?.forEach((exercise: Exercise) => {
        const weekNum = exercise.week_number;
        const dayNum = exercise.day_number;
        
        if (!newSchedule[weekNum]) {
          newSchedule[weekNum] = {};
        }
        if (!newSchedule[weekNum][dayNum]) {
          newSchedule[weekNum][dayNum] = [];
        }
        newSchedule[weekNum][dayNum].push(exercise);
      });
      setSchedule(newSchedule);
    } catch (error) {
      console.error('Error fetching plan details:', error);
      alert('Failed to load plan details');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('user_training_plans')
        .select(`
          user_id,
          profiles!user_training_plans_user_id_fkey (
            username
          )
        `)
        .eq('plan_id', planId)
        .single();

      if (error) throw error;
      
      setUserName(data?.profiles?.username || 'bruker');
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const handleDayPress = (weekNumber: number, dayNumber: number) => {
    setSelectedWeek(weekNumber);
    setSelectedDay(dayNumber);
    setSelectedExercise(null);
    setExerciseDetails({
      name: '',
      sets: '',
      reps: '',
      duration_minutes: '',
      notes: ''
    });
    setModalVisible(true);
  };

  const handleExercisePress = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setExerciseDetails({
      name: exercise.name,
      sets: exercise.sets.toString(),
      reps: exercise.reps.toString(),
      duration_minutes: exercise.duration_minutes.toString(),
      notes: exercise.notes
    });
    setModalVisible(true);
  };

  const handleSaveExercise = async () => {
    try {
      if (!exerciseDetails.name || !exerciseDetails.sets || !exerciseDetails.reps) {
        alert('Please fill in exercise name, sets, and reps');
        return;
      }

      const exerciseData = {
        name: exerciseDetails.name,
        sets: parseInt(exerciseDetails.sets),
        reps: parseInt(exerciseDetails.reps),
        duration_minutes: parseInt(exerciseDetails.duration_minutes) || 0,
        notes: exerciseDetails.notes,
        plan_id: planId,
        week_number: selectedWeek,
        day_number: selectedDay
      };

      if (selectedExercise?.id) {
        // Update existing exercise
        const { error } = await supabase
          .from('training_plan_exercises')
          .update(exerciseData)
          .eq('id', selectedExercise.id);

        if (error) throw error;
      } else {
        // Create new exercise
        const { error } = await supabase
          .from('training_plan_exercises')
          .insert([exerciseData]);

        if (error) throw error;
      }

      setModalVisible(false);
      fetchPlanDetails(); // Refresh the schedule
    } catch (error) {
      console.error('Error saving exercise:', error);
      alert('Failed to save exercise');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Registrer trening</Text>
      <Text style={styles.subtitle}>Registrer treningsplanen til {userName}!</Text>

      {[1, 2, 3, 4].map((weekNumber) => (
        <Pressable
          key={weekNumber}
          style={styles.weekContainer}
          onPress={() => setExpandedWeek(expandedWeek === weekNumber ? null : weekNumber)}
        >
          <View style={styles.weekCard}>
            <View style={styles.weekHeader}>
              <Text style={styles.weekTitle}> Uke {weekNumber}</Text>
              <Ionicons 
                name={expandedWeek === weekNumber ? "chevron-up" : "chevron-down"} 
                size={24} 
                color="#000" 
              />
            </View>

            {expandedWeek === weekNumber && (
              <View style={styles.weekContent}>
                {WEEKDAYS.map((day, dayIndex) => {
                  const dayExercises = schedule[weekNumber]?.[dayIndex + 1] || [];
                  return (
                    <Pressable
                      key={day}
                      style={styles.dayRow}
                      onPress={() => handleDayPress(weekNumber, dayIndex + 1)}
                    >
                      <Text style={styles.dayText}>{day}</Text>
                      <View style={styles.exercisesContainer}>
                        {dayExercises.map((exercise) => (
                          <Pressable
                            key={exercise.id}
                            style={styles.exerciseItem}
                            onPress={() => handleExercisePress(exercise)}
                          >
                            <Text style={styles.exerciseName}>{exercise.name}</Text>
                            <Text style={styles.exerciseDetails}>
                              {exercise.sets} sets × {exercise.reps} reps
                            </Text>
                          </Pressable>
                        ))}
                        <Ionicons 
                          name="add-circle-outline" 
                          size={24} 
                          color="#000" 
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </Pressable>
      ))}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedExercise ? 'Endre trening' : 'Legg til trening'}
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>×</Text>
              </Pressable>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Trening</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Push-ups"
                value={exerciseDetails.name}
                onChangeText={(text) => setExerciseDetails({...exerciseDetails, name: text})}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Set</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 3"
                value={exerciseDetails.sets}
                onChangeText={(text) => setExerciseDetails({...exerciseDetails, sets: text})}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Rep</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 12"
                value={exerciseDetails.reps}
                onChangeText={(text) => setExerciseDetails({...exerciseDetails, reps: text})}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Varighet (minutter)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 30"
                value={exerciseDetails.duration_minutes}
                onChangeText={(text) => setExerciseDetails({...exerciseDetails, duration_minutes: text})}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Kommentar</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tilføy kommentar..."
                multiline
                numberOfLines={4}
                value={exerciseDetails.notes}
                onChangeText={(text) => setExerciseDetails({...exerciseDetails, notes: text})}
              />
            </View>

            <Button
              title={selectedExercise ? 'Oppdater trening' : 'Legg til trening'}
              onPress={handleSaveExercise}
              variant="primary"
              style={styles.saveButton}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    marginHorizontal: 16,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    marginHorizontal: 16,
  },
  weekContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  weekCard: {
    backgroundColor: '#fff',
    borderRadius: 12,

    elevation: 3,
    padding: 16,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  weekContent: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dayText: {
    width: 100,
    fontSize: 16,
    fontWeight: '500',
  },
  exercisesContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  exerciseItem: {
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '500',
  },
  exerciseDetails: {
    fontSize: 12,
    color: '#666',
  },
  addIcon: {
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 500,
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
  },
  closeButton: {
    fontSize: 24,
    fontWeight: '400',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: '#7B61FF',
  },
}); 