import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button } from '../../components/Button';
import { supabase } from '@/src/lib/supabase';
import { Card } from '../../components/Card';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

type Exercise = {
  name: string;
  description: string;
  sets: string;
  reps: string;
  duration_minutes: string;
  day_number: number;
  week_number: number;
  notes: string;
};

type WeeklySchedule = {
  [key: number]: { // week number
    [key: number]: Exercise[]; // day number
  };
};

export default function CreatePlanScreen() {
  const { userId } = useLocalSearchParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [currentDay, setCurrentDay] = useState(1);
  const [schedule, setSchedule] = useState<WeeklySchedule>({});
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<Exercise>({
    name: '',
    description: '',
    sets: '',
    reps: '',
    duration_minutes: '',
    day_number: 1,
    week_number: 1,
    notes: '',
  });

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const handleAddExercise = () => {
    const updatedSchedule = { ...schedule };
    if (!updatedSchedule[currentWeek]) {
      updatedSchedule[currentWeek] = {};
    }
    if (!updatedSchedule[currentWeek][currentDay]) {
      updatedSchedule[currentWeek][currentDay] = [];
    }

    updatedSchedule[currentWeek][currentDay].push({
      ...currentExercise,
      week_number: currentWeek,
      day_number: currentDay,
    });

    setSchedule(updatedSchedule);
    setCurrentExercise({
      name: '',
      description: '',
      sets: '',
      reps: '',
      duration_minutes: '',
      day_number: currentDay,
      week_number: currentWeek,
      notes: '',
    });
    setShowExerciseForm(false);
  };

  const handleCreatePlan = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create the training plan
      const { data: plan, error: planError } = await supabase
        .from('training_plans')
        .insert({
          coach_id: user?.id,
          title,
          description,
          difficulty: difficulty.toLowerCase(),
          duration_weeks: 4,
          start_date: startDate.toISOString()
        })
        .select()
        .single();

      if (planError) throw planError;

      // Flatten schedule into exercises array
      const exercises = Object.entries(schedule).flatMap(([weekNum, days]) =>
        Object.entries(days).flatMap(([dayNum, exs]) =>
          exs.map(ex => ({
            plan_id: plan.id,
            ...ex,
            sets: parseInt(ex.sets),
            reps: parseInt(ex.reps),
            duration_minutes: parseInt(ex.duration_minutes) || 0,
            week_number: parseInt(weekNum),
            day_number: parseInt(dayNum),
          }))
        )
      );

      if (exercises.length > 0) {
        const { error: exercisesError } = await supabase
          .from('training_plan_exercises')
          .insert(exercises);

        if (exercisesError) throw exercisesError;
      }

      // Assign the plan to the user
      const { error: assignError } = await supabase
        .from('user_training_plans')
        .insert({
          user_id: userId,
          plan_id: plan.id
        });

      if (assignError) throw assignError;

      router.back();
    } catch (error) {
      console.error('Error creating plan:', error);
      alert('Failed to create training plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Create Training Plan</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter plan title"
          placeholderTextColor="#666"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter plan description"
          placeholderTextColor="#666"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Difficulty</Text>
        <View style={styles.difficultyButtons}>
          {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
            <Button
              key={level}
              title={level.charAt(0).toUpperCase() + level.slice(1)}
              onPress={() => setDifficulty(level)}
              variant={difficulty === level ? 'primary' : 'outline'}
              size="small"
              style={styles.difficultyButton}
            />
          ))}
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Start Date</Text>
        <Button
          title={startDate.toLocaleDateString()}
          onPress={() => setShowDatePicker(true)}
          variant="outline"
        />
        {showDatePicker && Platform.OS === 'ios' && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}
      </View>

      <View style={styles.weekDaySelector}>
        <View style={styles.selectorRow}>
          <Text style={styles.label}>Week {currentWeek}</Text>
          <View style={styles.weekButtons}>
            {[1, 2, 3, 4].map((week) => (
              <Button
                key={week}
                title={week.toString()}
                onPress={() => setCurrentWeek(week)}
                variant={currentWeek === week ? 'primary' : 'outline'}
                style={styles.weekButton}
              />
            ))}
          </View>
        </View>

        <View style={styles.selectorRow}>
          <Text style={styles.label}>Day {currentDay}</Text>
          <View style={styles.dayButtons}>
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <Button
                key={day}
                title={day.toString()}
                onPress={() => setCurrentDay(day)}
                variant={currentDay === day ? 'primary' : 'outline'}
                style={styles.dayButton}
              />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.exercisesContainer}>
        <Text style={styles.label}>
          Exercises for Week {currentWeek}, Day {currentDay}
        </Text>
        {schedule[currentWeek]?.[currentDay]?.map((exercise, index) => (
          <Card key={index} style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <Text style={styles.exerciseDetails}>
              {exercise.sets} sets × {exercise.reps} reps
            </Text>
          </Card>
        ))}
        
        <Button
          title="Add Exercise"
          onPress={() => setShowExerciseForm(true)}
          variant="outline"
          style={styles.addExerciseButton}
        />
      </View>

      {showExerciseForm && (
        <View style={styles.exerciseForm}>
          <Text style={styles.subtitle}>New Exercise</Text>
          
          <TextInput
            style={styles.input}
            value={currentExercise.name}
            onChangeText={(text) => setCurrentExercise({...currentExercise, name: text})}
            placeholder="Exercise name"
            placeholderTextColor="#666"
          />
          
          <TextInput
            style={[styles.input, styles.textArea]}
            value={currentExercise.description}
            onChangeText={(text) => setCurrentExercise({...currentExercise, description: text})}
            placeholder="Exercise description"
            placeholderTextColor="#666"
            multiline
          />
          
          <View style={styles.exerciseDetails}>
            <TextInput
              style={[styles.input, styles.numberInput]}
              value={currentExercise.sets}
              onChangeText={(text) => setCurrentExercise({...currentExercise, sets: text})}
              placeholder="Sets"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />
            
            <TextInput
              style={[styles.input, styles.numberInput]}
              value={currentExercise.reps}
              onChangeText={(text) => setCurrentExercise({...currentExercise, reps: text})}
              placeholder="Reps"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />
            
            <TextInput
              style={[styles.input, styles.numberInput]}
              value={currentExercise.duration_minutes}
              onChangeText={(text) => setCurrentExercise({...currentExercise, duration_minutes: text})}
              placeholder="Duration (min)"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.exerciseDetails}>
            <TextInput
              style={[styles.input, styles.numberInput]}
              value={currentExercise.week_number.toString()}
              onChangeText={(text) => setCurrentExercise({...currentExercise, week_number: parseInt(text) || 1})}
              placeholder="Week #"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />
            
            <TextInput
              style={[styles.input, styles.numberInput]}
              value={currentExercise.day_number.toString()}
              onChangeText={(text) => setCurrentExercise({...currentExercise, day_number: parseInt(text) || 1})}
              placeholder="Day #"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />
          </View>
          
          <TextInput
            style={[styles.input, styles.textArea]}
            value={currentExercise.notes}
            onChangeText={(text) => setCurrentExercise({...currentExercise, notes: text})}
            placeholder="Additional notes"
            placeholderTextColor="#666"
            multiline
          />

          <View style={styles.exerciseFormButtons}>
            <Button
              title="Cancel"
              onPress={() => setShowExerciseForm(false)}
              variant="outline"
              style={styles.exerciseFormButton}
            />
            <Button
              title="Add Exercise"
              onPress={handleAddExercise}
              variant="primary"
              style={styles.exerciseFormButton}
            />
          </View>
        </View>
      )}

      <Button
        title={loading ? "Creating..." : "Create Plan"}
        onPress={handleCreatePlan}
        disabled={loading || !title || !description}
        style={styles.createButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  difficultyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  difficultyButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  exercisesContainer: {
    marginBottom: 20,
  },
  exerciseCard: {
    padding: 12,
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addExerciseButton: {
    marginTop: 8,
  },
  exerciseForm: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  numberInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  exerciseFormButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  exerciseFormButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  createButton: {
    marginTop: 24,
    marginBottom: 40,
  },
  weekDaySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 16,
  },
  weekButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  dayButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 16,
  },
  dayButton: {
    flex: 1,
    marginHorizontal: 4,
  },
}); 