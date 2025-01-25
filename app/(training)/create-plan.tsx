import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button } from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '../../src/context/AuthContext';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type Exercise = {
  name: string;
  sets: number;
  reps: number;
  duration_minutes: number;
  week_number: number;
  day_number: number;
  notes: string;
};

export default function CreatePlanScreen() {
  const { userId } = useLocalSearchParams();
  const { session } = useAuth();
  const [expandedWeek, setExpandedWeek] = useState<number | null>(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number>(0);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [exerciseDetails, setExerciseDetails] = useState({
    name: '',
    sets: '',
    reps: '',
    duration_minutes: '',
    notes: ''
  });

  const handleDayPress = (weekNumber: number, day: string) => {
    setSelectedWeek(weekNumber);
    setSelectedDay(day);
    setModalVisible(true);
  };

  const handleSaveExercise = async () => {
    if (!exerciseDetails.name || !exerciseDetails.sets || !exerciseDetails.reps) {
      alert('Please fill in exercise name, sets, and reps');
      return;
    }

    const dayNumber = WEEKDAYS.indexOf(selectedDay) + 1;
    const newExercise: Exercise = {
      name: exerciseDetails.name,
      sets: parseInt(exerciseDetails.sets),
      reps: parseInt(exerciseDetails.reps),
      duration_minutes: parseInt(exerciseDetails.duration_minutes) || 0,
      week_number: selectedWeek,
      day_number: dayNumber,
      notes: exerciseDetails.notes
    };

    setExercises([...exercises, newExercise]);
    setModalVisible(false);
    setExerciseDetails({
      name: '',
      sets: '',
      reps: '',
      duration_minutes: '',
      notes: ''
    });
  };

  const handleSavePlan = async () => {
    if (!session?.user?.id) {
      console.error('No authenticated coach found:', session?.user);
      alert('Please log in to create a plan');
      return;
    }

    if (!userId) {
      console.error('No user selected for plan assignment');
      alert('No user selected for plan assignment');
      return;
    }

    if (exercises.length === 0) {
      alert('Please add at least one exercise to your plan');
      return;
    }

    setLoading(true);
    try {
      console.log('Creating plan with coach_id:', session.user.id);
      // Create the training plan with explicit coach_id
      const { data: plan, error: planError } = await supabase
        .from('training_plans')
        .insert({
          coach_id: session.user.id,  // Use session.user.id instead of user.id
          title: 'My Training Plan',
          description: 'Custom training plan',
          difficulty: 'beginner',
          duration_weeks: 4,
          start_date: new Date().toISOString()
        })
        .select()
        .single();

      if (planError) {
        console.error('Plan Error:', planError);
        throw planError;
      }

      // Create user_training_plans entry
      const { error: assignError } = await supabase
        .from('user_training_plans')
        .insert({
          user_id: userId,
          plan_id: plan.id,
          start_date: new Date().toISOString(),
          completed: false
        });

      if (assignError) throw assignError;

      // Add exercises
      const exercisesWithPlanId = exercises.map(exercise => ({
        ...exercise,
        plan_id: plan.id
      }));

      const { error: exercisesError } = await supabase
        .from('training_plan_exercises')
        .insert(exercisesWithPlanId);

      if (exercisesError) throw exercisesError;

      alert('Plan saved successfully!');
      router.push('/training');
    } catch (error) {
      console.error('Error saving plan:', error);
      alert('Failed to save plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getDayExercises = (weekNumber: number, day: string) => {
    const dayNumber = WEEKDAYS.indexOf(day) + 1;
    return exercises.filter(ex => 
      ex.week_number === weekNumber && 
      ex.day_number === dayNumber
    );
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Create Plan</Text>
          <Text style={styles.subtitle}>Design a 4-week training program</Text>

          {[1, 2, 3, 4].map((weekNumber) => (
            <View key={weekNumber} style={styles.weekContainer}>
              <Pressable 
                style={styles.weekHeader}
                onPress={() => setExpandedWeek(expandedWeek === weekNumber ? null : weekNumber)}
              >
                <Text style={styles.weekTitle}>Week {weekNumber}</Text>
                <Ionicons 
                  name={expandedWeek === weekNumber ? "chevron-up" : "chevron-down"} 
                  size={24} 
                  color="#000" 
                />
              </Pressable>

              {expandedWeek === weekNumber && (
                <View style={styles.daysContainer}>
                  {WEEKDAYS.map((day) => {
                    const dayExercises = getDayExercises(weekNumber, day);
                    return (
                      <Pressable
                        key={day}
                        style={styles.dayRow}
                        onPress={() => handleDayPress(weekNumber, day)}
                      >
                        <View>
                          <Text style={styles.dayText}>{day}</Text>
                          {dayExercises.length > 0 && (
                            <Text style={styles.exerciseCount}>
                              {dayExercises.length} exercise{dayExercises.length !== 1 ? 's' : ''}
                            </Text>
                          )}
                        </View>
                        <Ionicons 
                          name={dayExercises.length > 0 ? "create-outline" : "add-circle-outline"} 
                          size={24} 
                          color="#000" 
                        />
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          ))}
        </View>

        <Button
          title="Save Plan"
          variant="primary"
          style={styles.saveButton}
          onPress={handleSavePlan}
          loading={loading}
        />
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Exercise - Week {selectedWeek}, {selectedDay}</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>×</Text>
              </Pressable>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Exercise Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Push-ups"
                value={exerciseDetails.name}
                onChangeText={(text) => setExerciseDetails({...exerciseDetails, name: text})}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Sets</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 3"
                value={exerciseDetails.sets}
                onChangeText={(text) => setExerciseDetails({...exerciseDetails, sets: text})}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Reps</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 12"
                value={exerciseDetails.reps}
                onChangeText={(text) => setExerciseDetails({...exerciseDetails, reps: text})}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Duration (minutes)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 30"
                value={exerciseDetails.duration_minutes}
                onChangeText={(text) => setExerciseDetails({...exerciseDetails, duration_minutes: text})}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional notes for the exercise..."
                multiline
                numberOfLines={4}
                value={exerciseDetails.notes}
                onChangeText={(text) => setExerciseDetails({...exerciseDetails, notes: text})}
              />
            </View>

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="outline"
                style={styles.modalButton}
                onPress={() => setModalVisible(false)}
              />
              <Button
                title="Save Exercise"
                variant="primary"
                style={[styles.modalButton, styles.saveExerciseButton]}
                onPress={handleSaveExercise}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  weekContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  daysContainer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  dayText: {
    fontSize: 16,
  },
  saveButton: {
    margin: 16,
    backgroundColor: '#7B61FF',
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
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
  },
  saveExerciseButton: {
    backgroundColor: '#7B61FF',
  },
  exerciseCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
}); 