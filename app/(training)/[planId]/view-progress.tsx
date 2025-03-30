import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Linking, Modal, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useTheme } from '@/src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Button } from '../../../components/Button';
import { Stack, useRouter } from 'expo-router';

type CoachComment = {
  id: string;
  comment: string;
  created_at: string;
  coach_id: string;
};

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
  description: string;
  sets: number;
  reps: number;
  duration_minutes: number;
  week_number: number;
  day_number: number;
  completed: boolean;
  completed_at: string | null;
  user_comments: UserComment[];
  coach_comments: CoachComment[];
  comments: Array<{
    id: string;
    comment: string;
    created_at: string;
    user_id: string;
    strava_link?: string;
  }>;
};

const WEEKDAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function ViewProgressScreen() {
  const { planId } = useLocalSearchParams();
  const { isDarkMode } = useTheme();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);
  const [coachComment, setCoachComment] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [selectedDayTitle, setSelectedDayTitle] = useState('');
  const [expandedWeek, setExpandedWeek] = useState<number | null>(1);
  const [userComment, setUserComment] = useState('');
  const [stravaLink, setStravaLink] = useState('');
  const [isAddingUserComment, setIsAddingUserComment] = useState(false);
  const router = useRouter();

  const fetchExercises = async () => {
    try {
      const { data: exercisesData, error } = await supabase
        .from('training_plan_exercises')
        .select('*')
        .eq('plan_id', planId)
        .order('week_number, day_number');

      if (error) throw error;
      setExercises(exercisesData);

      // Fetch user name
      const { data: userData, error: userError } = await supabase
        .from('user_training_plans')
        .select('profiles!inner(username)')
        .eq('plan_id', planId)
        .single();

      if (!userError && userData) {
        setUserName(userData.profiles.username);
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, [planId]);

  const handleSaveCoachComment = async (exerciseId: number) => {
    if (!coachComment.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: exercise, error: fetchError } = await supabase
        .from('training_plan_exercises')
        .select('coach_comments')
        .eq('id', exerciseId)
        .single();

      if (fetchError) throw fetchError;

      const newComment: CoachComment = {
        id: generateUUID(),
        comment: coachComment.trim(),
        created_at: new Date().toISOString(),
        coach_id: user.id
      };

      const updatedComments = [...(exercise?.coach_comments || []), newComment];

      const { error } = await supabase
        .from('training_plan_exercises')
        .update({ 
          coach_comments: updatedComments
        })
        .eq('id', exerciseId);

      if (error) throw error;
      
      setEditingExerciseId(null);
      setCoachComment('');
      fetchExercises();
    } catch (error) {
      console.error('Error saving coach comment:', error);
    }
  };

  const getDayStatus = (weekNumber: number, dayIndex: number) => {
    const dayExercises = exercises.filter(ex => 
      ex.week_number === weekNumber && 
      ex.day_number === dayIndex + 1
    );
    
    if (dayExercises.length === 0) return null;
    
    const completedCount = dayExercises.filter(ex => ex.completed).length;
    
    if (completedCount === dayExercises.length) {
      return 'completed';
    }
    return completedCount > 0 ? 'ongoing' : 'pending';
  };

  const handleDayPress = (weekNumber: number, dayIndex: number) => {
    const dayExercises = exercises.filter(ex => 
      ex.week_number === weekNumber && 
      ex.day_number === dayIndex + 1
    );
    
    if (dayExercises.length > 0) {
      setSelectedExercises(dayExercises);
      setSelectedDayTitle(`Uke ${weekNumber} - ${WEEKDAYS[dayIndex]}`);
      setModalVisible(true);
    }
  };

  const getCurrentWeek = () => {
    const completedWeeks = exercises.reduce((acc, ex) => {
      if (ex.completed) {
        acc.add(ex.week_number);
      }
      return acc;
    }, new Set<number>());

    return Math.max(...Array.from(completedWeeks), 1);
  };

  const getDateForWeekDay = (weekNumber: number, dayIndex: number) => {
    // Calculate the date based on week number and day index
    const startDate = new Date(); // You might want to get this from your plan data
    const dayOffset = (weekNumber - 1) * 7 + dayIndex;
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayOffset);
    return format(date, 'd. MMM');
  };

  const getDayDuration = (weekNumber: number, dayIndex: number) => {
    const dayExercises = exercises.filter(ex => 
      ex.week_number === weekNumber && 
      ex.day_number === dayIndex + 1
    );
    const totalMinutes = dayExercises.reduce((sum, ex) => sum + (ex.duration_minutes || 0), 0);
    return `${totalMinutes}min`;
  };

  const renderComments = (exercise: Exercise) => {
    // Combine all comments and sort them by date
    const allComments = [
      ...(exercise.comments || []).map(comment => ({
        ...comment,
        type: 'user'
      })),
      ...(exercise.coach_comments || []).map(comment => ({
        ...comment,
        type: 'coach'
      }))
    ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return (
      <View style={styles.commentsSection}>
        {allComments.map((comment, index) => (
          <View 
            key={comment.id || index}
            style={[
              styles.commentContainer,
              comment.type === 'coach' && styles.coachCommentContainer
            ]}
          >
            <Text style={styles.commentLabel}>
              {comment.type === 'coach' ? 'Coach kommentar:' : 'Athlete\'s Comment:'}
            </Text>
            <Text style={styles.commentText}>{comment.comment}</Text>
            {comment.type === 'user' && comment.strava_link && (
              <Pressable 
                onPress={async () => {
                  const url = comment.strava_link!;
                  // Check if the URL can be opened
                  const canOpen = await Linking.canOpenURL(url);
                  if (canOpen) {
                    await Linking.openURL(url);
                  } else {
                    Alert.alert('Error', 'Cannot open Strava link');
                  }
                }}
                style={styles.stravaLink}
              >
                <Text style={[styles.stravaLinkText, { color: '#FC4C02' }]}>Se på Strava</Text>
              </Pressable>
            )}
            <Text style={styles.commentDate}>
              {format(new Date(comment.created_at), 'PPp')}
            </Text>
          </View>
        ))}

        {/* Coach feedback button */}
        {editingExerciseId === exercise.id ? (
          <View style={styles.feedbackForm}>
            <TextInput
              style={styles.feedbackInput}
              value={coachComment}
              onChangeText={setCoachComment}
              placeholder="Din kommentar..."
              placeholderTextColor="#666"
              multiline
            />
            <View style={styles.feedbackButtons}>
              <Button
                title="Avbryt"
                textStyle={{ color: isDarkMode ? '#fff' : '#000' }}
                onPress={() => {
                  setEditingExerciseId(null);
                  setCoachComment('');
                }}
                style={{ backgroundColor: isDarkMode ? '#2C2C2C' : '#f5f5f5' }} 
              />
              <Button
                title="Lagre"
                textStyle={{ color: isDarkMode ? '#fff' : '#000' }}
                onPress={() => handleSaveCoachComment(exercise.id)}
                style={{ 
                  backgroundColor: isDarkMode ? '#2C2C2C' : '#f5f5f5', 
                  
                }} 
              />
            </View>
          </View>
        ) : (
          <Pressable
            style={styles.addFeedbackButton}
            onPress={() => setEditingExerciseId(exercise.id)}
          >
            <Text style={styles.addFeedbackText}>
              {exercise.coach_comments?.length ? 'Legg til en ny kommentar' : 'Legg til kommentar'}
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      padding: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
    },
    subtitle: {
      fontSize: 16,
      marginTop: 4,
    },
    progressSection: {
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: 8,
      backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 8,
    },
    progressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    progressText: {
      fontSize: 14,
    },
    progressBar: {
      height: 8,
      backgroundColor: '#333',
      borderRadius: 4,
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#0047AB',
      borderRadius: 4,
    },
    weekContainer: {
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: 8,
      backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5',
      overflow: 'hidden',
    },
    weekHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      height: 48,
    },
    weekHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    calendarIconContainer: {
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    weekTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    chevronContainer: {
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    daysContainer: {
      backgroundColor: 'transparent',
    },
    dayRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#333',
    },
    dayText: {
      fontSize: 16,
    },
    dayDetails: {
      fontSize: 12,
      marginTop: 2,
      color: '#666',
    },
    dayStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    completionText: {
      fontSize: 12,
    },
    statusDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      flex: 1,
      marginTop: 100,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 250, 
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: isDarkMode ? '#fff' : '#000',
    },
    exerciseList: {
      flex: 1,
    },
    exerciseItem: {
      flexDirection: 'row',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#333',
    },
    exerciseInfo: {
      flex: 1,
    },
    exerciseName: {
      fontSize: 16,
      fontWeight: '600',
      color: isDarkMode ? '#fff' : '#000',
      marginBottom: 4,
    },
    exerciseDetails: {
      fontSize: 14,
      color: isDarkMode ? '#999' : '#666',
      marginBottom: 8,
    },
    commentSection: {
      marginTop: 8,
      padding: 12,
      backgroundColor: isDarkMode ? '#2C2C2C' : '#f5f5f5',
      borderRadius: 8,
    },
    commentLabel: {
      fontSize: 12,
      color: isDarkMode ? '#999' : '#666',
      marginBottom: 4,
    },
    comment: {
      color: isDarkMode ? '#fff' : '#000',
      fontSize: 14,
    },
    stravaLink: {
      marginTop: 8,
    },
    stravaLinkText: {
      color: '#FC4C02',
      fontSize: 14,
    },
    addFeedbackButton: {
      marginTop: 12,
      padding: 12,
      backgroundColor: isDarkMode ? '#2C2C2C' : '#f5f5f5',
      borderRadius: 8,
      alignItems: 'center',
    },
    addFeedbackText: {
      color: isDarkMode ? '#fff' : '#000',
      fontSize: 14,
    },
    feedbackForm: {
      marginTop: 12,
    },
    feedbackInput: {
      borderWidth: 1,
      borderColor: isDarkMode ? '#333' : '#e0e0e0',
      borderRadius: 8,
      padding: 12,
      color: isDarkMode ? '#fff' : '#000',
      backgroundColor: isDarkMode ? '#2C2C2C' : '#f5f5f5',
      minHeight: 80,
      marginBottom: 8,
    },
    feedbackButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
      color: isDarkMode ? '#fff' : '#000',
    },
    coachCommentSection: {
      backgroundColor: isDarkMode ? '#1E3A8A' : '#E3F2FD',
    },
    commentDate: {
      fontSize: 12,
      color: isDarkMode ? '#666' : '#999',
      marginTop: 4,
      textAlign: 'right',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    commentsSection: {
      marginTop: 12,
    },
    commentContainer: {
      padding: 12,
      marginBottom: 12,
      backgroundColor: isDarkMode ? '#2C2C2C' : '#f5f5f5',
      borderRadius: 8,
    },
    coachCommentContainer: {
      backgroundColor: isDarkMode ? '#1E3A8A' : '#E3F2FD',
    },
    commentLabel: {
      fontSize: 12,
      color: isDarkMode ? '#999' : '#666',
      marginBottom: 4,
    },
    commentText: {
      color: isDarkMode ? '#fff' : '#000',
      fontSize: 14,
    },
    stravaLink: {
      marginTop: 8,
    },
    stravaLinkText: {
      color: '#FC4C02',
      fontSize: 14,
    },
  }); 
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          headerStyle: {
            backgroundColor: isDarkMode ? '#121212' : '#fff',
          },
          headerTintColor: isDarkMode ? '#fff' : '#000',
          headerTitle: 'Treningsprogram',
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ marginLeft: 8 }}>
              <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#fff' : '#000'} />
            </Pressable>
          ),
        }} 
      />
      <ScrollView style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#f5f5f5' }]}>
        <View style={[styles.header]}>
          <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>
            {userName}'s Progresjon
          </Text>
          <Text style={[styles.subtitle, { color: isDarkMode ? '#fff' : '#000' }]}>
            4-ukers program
          </Text>
        </View>

        <View style={[styles.progressSection, { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff' }]}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
            Fremgang
          </Text>
          <View style={styles.progressRow}>
            <Text style={[styles.progressText, { color: isDarkMode ? '#fff' : '#000' }]}>
              Uke {getCurrentWeek()}
            </Text>
            <Text style={[styles.progressText, { color: isDarkMode ? '#fff' : '#000' }]}>
              {exercises.filter(ex => ex.week_number === getCurrentWeek() && ex.completed).length}/
              {exercises.filter(ex => ex.week_number === getCurrentWeek()).length} fullført
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: isDarkMode ? '#333' : '#E0E0E0' }]}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(exercises.filter(ex => ex.week_number === getCurrentWeek() && ex.completed).length / 
                  exercises.filter(ex => ex.week_number === getCurrentWeek()).length) * 100}%` }
              ]} 
            />
          </View>
        </View>

        {[1, 2, 3, 4].map((weekNumber) => (
          <View key={weekNumber} style={[styles.weekContainer, { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff' }]}>
            <Pressable 
              style={styles.weekHeader}
              onPress={() => setExpandedWeek(expandedWeek === weekNumber ? null : weekNumber)}
            >
              <View style={styles.weekHeaderLeft}>
                <View style={styles.calendarIconContainer}>
                  <Ionicons name="calendar-outline" size={20} color={isDarkMode ? '#fff' : '#000'} />
                </View>
                <Text style={[styles.weekTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
                  Uke {weekNumber}
                </Text>
              </View>
              <View style={styles.chevronContainer}>
                <Ionicons 
                  name={expandedWeek === weekNumber ? "chevron-up" : "chevron-down"} 
                  size={24} 
                  color={isDarkMode ? '#fff' : '#000'} 
                />
              </View>
            </Pressable>
            
            {expandedWeek === weekNumber && (
              <View style={styles.daysContainer}>
                {WEEKDAYS.map((day, index) => {
                  const status = getDayStatus(weekNumber, index);
                  const dayExercises = exercises.filter(ex => 
                    ex.week_number === weekNumber && 
                    ex.day_number === index + 1
                  );
                  const completedExercises = dayExercises.filter(ex => ex.completed).length;
                  
                  return (
                    <Pressable
                      key={day}
                      style={[
                        styles.dayRow,
                        { borderBottomColor: isDarkMode ? '#333' : '#E0E0E0' }
                      ]}
                      onPress={() => handleDayPress(weekNumber, index)}
                      disabled={!status}
                    >
                      <View>
                        <Text style={[styles.dayText, { color: isDarkMode ? '#fff' : '#000' }]}>
                          {day}
                        </Text>
                        <Text style={[styles.dayDetails, { color: isDarkMode ? '#666' : '#666' }]}>
                          {getDateForWeekDay(weekNumber, index)} • {getDayDuration(weekNumber, index)}
                        </Text>
                      </View>
                      {status && (
                        <View style={styles.dayStatus}>
                          {status === 'completed' && (
                            <Text style={[styles.completionText, { color: '#4CAF50' }]}>
                              {completedExercises}/{dayExercises.length} fullført
                            </Text>
                          )}
                          <View style={[
                            styles.statusDot,
                            { backgroundColor: status === 'completed' ? '#4CAF50' : 
                              status === 'ongoing' ? '#FFA726' : isDarkMode ? '#444' : '#E0E0E0' }
                          ]} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedDayTitle}</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDarkMode ? '#fff' : '#000'} />
              </Pressable>
            </View>

              {selectedExercises.map((exercise) => (
                <View key={exercise.id} style={styles.exerciseItem}>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseDetails}>
                      {exercise.sets} sets × {exercise.reps} reps • {exercise.duration_minutes}min
                    </Text>
                    {renderComments(exercise)}
                  </View>
                  <View style={styles.checkboxContainer}>
                    <Ionicons
                      name={exercise.completed ? 'checkmark-circle' : 'checkmark-circle-outline'}
                      size={24}
                      color={exercise.completed ? '#4CAF50' : '#666'}
                    />
                  </View>
                </View>
              ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

