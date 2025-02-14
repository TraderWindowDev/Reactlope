import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button } from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../../src/context/ThemeContext';
import { scheduleWorkoutReminder } from '@/src/utils/notifications';
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type ExerciseTemplate = {
  id: number;
  name: string;
  description: string;
  sets: number | null;
  reps: number | null;
  duration_minutes: number;
  type: 'exercise' | 'rest' | 'cardio';
};

type ExerciseDetails = {
  name: string;
  description: string;
  sets: string;
  reps: string;
  duration_minutes: string;
  type: 'exercise' | 'rest' | 'cardio';
};

interface Exercise {
  id: number;
  name: string;
  description: string;
  sets: number;
  reps: number;
  duration_minutes: number;
  type: 'exercise' | 'rest' | 'cardio';
  week_number: number;
  day_number: number;
  completed: boolean;
}

export default function CreatePlanScreen() {
  const { userId } = useLocalSearchParams();
  const { session } = useAuth();
  const {isDarkMode} = useTheme();
  const [expandedWeek, setExpandedWeek] = useState<number | null>(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number>(0);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [exerciseDetails, setExerciseDetails] = useState<ExerciseDetails>({
    name: '',
    description: '',
    sets: '',
    reps: '',
    duration_minutes: '',
    type: 'exercise'
  });
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [templates, setTemplates] = useState<ExerciseTemplate[]>([]);
  const [showTemplatePrompt, setShowTemplatePrompt] = useState(false);
  const [exerciseToTemplate, setExerciseToTemplate] = useState<{
    name: string;
    description?: string;
    sets: string;
    reps: string;
    duration_minutes: string;
    type: 'exercise' | 'rest' | 'cardio';
  } | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('exercise_templates')
        .select('*')
        .eq('coach_id', session?.user.id);

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleDayPress = (weekNumber: number, day: string) => {
    setSelectedWeek(weekNumber);
    setSelectedDay(day);
    setModalVisible(true);
  };

  const handleTemplateSelection = (templateId: number) => {
    if (!templateId) return;
    
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setExerciseDetails({
        name: template.name,
        description: template.description || '',
        sets: template.sets?.toString() || '0',
        reps: template.reps?.toString() || '0',
        duration_minutes: template.duration_minutes.toString(),
        type: template.type
      });
    }
  };

  const checkExistingTemplate = (exercise: typeof exerciseDetails) => {
    // Check for exact name match first
    const nameMatch = templates.find(t => 
      t.name.toLowerCase() === exercise.name.toLowerCase()
    );

    if (!nameMatch) {
      return false; // No matching template name, should prompt to save
    }

    // If name matches, check if all other details match
    const exactMatch = templates.find(t => 
      t.name.toLowerCase() === exercise.name.toLowerCase() &&
      t.type === exercise.type &&
      t.duration_minutes === parseInt(exercise.duration_minutes) &&
      (exercise.type === 'exercise' ? 
        (t.sets === parseInt(exercise.sets) &&
         t.reps === parseInt(exercise.reps)) :
        true)
    );

    if (exactMatch) {
      return true; // Exact match found, don't prompt to save
    }

    // Name matches but details differ
    Alert.alert(
      'Template Exists',
      'An exercise template with this name already exists but with different details. Would you like to create a new version?',
      [
        {
          text: 'No',
          style: 'cancel'
        },
        {
          text: 'Yes',
          onPress: () => {
            setExerciseToTemplate(exercise);
            setShowTemplatePrompt(true);
          }
        }
      ]
    );
    return true;
  };

  // Helper function to convert day name to number
  const dayToNumber = (day: string): number => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days.indexOf(day) + 1;
  };

  const handleSaveExercise = async () => {
    // Basic validation
    if (!exerciseDetails.name.trim()) {
      Alert.alert('Error', 'Please enter exercise name');
      return;
    }

    if (!exerciseDetails.duration_minutes) {
      Alert.alert('Error', 'Please enter duration');
      return;
    }

    // Only validate sets and reps for exercise type
    if (exerciseDetails.type === 'exercise') {
      if (!exerciseDetails.sets || !exerciseDetails.reps) {
        Alert.alert('Error', 'Please enter sets and reps');
        return;
      }
    }

    const newExercise = {
      id: Date.now(),
      name: exerciseDetails.name.trim(),
      description: exerciseDetails.description?.trim() || '',
      sets: exerciseDetails.type === 'exercise' ? parseInt(exerciseDetails.sets) : 0,
      reps: exerciseDetails.type === 'exercise' ? parseInt(exerciseDetails.reps) : 0,
      duration_minutes: parseInt(exerciseDetails.duration_minutes),
      type: exerciseDetails.type,
      week_number: selectedWeek,
      day_number: dayToNumber(selectedDay),
      completed: false,
      start_time: new Date(new Date().setHours(9, 0, 0, 0)).toISOString() // Default to 9 AM
    };

    setExercises(prevExercises => {
      const updatedExercises = [...prevExercises, newExercise];
      return updatedExercises;
    });

    // Schedule notification
    if (newExercise.type !== 'rest') {
      try {
        await scheduleWorkoutReminder(newExercise.id, new Date(newExercise.start_time));
      } catch (error) {
        console.error('Error scheduling notification:', error);
      }
    }

    // Show feedback to user
    Alert.alert(
      'Success',
      `Exercise added to Week ${selectedWeek}, ${selectedDay}`,
      [{ text: 'OK' }]
    );

    // Reset form and close modal
    setExerciseDetails({
      name: '',
      description: '',
      sets: '',
      reps: '',
      duration_minutes: '',
      type: 'exercise'
    });
    setModalVisible(false);

    // Template handling can come after the exercise is successfully added
    const existingTemplate = templates.find(t => 
      t.name.toLowerCase() === newExercise.name.toLowerCase() &&
      t.type === newExercise.type &&
      t.duration_minutes === newExercise.duration_minutes &&
      (newExercise.type === 'exercise' ? 
        (t.sets === newExercise.sets &&
         t.reps === newExercise.reps) :
        true)
    );

    if (!existingTemplate) {
      setExerciseToTemplate(exerciseDetails);
      setShowTemplatePrompt(true);
    }
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

  const getExercisesForDay = (week: number, day: string) => {
    return exercises.filter(e => 
      e.week_number === week && 
      e.day_number === dayToNumber(day)
    );
  };

  const renderDay = (day: string, week: number) => {
    const dayExercises = getExercisesForDay(week, day);
    
    return (
      <Pressable
        key={`${week}-${day}`}
        style={[
          styles.dayContainer,
          selectedWeek === week && selectedDay === day && styles.selectedDay
        ]}
        onPress={() => {
          setSelectedWeek(week);
          setSelectedDay(day);
          setModalVisible(true);
        }}
      >
        <Text style={styles.dayText}>{day}</Text>
        {dayExercises.length > 0 && (
          <Text style={styles.exerciseCount}>
            {dayExercises.length} {dayExercises.length === 1 ? 'exercise' : 'exercises'}
          </Text>
        )}
      </Pressable>
    );
  };

  const saveAsTemplate = async () => {
    try {
      // Use exerciseToTemplate instead of exerciseDetails
      const templateData = {
        name: exerciseToTemplate.name.trim(),
        description: exerciseToTemplate.description?.trim() || '',
        sets: exerciseToTemplate.type === 'rest' ? 0 : parseInt(exerciseToTemplate.sets) || 0,
        reps: exerciseToTemplate.type === 'rest' ? 0 : parseInt(exerciseToTemplate.reps) || 0,
        duration_minutes: parseInt(exerciseToTemplate.duration_minutes) || 0,
        type: exerciseToTemplate.type || 'exercise',
        coach_id: session?.user.id
      };

      console.log('Template data to save:', templateData); // For debugging

      // Validate required fields
      if (!templateData.name) {
        Alert.alert('Error', 'Template name is required');
        return;
      }

      const { data, error } = await supabase
        .from('exercise_templates')
        .insert([templateData])
        .select();

      if (error) throw error;
      
      Alert.alert('Success', 'Template saved successfully');
      console.log('Saved template:', data); // For debugging
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('Error', 'Failed to save template');
    } finally {
      setShowTemplatePrompt(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#121212' : '#f5f5f5',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#2C2C2C' : '#eee',
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      fontSize: 16,
      color: isDarkMode ? '#fff' : '#000',
    },
    content: {
      padding: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 4,
      color: isDarkMode ? '#fff' : '#000',
    },
    subtitle: {
      fontSize: 16,
      color: isDarkMode ? '#fff' : '#333',
      marginBottom: 24,
    },
    weekContainer: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
    },
    weekHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      color: isDarkMode ? '#fff' : '#000',
    },
    weekTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: isDarkMode ? '#fff' : '#000',
    },
    daysContainer: {
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#2C2C2C' : '#eee',
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
    saveButton: {
      margin: 16,
      backgroundColor: isDarkMode ? '#0047AB' : '#0047AB',
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
      color: isDarkMode ? '#fff' : '#000',
    },
    closeButton: {
      fontSize: 24,
      fontWeight: '400',
      color: isDarkMode ? '#fff' : '#000',
    },
    formGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 8,
      color: isDarkMode ? '#fff' : '#000',
    },
    input: {
      borderWidth: 1,
      borderColor: isDarkMode ? '#2C2C2C' : '#ddd',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: isDarkMode ? '#fff' : '#000',
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
      color: isDarkMode ? '#fff' : '#000',
    },
    exerciseCount: {
      fontSize: 12,
      color: isDarkMode ? '#fff' : '#666',
      marginTop: 2,
    },
    picker: {
      color: isDarkMode ? '#fff' : '#000',
      borderWidth: 1,
      borderRadius: 8,
      backgroundColor: isDarkMode ? '#2C2C2C' : '#fff',
      borderColor: isDarkMode ? '#2C2C2C' : '#ddd',
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: isDarkMode ? '#666' : '#ddd',
    },
    modalText: {
      marginBottom: 20,
    },
    dayContainer: {
      padding: 16,
      borderRadius: 8,
      marginVertical: 4,
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
      borderWidth: 1,
      borderColor: isDarkMode ? '#333' : '#eee',
    },
    selectedDay: {
      borderColor: '#0047AB',
      borderWidth: 2,
    },
    dayText: {
      fontSize: 16,
      fontWeight: '500',
      color: isDarkMode ? '#fff' : '#000',
    },
    exerciseCount: {
      fontSize: 14,
      color: isDarkMode ? '#aaa' : '#666',
      marginTop: 4,
    },
  }); 

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
                  color={isDarkMode ? '#fff' : '#000'} 
                />
              </Pressable>

              {expandedWeek === weekNumber && (
                <View style={styles.daysContainer}>
                  {WEEKDAYS.map((day) => renderDay(day, weekNumber))}
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

            <ScrollView>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Type</Text>
                <Picker
                  selectedValue={exerciseDetails.type}
                  style={styles.picker}
                  onValueChange={(value) => {
                    setExerciseDetails({
                      ...exerciseDetails,
                      type: value,
                      // Reset sets and reps if type is rest or cardio
                      sets: value === 'rest' ? '0' : exerciseDetails.sets,
                      reps: value === 'rest' ? '0' : exerciseDetails.reps,
                    });
                  }}
                >
                  <Picker.Item label="Exercise" value="exercise" />
                  <Picker.Item label="Rest" value="rest" />
                  <Picker.Item label="Cardio" value="cardio" />
                </Picker>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#000' }]}>
                  Select Template (Optional)
                </Text>
                <Picker
                  selectedValue=""
                  onValueChange={(itemValue) => handleTemplateSelection(Number(itemValue))}
                  style={{ color: isDarkMode ? '#fff' : '#000' }}
                >
                  <Picker.Item label="Select a template..." value="" />
                  {templates.map(template => (
                    <Picker.Item 
                      key={template.id.toString()}
                      label={`${template.name} (${template.type})`}
                      value={template.id.toString()}
                    />
                  ))}
                </Picker>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Navn</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., sprint eller Pause"
                  value={exerciseDetails.name}
                  onChangeText={(text) => setExerciseDetails({...exerciseDetails, name: text})}
                  placeholderTextColor={isDarkMode ? '#666' : '#666'}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Legg til beskrivelse eller notater"
                  value={exerciseDetails.description}
                  onChangeText={(text) => setExerciseDetails({...exerciseDetails, description: text})}
                  multiline
                  placeholderTextColor={isDarkMode ? '#666' : '#666'}
                />
              </View>

              {exerciseDetails.type !== 'rest' && (
                <>
                  {exerciseDetails.type === 'exercise' && (
                    <>
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Sets</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="e.g., 3"
                          value={exerciseDetails.sets}
                          onChangeText={(text) => setExerciseDetails({...exerciseDetails, sets: text})}
                          keyboardType="numeric"
                          placeholderTextColor={isDarkMode ? '#666' : '#666'}
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
                          placeholderTextColor={isDarkMode ? '#666' : '#666'}
                        />
                      </View>
                    </>
                  )}

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Duration (minutes)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., 30"
                      value={exerciseDetails.duration_minutes}
                      onChangeText={(text) => setExerciseDetails({...exerciseDetails, duration_minutes: text})}
                      keyboardType="numeric"
                      placeholderTextColor={isDarkMode ? '#666' : '#666'}
                    />
                  </View>
                </>
              )}

              <Button
                title="Legg til øvelse"
                onPress={handleSaveExercise}
                style={styles.saveButton}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showTemplatePrompt}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTemplatePrompt(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff' }]}>
            <Text style={[styles.modalTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
              Lagre som mal?
            </Text>
            <Text style={[styles.modalText, { color: isDarkMode ? '#fff' : '#000' }]}>
              Vil du lagre denne øvelsen som en mal for fremtidig bruk?
            </Text>
            <View style={styles.buttonRow}>
              <Button
                title="Nei"
                onPress={() => setShowTemplatePrompt(false)}
                style={styles.cancelButton}
                textStyle={{ color: isDarkMode ? '#fff' : '#000' }}
              />
              <Button
                title="Lag mal"
                onPress={saveAsTemplate}
                style={styles.saveButton}
                textStyle={{ color: isDarkMode ? '#fff' : '#000' }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
