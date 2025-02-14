import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { nb } from 'date-fns/locale';

const WEEKDAYS = ['M', 'Ti', 'On', 'To', 'Fr', 'Lo', 'Sø'];

export default function Profile() {
  const { isDarkMode } = useTheme();
  const { session } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [weeklyStats, setWeeklyStats] = useState({
    totalExercises: 0,
    completedExercises: 0,
    totalMinutes: 0,
  });
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchProfile(),
          fetchWeeklyStats()
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

  const fetchWeeklyStats = async () => {
    try {
      const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
      const endDate = endOfWeek(new Date(), { weekStartsOn: 1 });

      const { data: userPlans, error: plansError } = await supabase
        .from('user_training_plans')
        .select('plan_id')
        .eq('user_id', session?.user.id);

      if (plansError) throw plansError;

      if (!userPlans?.length) {
        setWeeklyStats({
          totalExercises: 0,
          completedExercises: 0,
          totalMinutes: 0,
        });
        setExercises([]);
        return;
      }

      const planIds = userPlans.map(plan => plan.plan_id);
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('training_plan_exercises')
        .select('*')
        .in('plan_id', planIds)
        .neq('type', 'rest')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (exercisesError) throw exercisesError;

      const nonRestExercises = exercisesData || [];
      setExercises(nonRestExercises);

      const stats = {
        totalExercises: nonRestExercises.length,
        completedExercises: nonRestExercises.filter(ex => ex.completed).length,
        // TODO: Only add completed exercises to total minutes
        totalMinutes: nonRestExercises.reduce((acc, ex) => acc + (ex.completed ? (ex.duration_minutes || 0) : 0), 0),
      };

      setWeeklyStats(stats);
    } catch (error) {
      console.error('Error fetching weekly stats:', error);
    }
  };
  const styles = StyleSheet.create({
    container: {
      flex: 1,
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
      backgroundColor: isDarkMode ? '#121212' : '#f5f5f5'
    },
    loadingText: {
      fontSize: 16,
      fontWeight: 'bold',
    },
  });
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={isDarkMode ? '#fff' : '#000'} />
      </View>
    );
  }
  return (
    <ScrollView style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#f5f5f5' }]}>
      
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
          <View style={[styles.statBox, { backgroundColor: isDarkMode ? '#2C2C2C' : '#fff' }]}>
            <Text style={[styles.statNumber, { color: isDarkMode ? '#fff' : '#000' }]}>
              {weeklyStats.completedExercises}/{weeklyStats.totalExercises}
            </Text>
            <Text style={[styles.statLabel, { color: isDarkMode ? '#ccc' : '#666' }]}>
              Øvelser fullført
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: isDarkMode ? '#2C2C2C' : '#fff' }]}>
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
          { backgroundColor: isDarkMode ? '#2C2C2C' : '#fff' }
        ]}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
            Aktivitet
          </Text>
          <Text style={[styles.activitySubtitle, { color: isDarkMode ? '#ccc' : '#666' }]}>
            Treningsdager
          </Text>
          <View style={styles.weekIndicator}>
            {WEEKDAYS.map((day, index) => {
              const isActiveDay = exercises?.some(ex => 
                ex.day_number === index + 1 && 
                ex.type !== 'rest'
              );
              const isCompleted = exercises?.some(ex =>
                ex.day_number === index + 1 &&
                ex.type !== 'rest' &&
                ex.completed
              );

              return (
                <View key={day} style={styles.dayWrapper}>
                  <Text style={[styles.dayLabel, { color: isDarkMode ? '#ccc' : '#666' }]}>
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
                      }
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

      {/* Progress Section */}
      <View style={styles.progressSection}>
        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
          Fremgang
        </Text>
        <Text style={[styles.progressText, { color: isDarkMode ? '#ccc' : '#666' }]}>
          {Math.round((weeklyStats.completedExercises / weeklyStats.totalExercises) * 100 || 0)}% av ukens mål nådd
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { 
                width: `${(weeklyStats.completedExercises / weeklyStats.totalExercises) * 100 || 0}%`,
                backgroundColor: '#7B61FF'
              }
            ]} 
          />
        </View>
      </View>
    </ScrollView>
  );
}
