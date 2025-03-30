import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/src/context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
// add userprofile
import { supabase } from '@/src/lib/supabase';

export default function SettingsScreen() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { signOut } = useAuth();
  const navigation = useNavigation();
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  
  // Fetch user profile to check if user is a coach
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (error) throw error;
          setUserProfile(data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    
    fetchUserProfile();
  }, []);
  
  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to sign out');
    }
  };

  const SettingItem = ({ icon, title, onPress, isLast }: { icon: string, title: string, onPress: () => void, isLast?: boolean }) => (
    <Pressable 
      style={[
        styles.settingItem, 
        !isLast && styles.settingItemWithBorder
      ]} 
      onPress={onPress}
    >
      <View style={styles.settingLeft}>
        <Ionicons name={icon as any} size={22} color={isDarkMode ? '#fff' : '#000'} />
        <Text style={styles.settingText}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#fff' : '#000'} />
    </Pressable>
  );

  const DarkModeItem = () => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Ionicons name={isDarkMode ? 'sunny-outline' : 'moon-outline'} size={22} color={isDarkMode ? '#fff' : '#666'} />
        <Text style={styles.settingText}>{isDarkMode ? 'Lys modus' : 'Mørk modus'}</Text>
      </View>
      <Switch
        value={isDarkMode}
        onValueChange={toggleDarkMode}
        trackColor={{ false: '#000', true: '#0047AB' }}
        thumbColor={isDarkMode ? '#000' : '#000'}
        ios_backgroundColor="#3e3e3e"
      />
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#05101a' : '#f5f5f5',
    },
 
    content: {
      flex: 1,
    },
    section: {
      marginTop: 24,
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: isDarkMode ? '#fff' : '#666',
      marginBottom: 8,
      marginLeft: 4,
    },
    card: {
      backgroundColor: isDarkMode ? '#000b15' : '#fff',
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 0.2,
      borderColor: '#6A3DE8',
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    
    settingItemWithBorder: {
      borderBottomWidth: 0.2,
      borderBottomColor: '#6A3DE8',
    },

    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    settingText: {
      fontSize: 16,
      marginLeft: 12,
      color: isDarkMode ? '#fff' : '#333',
    },
    logoutButton: {
      margin: 16,
      padding: 16,
      backgroundColor: isDarkMode ? '#000b15' : '#fff',
      borderRadius: 12,
      alignItems: 'center',
    },
    logoutText: {
      color: '#FF4B4B',
      fontSize: 16,
      fontWeight: '600',
    },
    footer: {
      position: 'absolute',
      bottom: 20,
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    footerText: {
      fontSize: 12,
      color: '#888',
      textAlign: 'center',
    },
    darkFooterText: {
      color: '#666',
    },
  });

  return (
    <View style={styles.container}>
      

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bruker</Text>
          <View style={styles.card}>
            <SettingItem 
              icon="person-outline" 
              title="Endre passord" 
              onPress={() => navigation.navigate('ChangePassword')}
            />
            <SettingItem 
              icon="card-outline" 
              title="Abonnement" 
              onPress={() => navigation.navigate('Subscription')}
            />

            <SettingItem 
              icon="shield-outline" 
              title="Privatliv og sikkerhet" 
              onPress={() => navigation.navigate('PrivacyPolicy')}
            />
            <SettingItem 
              icon="shield-outline" 
              title="Bruksvilkår" 
              onPress={() => navigation.navigate('TermsOfService')}
              isLast={true}
            />
          </View>
        </View>

        {/* Coach-specific settings */}
        {userProfile?.role === 'coach' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trener</Text>
            <View style={styles.card}>
              <SettingItem 
                icon="fitness-outline" 
                title="Administrer maler" 
                onPress={() => router.push('/(training)/manage-templates')}
                isLast={true}
              />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifikasjoner</Text>
          <View style={styles.card}>
            <SettingItem 
              icon="notifications-outline" 
              title="Nytt for deg" 
              onPress={() => navigation.navigate('Notifications')}
              isLast={true}
            />
            
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Utseende</Text>
          <View style={styles.card}>
            <DarkModeItem />
          </View>
        </View>
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logg ut</Text>
        </Pressable>
      </ScrollView>
      <View style={styles.footer}>
      <Text style={[styles.footerText, isDarkMode && styles.darkFooterText]}>
          Løpeprat AS • Org: 935014239 • Tlf: 41296079 • lopeprat@hotmail.com
        </Text>
      </View>
    </View>
  );
} 