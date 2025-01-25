import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';

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
  };

export default function TrainingScreen() {
  const { session } = useAuth();
  const { isDarkMode } = useTheme();
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [session]);

  useEffect(() => {
    if (!userProfile) return;
    if (userProfile.role === 'coach') {
      fetchUsers();
    } else {
      fetchUserTrainingPlans();
    }
  }, [userProfile]);

  const fetchProfile = async () => {
    try {
      if (!session?.user.id){
        console.log('No user id');
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

      console.log('Users data:', JSON.stringify(usersData, null, 2));
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
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#121212' : '#f5f5f5',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      margin: 16,
      color: isDarkMode ? '#fff' : '#000',
    },
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    userCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
      alignItems: 'center',
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 8,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    username: {
      fontSize: 16,
      fontWeight: '600',
      color: isDarkMode ? '#fff' : '#000',
    },
    planCard: {
      margin: 16,
      padding: 16,
    },
    planTitle: {
      fontSize: 18,
      color: isDarkMode ? '#fff' : '#000',
      fontWeight: 'bold',
      marginBottom: 8,
    },
    planDescription: {
      fontSize: 14,
      color: isDarkMode ? '#fff' : '#000',
      marginBottom: 12,
    },
    planMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    planInfo: {
      fontSize: 14,
      color: isDarkMode ? '#fff' : '#000',
    },
    coachName: {
      fontSize: 14,
      color: isDarkMode ? '#fff' : '#000',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginTop: 16,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyDescription: {
      fontSize: 16,
      color: '#fff',
      textAlign: 'center',
      lineHeight: 24,
    },
    emptyText: {
      fontSize: 16,
      color: '#fff',
      textAlign: 'center',
    },
    
    editButton: {
      flex: 1,
      marginRight: 8,
      backgroundColor: isDarkMode ? '#0047AB' : '#0047AB',
    },
    viewButton: {
      flex: 1,
      marginTop: 20,
      marginRight: 8,

      backgroundColor: isDarkMode ? '#0047AB' : '#0047AB',
    },

  });
  // Coach view with users list
  if (userProfile?.role === 'coach') {
    return (
      <View style={styles.container}>
       
        {loading ? (
          <ActivityIndicator size="large" style={styles.loading} color="#0047AB"/>
        ) : (
          <FlatList
            data={users}
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
                    variant="primary"
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

  // User view with their training plan
  return (
    <View style={styles.container}>
  
      {loading ? (
        <ActivityIndicator size="large" style={styles.loading} />
      ) : plans.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="fitness-outline" size={64} color="#666" />
          <Text style={styles.emptyTitle}>No Training Plan Yet</Text>
          <Text style={styles.emptyDescription}>
            Our coaches are working on your personalized training regimen. 
            You'll be notified when it's ready!
          </Text>
        </View>
      ) : (
        <FlatList
          data={plans}
          renderItem={({ item }) => (
            <Card 
              style={styles.planCard}
              onPress={() => router.push({
                pathname: '/(training)/plan-details',
                params: { planId: item.id }
              })}
            >
              <Text style={styles.planTitle}>Min treningsplan</Text>
              <Text style={styles.planDescription}>{item.description}</Text>
              <View style={styles.planMeta}>
                
                <Text style={styles.planInfo}>
                  {item.duration_weeks} uker
                </Text>
              </View>
              <Text style={styles.coachName}>
                Coach: {item.coach?.username || 'Unknown'}
              </Text>
              <Button
                title="Se detaljer"
                onPress={() => router.push({
                  pathname: '/(training)/plan-details',
                  params: { planId: item.id }
                })}

                style={styles.viewButton}
              />
            </Card>
          )}
          keyExtractor={item => item.id.toString()}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={fetchUserTrainingPlans} 
            />
          }
        />
      )}
    </View>
  );
}

