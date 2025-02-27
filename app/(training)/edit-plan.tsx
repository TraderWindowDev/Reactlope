import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { supabase } from '@/src/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '@/src/context/ThemeContext';
import { scheduleWorkoutReminder } from '@/src/utils/notifications';
const WEEKDAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];

type Exercise = {
  id?: number;
  name: string;
  sets: number | null;
  reps: number | null;
  duration_minutes: number;
  week_number: number;
  day_number: number;
  description: string;
  plan_id: number;
  type: 'exercise' | 'rest' | 'cardio';
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
    distance: '',
    description: '',
    type: 'exercise' as const
  });
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const { isDarkMode } = useTheme();
  const [templates, setTemplates] = useState<Exercise[]>([]);

  useEffect(() => {
    fetchPlanDetails();
    fetchUserDetails();
    fetchTemplates();
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

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('exercise_templates')
        .select('*');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
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
      distance: '',
      description: '',
      type: 'exercise'
    });
    setModalVisible(true);
  };

  const handleExercisePress = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setExerciseDetails({
      name: exercise.name,
      sets: exercise.sets?.toString() || '',
      reps: exercise.reps?.toString() || '',
      duration_minutes: exercise.duration_minutes.toString(),
      distance: exercise.distance || '',
      description: exercise.notes,
      type: exercise.type
    });
    setModalVisible(true);
  };

  const handleSaveExercise = async () => {
    try {
      if (!exerciseDetails.name) {
        alert('Please enter exercise name');
        return;
      }

      if (!exerciseDetails.duration_minutes) {
        alert('Please enter duration');
        return;
      }

      if (exerciseDetails.type === 'exercise' && (!exerciseDetails.sets || !exerciseDetails.reps)) {
        alert('Please enter sets and reps');
        return;
      }

      // Calculate speed automatically if we have both distance and duration
      let speed = null;
      if (exerciseDetails.distance && exerciseDetails.duration_minutes) {
        const distanceKm = parseFloat(exerciseDetails.distance);
        const durationHours = parseInt(exerciseDetails.duration_minutes) / 60;
        speed = (distanceKm / durationHours).toFixed(2); // Round to 2 decimal places
      }

      const exerciseData = {
        name: exerciseDetails.name,
        sets: exerciseDetails.type === 'exercise' ? parseInt(exerciseDetails.sets) : 0,
        reps: exerciseDetails.type === 'exercise' ? parseInt(exerciseDetails.reps) : 0,
        duration_minutes: parseInt(exerciseDetails.duration_minutes) || 0,
        distance: parseFloat(exerciseDetails.distance) || 0,
        speed: speed ? parseFloat(speed) : null, // Store calculated speed
        description: exerciseDetails.description,
        type: exerciseDetails.type,
        plan_id: planId,
        week_number: selectedWeek,
        day_number: selectedDay,
        start_time: new Date().toISOString() // Format: "2024-01-23T09:00:00.000Z"
      };

      let savedExercise;

      if (selectedExercise?.id) {
        const { data, error } = await supabase
          .from('training_plan_exercises')
          .update(exerciseData)
          .eq('id', selectedExercise.id)
          .select()
          .single();

        if (error) throw error;
        savedExercise = data;
      } else {
        const { data, error } = await supabase
          .from('training_plan_exercises')
          .insert([exerciseData])
          .select()
          .single();

        if (error) throw error;
        savedExercise = data;
      }

      // Schedule notification after successful save
      if (savedExercise && exerciseData.type !== 'rest') {
        try {
          await scheduleWorkoutReminder(savedExercise.id, new Date());
        } catch (notificationError) {
          console.error('Error scheduling notification:', notificationError);
        }
      }

      setModalVisible(false);
      fetchPlanDetails();
    } catch (error) {
      console.error('Error saving exercise:', error);
      alert('Failed to save exercise');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#121212' : '#f5f5f5',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 8,
      marginHorizontal: 16,
      color: isDarkMode ? '#fff' : '#000',
      marginTop: 16,
    },
    subtitle: {
      fontSize: 16,
      color: isDarkMode ? '#fff' : '#666',
      marginBottom: 24,
      marginHorizontal: 16,
    },
    weekContainer: {
      marginHorizontal: 16,
      marginBottom: 10,
    },
    weekCard: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
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
      color: isDarkMode ? '#fff' : '#000',
    },
    weekContent: {
      marginTop: 16,
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#2C2C2C' : '#eee',
    },
    dayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#2C2C2C' : '#eee',
    },
    dayText: {
      width: 100,
      fontSize: 16,
      color: isDarkMode ? '#fff' : '#000',
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
      color: isDarkMode ? '#fff' : '#000',
    },
    exerciseDetails: {
      fontSize: 12,
      color: isDarkMode ? '#fff' : '#666',
    },
    addIcon: {
      marginTop: 8,
      color: isDarkMode ? '#fff' : '#000',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
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
      backgroundColor: '#0047AB',
    },
    picker: {
      color: isDarkMode ? '#fff' : '#000',
      backgroundColor: isDarkMode ? '#2C2C2C' : '#fff',
    },
  }); 

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Rediger trening</Text>
      <Text style={styles.subtitle}>Rediger treningsplanen til {userName}!</Text>

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
                color={isDarkMode ? '#fff' : '#000'} 
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
                          color={isDarkMode ? '#999' : '#999'} 
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
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
                {selectedExercise ? 'Endre trening' : 'Legg til trening'}
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>×</Text>
              </Pressable>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#000' }]}>Type</Text>
              <Picker
                selectedValue={exerciseDetails.type}
                style={[styles.picker, { color: isDarkMode ? '#fff' : '#000' }]}
                onValueChange={(value) => setExerciseDetails({...exerciseDetails, type: value})}
              >
                <Picker.Item label="Rolig" value="rolig" />
                <Picker.Item label="Intervall" value="intervall" />
                <Picker.Item label="Hvile" value="hvile" />
                <Picker.Item label="Alternativ" value="alternativ" />
              </Picker>
            </View>

            {exerciseDetails.type === 'intervall' && (
              <>
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#000' }]}>Set</Text>
                  <TextInput
                    style={[styles.input, { color: isDarkMode ? '#fff' : '#000' }]}
                    placeholder="f.eks., 3"
                    value={exerciseDetails.sets}
                    onChangeText={(text) => setExerciseDetails({...exerciseDetails, sets: text})}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#000' }]}>Rep</Text>
                  <TextInput
                    style={[styles.input, { color: isDarkMode ? '#fff' : '#000' }]}
                    placeholder="f.eks., 12"
                    value={exerciseDetails.reps}
                    onChangeText={(text) => setExerciseDetails({...exerciseDetails, reps: text})}
                    keyboardType="numeric"
                  />
                </View>
              </>
            )}

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#000' }]}>Velg en mal (valgfritt)</Text>
              <Picker
                selectedValue=""
                onValueChange={(itemValue) => {
                  if (!itemValue) return;
                  const template = templates.find(t => t.id === Number(itemValue));
                  if (template) {
                    setExerciseDetails({
                      name: template.name,
                      sets: template.sets?.toString() || '0',
                      reps: template.reps?.toString() || '0',
                      duration_minutes: template.duration_minutes.toString(),
                      distance: template.distance || '',
                      description: template.description || '',
                      type: template.type
                    });
                  }
                }}
                style={{ color: isDarkMode ? '#fff' : '#000', backgroundColor: isDarkMode ? '#2C2C2C' : '#fff'}}
              >
                <Picker.Item label="Velg en mal..." value="" style={{ color: isDarkMode ? '#000' : '#000'}}/>
                {templates.map(template => (
                  <Picker.Item 
                    style={{ color: isDarkMode ? '#000' : '#000'}}
                    key={template.id?.toString()}
                    label={`${template.name} (${template.type})`}
                    value={template.id?.toString()}
                  />
                ))}
              </Picker>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#000' }]}>Navn</Text>
              <TextInput
                style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: isDarkMode ? '#333' : '#ddd' }]}
                placeholder="f.eks., Sprint"
                placeholderTextColor={isDarkMode ? '#666' : '#999'}
                value={exerciseDetails.name}
                onChangeText={(text) => setExerciseDetails({...exerciseDetails, name: text})}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#000' }]}>Varighet (minutter)</Text>
              <TextInput
                style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: isDarkMode ? '#333' : '#ddd' }]}
                placeholder="f.eks., 30"
                placeholderTextColor={isDarkMode ? '#666' : '#999'}
                value={exerciseDetails.duration_minutes}
                onChangeText={(text) => setExerciseDetails({...exerciseDetails, duration_minutes: text})}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#000' }]}>Distanse (km)</Text>
              <TextInput
                style={[styles.input, { color: isDarkMode ? '#fff' : '#000', borderColor: isDarkMode ? '#333' : '#ddd' }]}
                placeholder="f.eks., 5"
                placeholderTextColor={isDarkMode ? '#666' : '#999'}
                value={exerciseDetails.distance}
                onChangeText={(text) => setExerciseDetails({...exerciseDetails, distance: text})}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#000' }]}>Kommentar</Text>
              <TextInput
                style={[styles.input, styles.textArea, { color: isDarkMode ? '#fff' : '#000', borderColor: isDarkMode ? '#333' : '#ddd' }]}
                placeholder="Tilføy kommentar..."
                multiline
                placeholderTextColor={isDarkMode ? '#666' : '#999'}
                numberOfLines={4}
                value={exerciseDetails.description}
                onChangeText={(text) => setExerciseDetails({...exerciseDetails, description: text})}
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

