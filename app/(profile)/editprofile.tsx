//eit profile

import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { supabase } from '@/src/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/src/context/ThemeContext';
type Profile = {
    username: string;
    avatar_url: string;
    bio: string;
    followers_count: number;
    following_count: number;
    name: string;
    links: string;
}
export default function EditProfile() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const { isDarkMode } = useTheme();
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    if (!session?.user) return;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (error) console.error('Error fetching profile:', error);
    setProfile(data);
  };



  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#121212' : '#f5f5f5',
    },
    customHeader: {
      paddingTop: 60,
      paddingBottom: 16,
      width: '100%',
      backgroundColor: isDarkMode ? '#121212' : '#fff',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#2C2C2C' : '#f0f0f0',
    },
    customHeaderTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDarkMode ? '#fff' : '#333',
      marginLeft: 32,
    },
    content: {
      flex: 1,
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
    },
    avatarSection: {
      alignItems: 'center',
      paddingVertical: 24,
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
      marginBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#2C2C2C' : '#f0f0f0',
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      marginBottom: 12,
    },
    changePhotoButton: {
      padding: 8,
    },
    changePhotoText: {
      color: '#0047AB',
      fontSize: 16,
      fontWeight: '500',
    },
    section: {
      paddingHorizontal: 16,
    },
    card: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    inputContainer: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      color: isDarkMode ? '#fff' : '#333',
      marginBottom: 8,
      fontWeight: '500',
    },
    input: {
      fontSize: 16,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
      borderRadius: 8,
      borderWidth: 1,
      color: isDarkMode ? '#fff' : '#333',
      borderColor: isDarkMode ? '#2C2C2C' : '#f0f0f0',
    },
    bioInput: {
      height: 100,
      textAlignVertical: 'top',
      color: isDarkMode ? '#fff' : '#333',
    },
    saveButton: {
      backgroundColor: '#0047AB',
      marginHorizontal: 16,
      marginBottom: 32,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  
  return (
    <View style={styles.container}>
      <View style={styles.customHeader}>
        <Ionicons 
          name="arrow-back" 
          size={24} 
          color={isDarkMode ? '#fff' : '#000'} 
          onPress={() => router.navigate('/(tabs)/profile')} 
        />
        <Text style={styles.customHeaderTitle}>Edit Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.avatarSection}>
          <Image 
            source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/100' }}
            style={styles.avatar}
          />
          <Pressable style={styles.changePhotoButton}>
            <Text style={styles.changePhotoText}>Change photo</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Name</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Your name"
                placeholderTextColor="#999"
                value={profile?.name || ''}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Username</Text>
              <TextInput 
                style={styles.input} 
                placeholder="@username"
                placeholderTextColor={isDarkMode ? '#fff' : '#999'}
                value={profile?.username || ''}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Bio</Text>
              <TextInput 
                style={[styles.input, styles.bioInput]} 
                placeholder="Tell us about yourself"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                value={profile?.bio || ''}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Links</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Add your links"
                placeholderTextColor="#999"
                value={profile?.links || ''}
              />
            </View>
          </View>
        </View>

        <Pressable style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Lagre endringer</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

