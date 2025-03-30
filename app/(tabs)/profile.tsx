import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { nb } from 'date-fns/locale';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;
const WEEKDAYS = ['M', 'Ti', 'On', 'To', 'Fr', 'Lo', 'Sø'];

export default function Profile() {
  const { isDarkMode } = useTheme();
  const { session } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [weeklyStats, setWeeklyStats] = useState({
    totalExercises: 0,
    completedExercises: 0,
    totalMinutes: 0,
    totalDistance: 0,
  });
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityData, setActivityData] = useState({
    labels: WEEKDAYS,
    datasets: [
      {
        data: [0, 0, 0, 0, 0, 0, 0],
        color: (opacity = 1) => `rgba(123, 97, 255, ${opacity})`,
        strokeWidth: 2
      }
    ]
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchProfile(),
          fetchWeeklyStats(),
          fetchActivityData()
        ]);
      } catch (error) {
        console.error('Error loading profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session?.user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchActivityData = async () => {
    try {
      // Get the current week's start and end dates
      const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
      const endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
      
      // First get the user's training plans
      const { data: userPlans, error: plansError } = await supabase
        .from('user_training_plans')
        .select('plan_id')
        .eq('user_id', session?.user.id);

      if (plansError || !userPlans?.length) {
        console.log('No plans found or error:', plansError);
        return;
      }

      const planIds = userPlans.map(plan => plan.plan_id);
      
      // Get exercises for the current week
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('training_plan_exercises')
        .select('*')
        .in('plan_id', planIds)
        .neq('type', 'rest');

      if (exercisesError || !exercisesData) {
        console.log('No exercises found or error:', exercisesError);
        return;
      }

      console.log('Found exercises:', exercisesData.length);

      // Prepare data for the chart - use distance if available, otherwise duration
      const dailyData = [0, 0, 0, 0, 0, 0, 0]; // One for each day of the week
      
      exercisesData.forEach(exercise => {
        if (exercise.day_number >= 1 && exercise.day_number <= 7) {
          // Add distance or duration to the corresponding day
          const dayIndex = exercise.day_number - 1;
          if (exercise.distance) {
            dailyData[dayIndex] += parseFloat(exercise.distance) || 0;
          } else if (exercise.duration_minutes) {
            // If no distance, use duration as a fallback
            dailyData[dayIndex] += exercise.duration_minutes / 10; // Scale down to make it visible
          }
        }
      });
      
      console.log('Chart data:', dailyData);
      
      setActivityData({
        labels: WEEKDAYS,
        datasets: [
          {
            data: dailyData,
            color: (opacity = 1) => isDarkMode 
              ? `rgba(123, 97, 255, ${opacity})` 
              : `rgba(123, 97, 255, ${opacity})`,
            strokeWidth: 2
          }
        ]
      });
      
    } catch (error) {
      console.error('Error fetching activity data:', error);
    }
  };

  const fetchWeeklyStats = async () => {
    try {
      // Get the current week's start and end dates
      const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
      const endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
      
      console.log('Fetching stats for week:', startDate.toISOString(), 'to', endDate.toISOString());

      // First get the user's training plans
      const { data: userPlans, error: plansError } = await supabase
        .from('user_training_plans')
        .select('plan_id')
        .eq('user_id', session?.user.id);

      if (plansError) {
        console.error('Error fetching user plans:', plansError);
        throw plansError;
      }

      if (!userPlans?.length) {
        console.log('No training plans found for user');
        setWeeklyStats({
          totalExercises: 0,
          completedExercises: 0,
          totalMinutes: 0,
          totalDistance: 0,
        });
        setExercises([]);
        return;
      }

      const planIds = userPlans.map(plan => plan.plan_id);
      console.log('User has plans:', planIds);
      
      // Get exercises for the current week
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('training_plan_exercises')
        .select('*')
        .in('plan_id', planIds)
        .neq('type', 'rest');

      if (exercisesError) {
        console.error('Error fetching exercises:', exercisesError);
        throw exercisesError;
      }

      // Filter exercises for the current week based on day_number
      const currentWeekExercises = exercisesData?.filter(exercise => {
        // Include all exercises for the current week
        return exercise.day_number >= 1 && exercise.day_number <= 7;
      }) || [];
      
      console.log('Current week exercises:', currentWeekExercises.length);
      
      setExercises(currentWeekExercises);

      // Calculate total distance (assuming there's a distance field)
      const totalDistance = currentWeekExercises.reduce((acc, ex) => 
        acc + (ex.completed && ex.distance ? parseFloat(ex.distance) : 0), 0);

      const stats = {
        totalExercises: currentWeekExercises.length,
        completedExercises: currentWeekExercises.filter(ex => ex.completed).length,
        totalMinutes: currentWeekExercises.reduce((acc, ex) => 
          acc + (ex.completed ? (ex.duration_minutes || 0) : 0), 0),
        totalDistance: totalDistance,
      };

      console.log('Weekly stats:', stats);
      setWeeklyStats(stats);
    } catch (error) {
      console.error('Error fetching weekly stats:', error);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#05101a' : '#f5f5f5'
    },
    header: {
      alignItems: 'center',
      padding: 20,
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      marginBottom: 10,
    },
    name: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    level: {
      fontSize: 16,
      marginBottom: 20,
    },
    statsContainer: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 15,
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },
    statBox: {
      flex: 1,
      padding: 15,
      borderRadius: 12,
      borderWidth: 0.2,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    statNumber: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    statLabel: {
      fontSize: 14,
    },
    progressSection: {
      padding: 20,
    },
    progressText: {
      fontSize: 16,
      marginBottom: 10,
    },
    progressBar: {
      height: 8,
      backgroundColor: '#E0E0E0',
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    activityContainer: {
      marginTop: 20,
      padding: 20,
      borderWidth: 0.2,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    activitySubtitle: {
      fontSize: 16,
      marginBottom: 15,
    },
    weekIndicator: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: 10,
    },
    dayWrapper: {
      alignItems: 'center',
      gap: 8,
    },
    dayLabel: {
      fontSize: 14,
      fontWeight: '500',
    },
    dayIndicator: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      backgroundColor: 'transparent',
    },
    activityText: {
      fontSize: 14,
      marginTop: 15,
      textAlign: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#05101a' : '#f5f5f5'
    },
    loadingText: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    todayText: {
      fontWeight: 'bold',
    },
    todayIndicator: {
      borderColor: '#7B61FF',
    },
    chartContainer: {
      padding: 20,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    chartCard: {
      padding: 20,
      margin:20,
      borderWidth: 0.2,
      borderColor: '#6A3DE8',
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  });
  
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDarkMode ? '#05101a' : '#f5f5f5' }]}>
        <ActivityIndicator size="large" color={isDarkMode ? '#fff' : '#000'} />
        <Text style={[styles.loadingText, { color: isDarkMode ? '#fff' : '#000' }]}>
          Laster profil...
        </Text>
      </View>
    );
  }
  return (
    <ScrollView style={[styles.container, { backgroundColor: isDarkMode ? '#05101a' : '#f5f5f5' }]}>
      
      {/* Profile Header */}
      <View style={styles.header}>
        <Image
          source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/100' }}
          style={styles.avatar}
        />
        <Text style={[styles.name, { color: isDarkMode ? '#fff' : '#000' }]}>
          {profile?.full_name || 'Athlete'}
        </Text>
        <Text style={[styles.level, { color: isDarkMode ? '#ccc' : '#666' }]}>
          {profile?.level || 'Beginner'}
        </Text>
      </View>

      {/* Weekly Statistics */}
      <View style={styles.statsContainer}>
        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
          Statistikk denne uken
        </Text>
        
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: isDarkMode ? '#000b15' : '#fff', borderColor: isDarkMode ? '#6A3DE8' : '#000'}]}>
            <Text style={[styles.statNumber, { color: isDarkMode ? '#fff' : '#000' }]}>
              {weeklyStats.completedExercises}/{weeklyStats.totalExercises}
            </Text>
            <Text style={[styles.statLabel, { color: isDarkMode ? '#ccc' : '#666' }]}>
              Øvelser fullført
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: isDarkMode ? '#000b15' : '#fff', borderColor: isDarkMode ? '#6A3DE8' : '#000'}]}>
            <Text style={[styles.statNumber, { color: isDarkMode ? '#fff' : '#000' }]}>
              {weeklyStats.totalMinutes}
            </Text>
            <Text style={[styles.statLabel, { color: isDarkMode ? '#ccc' : '#666' }]}>
              Minutter trent
            </Text>
          </View>
        </View>
        <View style={[
          styles.activityContainer,
          { backgroundColor: isDarkMode ? '#000b15' : '#fff', borderColor: isDarkMode ? '#6A3DE8' : '#000' }
        ]}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
            Aktivitet
          </Text>
          <Text style={[styles.activitySubtitle, { color: isDarkMode ? '#ccc' : '#666' }]}>
            Treningsdager
          </Text>
          <View style={styles.weekIndicator}>
            {WEEKDAYS.map((day, index) => {
              const dayNumber = index + 1;
              const isToday = new Date().getDay() === (dayNumber === 7 ? 0 : dayNumber);
              const isActiveDay = exercises?.some(ex => 
                ex.day_number === dayNumber && 
                ex.type !== 'rest'
              );
              const isCompleted = exercises?.some(ex =>
                ex.day_number === dayNumber &&
                ex.type !== 'rest' &&
                ex.completed
              );

              return (
                <View key={day} style={styles.dayWrapper}>
                  <Text style={[
                    styles.dayLabel, 
                    { color: isDarkMode ? '#ccc' : '#666' },
                    isToday && styles.todayText
                  ]}>
                    {day}
                  </Text>
                  <View 
                    style={[
                      styles.dayIndicator,
                      {
                        backgroundColor: isCompleted 
                          ? '#4CAF50' 
                          : isActiveDay 
                            ? isDarkMode ? '#404040' : '#E0E0E0'
                            : 'transparent',
                        borderColor: isDarkMode ? '#404040' : '#E0E0E0',
                      },
                      isToday && styles.todayIndicator
                    ]}
                  />
                </View>
              );
            })}
          </View>
          <Text style={[styles.activityText, { color: isDarkMode ? '#ccc' : '#666' }]}>
            {weeklyStats.completedExercises} av {weeklyStats.totalExercises} økter denne uken
          </Text>
        </View>
      </View>

    

      {/* Activity Chart */}
      <View style={[
        styles.chartCard,
        { backgroundColor: isDarkMode ? '#000b15' : '#fff', marginTop: 16 }
      ]}>
        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
          Denne uken
        </Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: isDarkMode ? '#ccc' : '#666' }]}>
              Distanse
            </Text>
            <Text style={[styles.statValue, { color: isDarkMode ? '#fff' : '#000' }]}>
              {weeklyStats.totalDistance.toFixed(2)} km
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: isDarkMode ? '#ccc' : '#666' }]}>
              Tid
            </Text>
            <Text style={[styles.statValue, { color: isDarkMode ? '#fff' : '#000' }]}>
              {Math.floor(weeklyStats.totalMinutes / 60)}t {weeklyStats.totalMinutes % 60}m
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: isDarkMode ? '#ccc' : '#666' }]}>
              Økter
            </Text>
            <Text style={[styles.statValue, { color: isDarkMode ? '#fff' : '#000' }]}>
              {weeklyStats.completedExercises}
            </Text>
          </View>
        </View>
        
        <LineChart
          data={activityData}
          width={screenWidth - 100}
          height={180}
          chartConfig={{
            backgroundColor: isDarkMode ? '#000b15' : '#fff',
            backgroundGradientFrom: isDarkMode ? '#000b15' : '#fff',
            backgroundGradientTo: isDarkMode ? '#000b15' : '#fff',
            decimalPlaces: 0,
            color: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
            labelColor: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#7B61FF',
            },
            propsForBackgroundLines: {
              strokeDasharray: '5, 5',
            },
          }}
        />
      </View>

        
    </ScrollView>
  );
}
