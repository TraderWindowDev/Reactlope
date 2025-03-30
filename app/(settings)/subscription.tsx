import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Pressable } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

type Profile = {
  id: string;
  username: string;
  is_premium: boolean;

};

export default function SubscriptionScreen() {
  const { session } = useAuth();
  const { isDarkMode } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [session?.user?.id]);

  const fetchProfile = async () => {
    if (!session?.user?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, is_premium')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!profile) return;
    
    Alert.alert(
      'Avslutt Premium',
      'Er du sikker på at du vil avslutte ditt premium abonnement? Du vil miste tilgang til premium funksjoner umiddelbart.',
      [
        { text: 'Nei', style: 'cancel' },
        { 
          text: 'Ja, Avslutt', 
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              
              // Update the profile's premium status in the database
              const { error } = await supabase
                .from('profiles')
                .update({ 
                  is_premium: false,
                })
                .eq('id', profile.id);
              
              if (error) throw error;
              
              // Refresh profile data
              await fetchProfile();
              
              Alert.alert(
                'Premium avsluttet',
                'Ditt premium abonnement har blitt avsluttet.'
              );
            } catch (error) {
              console.error('Error cancelling premium:', error);
              Alert.alert('Error', 'Kunne ikke avslutte premium abonnement. Prøv igjen senere.');
            } finally {
              setCancelling(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#f5f5f5' }]}>
        <ActivityIndicator size="large" color="#0047AB" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#05101a' : '#f5f5f5' }]}>
      <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>
        Premium abonnement
      </Text>
      
      {profile?.is_premium ? (
        <View style={[styles.card, { backgroundColor: isDarkMode ? '#000b15' : '#fff', borderWidth: 0.2, borderColor: isDarkMode ? '#6A3DE8' : '#000' }]}>
          <View style={styles.subscriptionHeader}>
            <Ionicons 
              name="checkmark-circle" 
              size={24} 
              color="#4CAF50" 
            />
            <Text style={[styles.statusText, { color: "#4CAF50" }]}>
              Aktiv
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.label, { color: isDarkMode ? '#ccc' : '#666' }]}>Plan:</Text>
            <Text style={[styles.value, { color: isDarkMode ? '#fff' : '#000' }]}>
              Premium
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.label, { color: isDarkMode ? '#ccc' : '#666' }]}>Price:</Text>
            <Text style={[styles.value, { color: isDarkMode ? '#fff' : '#000' }]}>
              20000 NOK / måned
            </Text>
          </View>
          
          {/* {profile.premium_since && (
            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: isDarkMode ? '#ccc' : '#666' }]}>Started:</Text>
              <Text style={[styles.value, { color: isDarkMode ? '#fff' : '#000' }]}>
                {format(new Date(profile.premium_since), 'dd MMM yyyy')}
              </Text>
            </View>
          )} */}
          
          <Pressable
            style={[styles.cancelButton, { opacity: cancelling ? 0.7 : 1 }]}
            onPress={handleCancelSubscription}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.cancelButtonText}>Avslutt abonnement</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: isDarkMode ? '#000b15' : '#fff', borderWidth: 0.2, borderColor: isDarkMode ? '#6A3DE8' : '#000' }]}>
          <Text style={[styles.noSubscriptionText, { color: isDarkMode ? '#fff' : '#000' }]}>
            Du har ikke et aktivt premium abonnement.
          </Text>
          <Pressable
            style={styles.subscribeButton}
            onPress={() => Alert.alert('Coming Soon', 'Premium subscription options will be available soon!')}
          >
            <Text style={styles.subscribeButtonText}>Kjøp Premium</Text>
          </Pressable>
        </View>
      )}

      <View style={[styles.card, styles.featuresCard, { backgroundColor: isDarkMode ? '#000b15' : '#fff', marginTop: 20, borderWidth: 0.2, borderColor: isDarkMode ? '#6A3DE8' : '#000' }]}>
        <Text style={[styles.featuresTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
          Premium funksjoner
        </Text>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          <Text style={[styles.featureText, { color: isDarkMode ? '#fff' : '#000' }]}>
          Skreddersydde treningsplaner
          </Text>
        </View>
       
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          <Text style={[styles.featureText, { color: isDarkMode ? '#fff' : '#000' }]}>
            Raske svar fra trener
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#6a14d1',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noSubscriptionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  subscribeButton: {
    backgroundColor: '#6a14d1',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  featuresCard: {
    padding: 16,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    marginLeft: 8,
  },
});