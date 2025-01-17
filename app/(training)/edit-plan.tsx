import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button } from '../../components/Button';
import { supabase } from '@/src/lib/supabase';
import { Card } from '../../components/Card';

type Exercise = {
  id: number;
  name: string;
  description: string;
  sets: string;
  reps: string;
  duration_minutes: string;
  day_of_week: number;
  week_number: number;
  notes: string;
};

export default function EditPlanScreen() {
  const { planId } = useLocalSearchParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [durationWeeks, setDurationWeeks] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlanDetails();
  }, [planId]);

  const fetchPlanDetails = async () => {
    try {
      const { data: plan, error: planError } = await supabase
        .from('training_plans')
        .select(`
          *,
          training_plan_exercises (*)
        `)
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      setTitle(plan.title);
      setDescription(plan.description);
      setDifficulty(plan.difficulty);
      setDurationWeeks(plan.duration_weeks.toString());
      setExercises(plan.training_plan_exercises || []);
    } catch (error) {
      console.error('Error fetching plan details:', error);
      alert('Failed to load plan details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlan = async () => {
    try {
      setLoading(true);

      // Update training plan
      const { error: planError } = await supabase
        .from('training_plans')
        .update({
          title,
          description,
          difficulty: difficulty.toLowerCase(),
          duration_weeks: parseInt(durationWeeks)
        })
        .eq('id', planId);

      if (planError) throw planError;

      // Update exercises
      for (const exercise of exercises) {
        const { error: exerciseError } = await supabase
          .from('training_plan_exercises')
          .upsert({
            id: exercise.id,
            plan_id: planId,
            name: exercise.name,
            description: exercise.description,
            sets: parseInt(exercise.sets),
            reps: parseInt(exercise.reps),
            duration_minutes: parseInt(exercise.duration_minutes) || 0,
            day_of_week: exercise.day_of_week,
            week_number: exercise.week_number,
            notes: exercise.notes
          });

        if (exerciseError) throw exerciseError;
      }

      router.back();
    } catch (error) {
      console.error('Error updating plan:', error);
      alert('Failed to update training plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Plan Title"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Plan Description"
          multiline
        />

        <Text style={styles.label}>Difficulty</Text>
        <View style={styles.difficultyButtons}>
          {['beginner', 'intermediate', 'advanced'].map((level) => (
            <Button
              key={level}
              title={level.charAt(0).toUpperCase() + level.slice(1)}
              onPress={() => setDifficulty(level)}
              variant={difficulty === level ? 'primary' : 'outline'}
              style={styles.difficultyButton}
            />
          ))}
        </View>

        <Text style={styles.label}>Duration (weeks)</Text>
        <TextInput
          style={styles.input}
          value={durationWeeks}
          onChangeText={setDurationWeeks}
          keyboardType="numeric"
          placeholder="Duration in weeks"
        />
      </Card>

      <Button
        title={loading ? "Updating..." : "Update Plan"}
        onPress={handleUpdatePlan}
        disabled={loading}
        style={styles.updateButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  card: {
    margin: 16,
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  difficultyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  difficultyButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  updateButton: {
    margin: 16,
  },
}); 