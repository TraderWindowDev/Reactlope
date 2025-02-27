import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, RefreshControl, ActivityIndicator, Linking, ScrollView, Pressable, Modal } from 'react-native';
import { router, useRouter } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { nb } from 'date-fns/locale';

type Profile = {
  id: string;
  username: string;
  avatar_url: string;
  role: string;
  user_training_plans: {
    plan_id: number;
    training_plans: {
      id: number;
      title: string;
    };
  }[];
  is_premium: boolean;
};

type Exercise = {
  id: number;
  week_number: number;
  day_number: number;
  type: string;
  name: string;
  distance?: number;
  pace?: string;
  completed?: boolean;
};

export default function TrainingScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribedPlans, setSubscribedPlans] = useState([]);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() || 7);
  const [selectedDayExercises, setSelectedDayExercises] = useState<Exercise[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [greeting, setGreeting] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        if (session?.user?.id) {
          await fetchProfile();
          await fetchSubscribedPlans();
        }
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!userProfile) return;
    if (userProfile.role === 'coach') {
      fetchUsers();
    } else {
      fetchUserTrainingPlans();
    }
  }, [userProfile]);

  useEffect(() => {
    if (!session) {
      router.replace('/login');
    }
  }, [session]);

  useEffect(() => {
    if (session?.user) {
      fetchSubscribedPlans();
    }
  }, [session]);

  useEffect(() => {
    if (subscribedPlans[0]?.training_plans?.id) {
      fetchExercises();
    }
  }, [subscribedPlans]);

  useEffect(() => {
    const setInitialGreeting = async () => {
      const greetingText = await fetchGreeting();
      setGreeting(greetingText);
    };
    setInitialGreeting();
  }, []);

  useEffect(() => {
    // Get today's day number (1-7, where 1 is Monday)
    const today = new Date().getDay() || 7;
    setSelectedDay(today);
    
    // If we have exercises, set the selected day's exercises
    if (exercises.length > 0) {
      const todayExercises = getExercisesForDay(today);
      setSelectedDayExercises(todayExercises);
    }
  }, [exercises]); // Depend on exercises so it updates when exercises are fetched

  //  Fetch different messages depending on time of day ('good morning if time is before 12:00', 'good afternoon if time is >12:00 and >18:00', 'good evening if time is <18:00', 'Good evening if time is >18:00')
  const fetchGreeting = async () => {
    const currentTime = new Date().getHours();
    let greeting = '';
    if (currentTime < 12) {
      greeting = 'God morgen';
    } else if (currentTime < 18) {
      greeting = 'God ettermiddag';
    } else {
      greeting = 'God kveld';
    }
    return greeting;
  };

  // Fetch profile

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      if (!session?.user.id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
      
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          avatar_url,
          role,
          is_premium,
          user_training_plans!left (
            plan_id,
            training_plans!inner (
              id,
              title,
              coach_id
            )
          )
        `)
        .eq('role', 'user');

      if (usersError) throw usersError;

      setUsers(usersData || []);

    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUserTrainingPlans = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_training_plans')
        .select(`
          plan_id,
          training_plans!plan_id (
            id,
            title,
            description,
            duration_weeks,
            coach:profiles!coach_id (username)
          )
        `)
        .eq('user_id', session?.user.id);

      if (error) throw error;
      setPlans(data?.map(item => item.training_plans) || []);
      
    } catch (error) {
      console.error('Error fetching training plans:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSubscribedPlans = async () => {
    try {
      const { data: userPlans, error: userPlansError } = await supabase
        .from('user_training_plans')
        .select(`
          *,
          training_plans (
            id,
            title,
            description,
            start_date,
            duration_weeks,
            coach:profiles!coach_id (username)
          )
        `)
        .eq('user_id', session?.user.id);

      if (userPlansError) throw userPlansError;

      const plansWithRemainingWeeks = userPlans.map(plan => {
        const remaining = calculateRemainingWeeks(plan.training_plans);
        
        return {
          ...plan,
          remainingWeeks: remaining
        };
      });

      setSubscribedPlans(plansWithRemainingWeeks);
    } catch (error) {
      console.error('Error fetching subscribed plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExercises = async () => {
    try {
      if (!subscribedPlans[0]?.training_plans?.id) return;
      const { data, error } = await supabase
        .from('training_plan_exercises')
        .select('*')
        .eq('plan_id', subscribedPlans[0].training_plans.id);

      if (error) throw error;
      setExercises(data || []);
      
    } catch (error) {
      console.error('Error fetching exercises:', error);
    }
  };

  const handleUserPress = (userId: string) => {
    router.push({
      pathname: '/(training)/create-plan',
      params: { userId }
    });
  };

  const handleEditPlan = (planId: number) => {
    router.push({
      pathname: '/(training)/edit-plan',
      params: { planId }
    });
  };

  const calculateRemainingWeeks = (plan) => {
    if (!plan?.start_date || !plan?.duration_weeks) {
      return 0;
    }
    
    const startDate = new Date(plan.start_date);
    const currentDate = new Date();
    const weeksPassed = Math.floor((currentDate - startDate) / (7 * 24 * 60 * 60 * 1000));
    const remainingWeeks = Math.max(0, plan.duration_weeks - weeksPassed);
    
    
    
    return remainingWeeks;
  };

  

  const getExercisesForDay = (dayNumber: number) => {
    if (!subscribedPlans[0]?.training_plans?.id) return [];
    
    const startDate = new Date(subscribedPlans[0].training_plans.start_date);
    const today = new Date();
    
    // Get the first day of the current week (Monday)
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    
    // Get the first day of the plan's first week
    const planWeekStart = startOfWeek(startDate, { weekStartsOn: 1 });
    
    // Calculate week number based on the difference between these dates
    const currentWeek = Math.floor(
      (currentWeekStart.getTime() - planWeekStart.getTime()) / 
      (7 * 24 * 60 * 60 * 1000)
    ) + 1;
    
  
    
    const dayExercises = exercises.filter(ex => 
      ex.week_number === currentWeek && 
      ex.day_number === dayNumber
    );


    if (dayExercises.length === 0) {
      return [{
        id: -1,
        week_number: currentWeek,
        day_number: dayNumber,
        type: 'rest',
        name: 'Hvile'
      }];
    }

    return dayExercises;
  };

  // Add this helper function to get the week's date range
  const getWeekDates = () => {
    const today = new Date();
    const monday = startOfWeek(today, { weekStartsOn: 1 });
    const sunday = endOfWeek(today, { weekStartsOn: 1 });
    
    return {
      start: format(monday, 'd. MMMM', { locale: nb }),
      end: format(sunday, 'd. MMMM', { locale: nb })
    };
  };

  // Helper function to format the time remaining or elapsed
  const formatPlanTiming = (startDate: string, durationWeeks: number) => {
    if (!startDate || !durationWeeks) return '';
    
    const start = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time part for accurate day comparison
    
    // Calculate end date (start date + duration in weeks)
    const endDate = new Date(start);
    endDate.setDate(start.getDate() + (durationWeeks * 7 - 1)); // Subtract 1 to make it inclusive
    
    // If plan hasn't started yet
    if (today < start) {
      const diffTime = start.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Starter i morgen';
      if (diffDays < 7) return `Starter om ${diffDays} dager`;
      
      const weeks = Math.floor(diffDays / 7);
      if (weeks === 1) return 'Starter om 1 uke';
      return `Starter om ${weeks} uker`;
    }
    
    // If plan has ended
    if (today > endDate) {
      return 'Fullført';
    }
    
    // If plan is in progress
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // Add 1 to include the end date
    
    if (diffDays === 1) return '1 dag igjen';
    if (diffDays < 7) return `${diffDays} dager igjen`;
    
    const weeks = Math.floor(diffDays / 7);
    const remainingDays = diffDays % 7;
    
    if (weeks === 1) {
      if (remainingDays === 0) return '1 uke igjen';
      return `1 uke og ${remainingDays} dager igjen`;
    }
    
    if (remainingDays === 0) return `${weeks} uker igjen`;
    return `${weeks} uker og ${remainingDays} dager igjen`;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#121212' : '#f5f5f5',
      padding: 16,
    },
    greeting: {
      fontSize: 18,
      marginTop: 8,
      marginBottom: 16,
      paddingBottom: 8,
    },
    date: {
      fontSize: 16,
      color: '#666',
      marginBottom: 16,
    },
    tabContainer: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    tab: {
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    activeTab: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderBottomWidth: 2,
      borderBottomColor: '#007AFF',
    },
    tabText: {
      fontSize: 16,
      color: '#666',
    },
    activeTabText: {
      color: '#007AFF',
      fontWeight: '500',
    },
    exerciseTypeCard: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
      padding: 16,
      borderRadius: 12,
      marginBottom: 24,
    },
    exerciseTypeText: {
      fontSize: 18,
      fontWeight: '500',
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 16,
    },
    sectionSubtitle: {
      fontSize: 16,
      color: '#666',
      marginBottom: 16,
    },
    planOverview: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
      padding: 16,
      borderRadius: 12,
      marginBottom: 24,
    },
    planHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    planTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    planTitle: {
      fontSize: 16,
      fontWeight: '500',
    },
    planStartDate: {
      fontSize: 14,
      color: '#666',
      marginTop: 4,
    },
    planTiming: {
      fontSize: 14,
      color: '#666',
      textAlign: 'right',
    },
    flagIcon: {
      marginRight: 8,
    },
    weekView: {
      marginTop: 16,
    },
    weekHeader: {
      marginBottom: 16,
    },
    weekTitle: {
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 4,
    },
    weekDates: {
      fontSize: 14,
      color: '#666',
    },
    daysContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    dayColumn: {
      alignItems: 'center',
      gap: 8,
    },
    dayDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#E0E0E0',
    },
    todayDot: {
      backgroundColor: '#0047AB',
      width: 10,
      height: 10,
    },
    exerciseDot: {
      backgroundColor: '#4CAF50',
    },
    selectedDot: {
      backgroundColor: '#0047AB',
      width: 10,
      height: 10,
    },
    dayText: {
      fontSize: 14,
    },
    todayText: {
      color: '#0047AB',
      fontWeight: '600',
    },
    darkText: {
      color: '#fff',
    },
    darkContainer: {
      backgroundColor: '#121212',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: '#fff',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 16,
      maxHeight: '80%',
    },
    modalContentDark: {
      backgroundColor: '#1E1E1E',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    modalScrollView: {
      marginBottom: 20,
    },
    exerciseCard: {
      marginTop: 16,
      padding: 16,
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? '#333' : '#eee',
    },
    exerciseHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    exerciseTypeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    exerciseType: {
      fontSize: 14,
      fontWeight: '500',
    },
    exerciseStatus: {
      fontSize: 14,
      color: '#666',
    },
    exerciseName: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 8,
    },
    exerciseDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    detailLabel: {
      fontSize: 14,
      color: '#666',
    },
    detailValue: {
      fontSize: 14,
      color: isDarkMode ? '#fff' : '#000',
    },
    restDot: {
      backgroundColor: '#666',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#121212' : '#f5f5f5',
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: '#666',
    },
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0047AB" />
        <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
          Laster inn treningsplan...
        </Text>
      </View>
    );
  }

  // Coach view with users list
  if (userProfile?.role === 'coach') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Button 
            title="Administrer maler"
            onPress={() => {
              router.push('/(training)/manage-templates');
            }}
            style={[styles.templateButton, { 
              backgroundColor: isDarkMode ? '#2C2C2C' : '#fff',
              marginHorizontal: 16,
              marginTop: 16,
            }]}
            textStyle={{ 
              color: isDarkMode ? '#fff' : '#000'
            }}
          />
        </View>
        {loading ? (
          <ActivityIndicator size="large" style={styles.loading} color="#0047AB"/>
        ) : (
          <FlatList
            data={users.filter(user => user.is_premium)}
            renderItem={({ item }) => (
              <Card style={styles.userCard}>
                <View style={styles.userInfo}>
                  <Image
                    source={{ uri: item.avatar_url || 'https://via.placeholder.com/40' }}
                    style={styles.avatar}
                  />
                  <Text style={styles.username}>{item.username}</Text>
                </View>
                {item.user_training_plans?.[0]?.plan_id ? (
                  <View style={styles.buttonGroup}>
                    <Button
                      title="Rediger"
                      onPress={() => handleEditPlan(item.user_training_plans[0].plan_id)}
                      style={styles.editButton} 
                    />
                  </View>
                ) : (
                  <Button
                    title="Opprett Plan"
                    onPress={() => handleUserPress(item.id)}
                    style={styles.createButton}
                  />
                )}
              </Card>
            )}
            keyExtractor={item => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={fetchUsers} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No available clients</Text>
              </View>
            }
          />
        )}
      </View>
    );
  }

  async function onSubscribe(): Promise<void> {
    //Testing purposes, set is_premium to in the database supabase
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_premium: true })
      .eq('id', session?.user.id);

    if (error) {
      console.error('Error updating profile:', error);
    } else {
      console.log('Profile updated successfully:', data);
    }
    router.reload();
  }

  // Add a helper function to check if plan has started
  const hasPlanStarted = () => {
    if (!subscribedPlans[0]?.training_plans?.start_date) return false;
    const startDate = new Date(subscribedPlans[0].training_plans.start_date);
    const today = new Date();
    return today >= startDate;
  };

  // User view with their training plan
  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <Text style={[styles.greeting, isDarkMode && styles.darkText]}>
        {greeting}, {userProfile?.username || ''} 
      </Text>
      <Text style={styles.sectionSubtitle}>under så kommer det en oversikt over treningsplanen</Text>      
      <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>Oversikt</Text>

      <Pressable 
        style={styles.planOverview}
        onPress={() => {
          if (subscribedPlans[0]?.training_plans?.id) {
            router.push({
              pathname: '/(training)/plan-details',
              params: { planId: subscribedPlans[0].training_plans.id }
            });
          }
        }}
      >
        <View style={styles.planHeader}>
          <View style={styles.planTitleContainer}>
            <Ionicons 
              name="flag" 
              size={20} 
              color={isDarkMode ? '#fff' : '#000'} 
              style={styles.flagIcon}
            />
            <Text style={[styles.planTitle, isDarkMode && styles.darkText]}>
              {subscribedPlans[0]?.training_plans?.title || 'My Training Plan'}
            </Text>
          </View>
        </View>
        <Text style={styles.planStartDate}>
          {format(new Date(subscribedPlans[0]?.training_plans?.start_date), 'EEEE d. MMMM yyyy', { locale: nb })}
        </Text>
        <Text style={styles.planTiming}>
          {formatPlanTiming(
            subscribedPlans[0]?.training_plans?.start_date,
            subscribedPlans[0]?.training_plans?.duration_weeks
          )}
        </Text>
      </Pressable>

      {hasPlanStarted() ? (
        <View style={styles.weekView}>
          <View style={styles.weekHeader}>
            <Text style={[styles.weekTitle, isDarkMode && styles.darkText]}>Denne uka</Text>
            <Text style={styles.weekDates}>
              {getWeekDates().start} - {getWeekDates().end}
            </Text>
          </View>
          <View style={styles.daysContainer}>
            {['M', 'T', 'O', 'To', 'F', 'L', 'S'].map((day, index) => {
              const dayNumber = index + 1;
              const isToday = dayNumber === (new Date().getDay() || 7);
              const hasExercise = getExercisesForDay(dayNumber).length > 0;
              
              return (
                <Pressable 
                  key={day}
                  onPress={() => {
                    setSelectedDay(dayNumber);
                    const dayExercises = getExercisesForDay(dayNumber);
                    setSelectedDayExercises(dayExercises);
                  }}
                  style={styles.dayColumn}
                >
                  <View style={[
                    styles.dayDot,
                    isToday && styles.todayDot,
                    hasExercise && (getExercisesForDay(dayNumber)[0]?.type === 'rest' 
                      ? styles.restDot 
                      : styles.exerciseDot),
                    selectedDay === dayNumber && styles.selectedDot
                  ]} />
                  <Text style={[
                    styles.dayText,
                    isDarkMode && styles.darkText,
                    isToday && styles.todayText
                  ]}>
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Exercise Card */}
          {selectedDayExercises.map(exercise => (
            <View key={exercise.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseTypeContainer}>
                  <Ionicons 
                    name={getExerciseIcon(exercise.type)} 
                    size={16} 
                    color={exercise.type === 'rest' ? '#666' : getExerciseColor(exercise.type)} 
                  />
                  <Text style={[
                    styles.exerciseType, 
                    { color: exercise.type === 'rest' ? '#666' : getExerciseColor(exercise.type) }
                  ]}>
                    {exercise.type === 'rest' ? 'Hvile' : exercise.type}
                  </Text>
                </View>
                <Text style={styles.exerciseStatus}>
                  {exercise.completed ? 'Fullført' : ''}
                </Text>
              </View>
              <Text style={[styles.exerciseName, isDarkMode && styles.darkText]}>
                {exercise.name}
              </Text>
              {exercise.type !== 'rest' && (
                <>
                  {exercise.distance && (
                    <View style={styles.exerciseDetails}>
                      <Text style={styles.detailLabel}>Distanse</Text>
                      <Text style={styles.detailValue}>{exercise.distance} km</Text>
                    </View>
                  )}
                  {exercise.pace && (
                    <View style={styles.exerciseDetails}>
                      <Text style={styles.detailLabel}>Pace</Text>
                      <Text style={styles.detailValue}>{exercise.pace}</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// Add helper function for exercise icons if not already present
const getExerciseIcon = (type: string) => {
  switch (type) {
    case 'interval':
      return 'flash-outline';
    case 'rolig':
      return 'walk-outline';
    case 'terskel':
      return 'trending-up-outline';
    case 'moderat':
      return 'speedometer-outline';
    case 'lang':
      return 'infinite-outline';
    case 'rest':
      return 'bed-outline';
    default:
      return 'fitness-outline';
  }
};

const getExerciseColor = (type: string) => {
  switch (type.toLowerCase()) {
    case 'interval':
      return '#FF4B4B';  // Red
    case 'rolig':
      return '#4CAF50';  // Green
    case 'terskel':
      return '#FF9800';  // Orange
    case 'moderat':
      return '#2196F3';  // Blue
    case 'lang':
      return '#9C27B0';  // Purple
    case 'rest':
      return '#666666';  // Gray
    default:
      return '#666666';  // Default gray
  }
};

