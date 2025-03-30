import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Alert, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button } from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../../src/context/ThemeContext';
import { scheduleWorkoutReminder } from '@/src/utils/notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

const WEEKDAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];

type ExerciseTemplate = {
  id: number;
  name: string;
  description: string;
  sets: number | null;
  reps: number | null;
  duration_minutes: number;
  type: 'rolig' | 'intervall' | 'hvile' | 'alternativ';
};

type ExerciseDetails = {
  name: string;
  description?: string;
  sets?: string;
  reps?: string;
  duration_minutes: string;
  type: 'rolig' | 'intervall' | 'hvile' | 'alternativ';
  distance?: string;
  week_number: number;
  day_number: number;
};

interface Exercise {
  id: number;
  name: string;
  description: string;
  sets: number;
  reps: number;
  duration_minutes: number;
  type: 'rolig' | 'intervall' | 'hvile' | 'alternativ';
  week_number: number;
  day_number: number;
  completed: boolean;
}

const defaultExerciseDetails = {
  name: '',
  description: '',
  type: 'rolig' as const,
  sets: '0',
  reps: '0',
  duration_minutes: '',
  distance: '',
  week_number: 1,
  day_number: 1
};

export default function CreatePlanScreen() {
  const { userId } = useLocalSearchParams();
  const { session } = useAuth();
  const { isDarkMode } = useTheme();
  const [planId, setPlanId] = useState<number | null>(null);
  const [planTitle, setPlanTitle] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [exercises, setExercises] = useState<any[]>([]);
  const [exerciseDetails, setExerciseDetails] = useState(defaultExerciseDetails);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calculatedSpeed, setCalculatedSpeed] = useState<string>('');
  const [templates, setTemplates] = useState<ExerciseTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from('exercise_templates')
          .select('*');

        if (error) throw error;

        console.log('Fetched templates:', data);
        setTemplates(data);
      } catch (error) {
        console.error('Error fetching templates:', error);
      }
    };

    fetchTemplates();
  }, []);

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
            setExerciseDetails(exercise);
            setModalVisible(true);
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

  const createPlan = async () => {
    try {
      const { data: plan, error: planError } = await supabase
        .from('training_plans')
        .insert({
          title: planTitle,
          description: planDescription,
          coach_id: session?.user?.id,
          start_date: startDate.toISOString(),
          duration_weeks: 4
        })
        .select()
        .single();

      if (planError) throw planError;
      setPlanId(plan.id);
      return plan.id;
    } catch (error) {
      console.error('Error creating plan:', error);
      throw error;
    }
  };

  const handleSaveExercise = () => {
    // Calculate speed if we have both distance and duration
    let speed = null;
    if (exerciseDetails.distance && exerciseDetails.duration_minutes) {
      const distanceNum = parseFloat(exerciseDetails.distance);
      const durationHours = parseInt(exerciseDetails.duration_minutes) / 60;
      speed = distanceNum / durationHours;
    }
  
    // Create the new exercise object
    const newExercise = {
      name: exerciseDetails.name.trim(),
      description: exerciseDetails.description?.trim() || '',
      sets: exerciseDetails.type === 'intervall' ? parseInt(exerciseDetails.sets || '0') : null,
      reps: exerciseDetails.type === 'intervall' ? parseInt(exerciseDetails.reps || '0') : null,
      distance: exerciseDetails.type !== 'hvile' ? parseFloat(exerciseDetails.distance || '0') : null,
      duration_minutes: parseInt(exerciseDetails.duration_minutes || '0'),
      speed: speed,
      type: exerciseDetails.type,
      week_number: selectedWeek,
      day_number: WEEKDAYS.indexOf(selectedDay) + 1,
    };
  
    // Add the new exercise to the exercises array
    setExercises(prevExercises => [...prevExercises, newExercise]);
    
    // Close the modal and reset the form
    setModalVisible(false);
    setExerciseDetails(defaultExerciseDetails);
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
      // Create the training plan with explicit coach_id
      const { data: plan, error: planError } = await supabase
        .from('training_plans')
        .insert({
          coach_id: session.user.id,
          title: planTitle,
          description: planDescription,
          difficulty: 'beginner',
          duration_weeks: 4,
          start_date: startDate.toISOString()
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
        plan_id: plan.id,
        speed: typeof exercise.speed === 'string' ? parseFloat(exercise.speed) : exercise.speed
      }));

      console.log('Saving exercises:', exercisesWithPlanId);

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
    // Filter exercises for this specific day and week
    const dayExercises = exercises.filter(
      ex => ex.week_number === week && 
      ex.day_number === WEEKDAYS.indexOf(day) + 1
    );
    
    return (
      <Pressable
        key={`${week}-${day}`}
        style={[
          styles.dayContainer,
          selectedDay === day && selectedWeek === week && styles.selectedDay
        ]}
        onPress={() => {
          setSelectedDay(day);
          setSelectedWeek(week);
          setModalVisible(true);
        }}
      >
        <View style={styles.dayRow}>
          <Text style={styles.dayText}>{day}</Text>
          <View>
            <Text style={styles.exerciseCount}>
              {dayExercises.length} øvelser
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const saveAsTemplate = async () => {
    try {
      // Use exerciseDetails instead of exerciseToTemplate
      const templateData = {
        name: exerciseDetails.name.trim(),
        description: exerciseDetails.description?.trim() || '',
        sets: exerciseDetails.type === 'rest' ? 0 : parseInt(exerciseDetails.sets) || 0,
        reps: exerciseDetails.type === 'rest' ? 0 : parseInt(exerciseDetails.reps) || 0,
        duration_minutes: parseInt(exerciseDetails.duration_minutes) || 0,
        type: exerciseDetails.type || 'exercise',
        coach_id: session?.user.id
      };


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
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('Error', 'Failed to save template');
    } finally {
      setModalVisible(false);
    }
  };

  const showDatePickerModal = () => {
    setTempDate(startDate);
    setShowDatePicker(true);
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) {
        setStartDate(selectedDate);
      }
    } else {
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleDonePress = () => {
    setStartDate(tempDate);
    setShowDatePicker(false);
  };

  const calculateSpeed = (distance: string, duration: string) => {
    const distanceNum = parseFloat(distance);
    const durationHours = parseInt(duration) / 60; // Convert minutes to hours
    
    if (distanceNum && durationHours) {
      const speed = (distanceNum / durationHours).toFixed(1);
      setCalculatedSpeed(`${speed} km/t`);
    } else {
      setCalculatedSpeed('');
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
      height: '80%',
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
      width: '100%',
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
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
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
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
      borderWidth: 1,
      borderColor: isDarkMode ? '#2C2C2C' : '#ddd',
      borderRadius: 8,

      marginBottom: 16,
      color: isDarkMode ? '#fff' : '#000',
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
    dateButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      backgroundColor: '#fff',
      borderRadius: 8,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#ddd',
    },
    dateButtonText: {
      fontSize: 16,
      color: '#000',
    },
    darkInput: {
      backgroundColor: '#2C2C2C',
      borderColor: '#444',
      color: '#fff',
    },
    darkText: {
      color: isDarkMode ? '#fff' : '#000',
    },
    speedDisplay: {
      padding: 12,
      backgroundColor: isDarkMode ? '#2C2C2E' : '#f5f5f5',
      borderRadius: 8,
      marginTop: 8,
    },
    speedText: {
      color: isDarkMode ? '#fff' : '#000',
      fontSize: 14,
      textAlign: 'center',
    },
    centeredView: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalView: {
      backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    button: {
      borderRadius: 8,
      padding: 10,
      elevation: 2,
      backgroundColor: '#0047AB',
      marginTop: 15,
      width: '100%',
    },
    textStyle: {
      color: 'white',
      fontWeight: 'bold',
      textAlign: 'center',
    },
  }); 

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Lag plan</Text>
          <Text style={styles.subtitle}>Lag en 4-ukers treningsplan</Text>

          <Pressable 
            style={[styles.dateButton, isDarkMode && styles.darkInput]}
            onPress={showDatePickerModal}
          >
            <Text style={[styles.dateButtonText, isDarkMode && styles.darkText]}>
              Startdato: {format(startDate, 'd. MMMM yyyy', { locale: nb })}
            </Text>
            <Ionicons 
              name="calendar-outline" 
              size={24} 
              color={isDarkMode ? '#fff' : '#000'} 
            />
          </Pressable>

          {showDatePicker && (
            Platform.OS === 'ios' ? (
              <Modal
                transparent={true}
                animationType="slide"
                visible={showDatePicker}
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View style={styles.centeredView}>
                  <View style={styles.modalView}>
                    <DateTimePicker
                      value={tempDate}
                      mode="date"
                      display="spinner"
                      onChange={onDateChange}
                      minimumDate={new Date()}
                      style={{ width: '100%' }}
                    />
                    <Pressable
                      style={styles.button}
                      onPress={handleDonePress}
                    >
                      <Text style={styles.textStyle}>Done</Text>
                    </Pressable>
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )
          )}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Treningsplan beskrivelse
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Hva er denne treningsplanen for?"
              value={planDescription}
              onChangeText={(text) => setPlanDescription(text)}
              placeholderTextColor={isDarkMode ? '#666' : '#666'}
              multiline
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Treningsplan navn
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Marathon 2025"
              value={planTitle}
              onChangeText={(text) => setPlanTitle(text)}
              placeholderTextColor={isDarkMode ? '#666' : '#666'}
            />
          </View>
          {[1, 2, 3, 4].map((weekNumber) => (
            <View key={weekNumber} style={styles.weekContainer}>
              <Pressable 
                style={styles.weekHeader}
                onPress={() => setExpandedWeek(expandedWeek === weekNumber ? null : weekNumber)}
              >
                <Text style={styles.weekTitle}>Uke {weekNumber}</Text>
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
          title="Lagre plan"
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
              <Text style={styles.modalTitle}>Legg til øvelse - Uke {selectedWeek}, {selectedDay}</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>×</Text>
              </Pressable>
            </View>

            <ScrollView>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Velg fra maler</Text>
                <Picker
                  selectedValue=""
                  style={styles.picker}
                  onValueChange={(templateId) => {
                    if (templateId) {
                      const template = templates.find(t => t.id === parseInt(templateId));
                      if (template) {
                        setExerciseDetails({
                          ...exerciseDetails,
                          name: template.name,
                          description: template.description,
                          type: template.type,
                          sets: template.sets?.toString() || '0',
                          reps: template.reps?.toString() || '0',
                          duration_minutes: template.duration_minutes?.toString() || '0',
                        });
                      }
                    }
                  }}
                >
                  <Picker.Item label="Velg mal..." value="" />
                  {templates.map(template => (
                    <Picker.Item 
                      key={template.id} 
                      label={template.name} 
                      value={template.id.toString()} 
                    />
                  ))}
                </Picker>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Type</Text>
                <Picker
                  selectedValue={exerciseDetails.type}
                  style={styles.picker}
                  onValueChange={(value) => {
                    setExerciseDetails({
                      ...exerciseDetails,
                      type: value,
                      // Reset fields based on type
                      sets: value === 'intervall' ? exerciseDetails.sets : '0',
                      reps: value === 'intervall' ? exerciseDetails.reps : '0',
                      distance: value === 'hvile' ? '0' : exerciseDetails.distance,
                    });
                  }}
                >
                  <Picker.Item label="Rolig" value="rolig" />
                  <Picker.Item label="Intervall" value="intervall" />
                  <Picker.Item label="Hvile" value="hvile" />
                  <Picker.Item label="Alternativ" value="alternativ" />
                </Picker>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Navn</Text>
                <TextInput
                  style={styles.input}
                  placeholder="f.eks., Sprint"
                  value={exerciseDetails.name}
                  onChangeText={(text) => setExerciseDetails({...exerciseDetails, name: text})}
                />
              </View>

              {exerciseDetails.type !== 'hvile' && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Distanse (km)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="f.eks., 5.5"
                      value={exerciseDetails.distance}
                      onChangeText={(text) => {
                        setExerciseDetails({...exerciseDetails, distance: text});
                        calculateSpeed(text, exerciseDetails.duration_minutes);
                      }}
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Varighet (minutter)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="f.eks., 30"
                      value={exerciseDetails.duration_minutes}
                      onChangeText={(text) => {
                        setExerciseDetails({...exerciseDetails, duration_minutes: text});
                        calculateSpeed(exerciseDetails.distance || '0', text);
                      }}
                      keyboardType="numeric"
                    />
                  </View>

                  {calculatedSpeed && (
                    <View style={styles.speedDisplay}>
                      <Text style={styles.speedText}>Gjennomsnittsfart: {calculatedSpeed}</Text>
                    </View>
                  )}
                </>
              )}

              {exerciseDetails.type === 'intervall' && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Set</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="f.eks., 3"
                      value={exerciseDetails.sets}
                      onChangeText={(text) => setExerciseDetails({...exerciseDetails, sets: text})}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Rep</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="f.eks., 12"
                      value={exerciseDetails.reps}
                      onChangeText={(text) => setExerciseDetails({...exerciseDetails, reps: text})}
                      keyboardType="numeric"
                    />
                  </View>
                </>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Beskrivelse (valgfritt)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Legg til beskrivelse eller notater"
                  value={exerciseDetails.description}
                  onChangeText={(text) => setExerciseDetails({...exerciseDetails, description: text})}
                  multiline
                />
              </View>

              <Button
                title="Legg til øvelse"
                onPress={handleSaveExercise}
                style={styles.saveButton}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
