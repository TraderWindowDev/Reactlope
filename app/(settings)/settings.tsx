import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/src/context/ThemeContext';

export default function SettingsScreen() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to sign out');
    }
  };

  const SettingItem = ({ icon, title, onPress }: { icon: string, title: string, onPress: () => void }) => (
    <Pressable style={styles.settingItem} onPress={onPress}>
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
      backgroundColor: isDarkMode ? '#121212' : '#f5f5f5',
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
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
      borderRadius: 12,
      overflow: 'hidden',
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#2C2C2C' : '#f0f0f0',
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
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
      borderRadius: 12,
      alignItems: 'center',
    },
    logoutText: {
      color: '#FF4B4B',
      fontSize: 16,
      fontWeight: '600',
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
              onPress={() => router.push('/change-password')}
            />
            <SettingItem 
              icon="settings-outline" 
              title="Innhold" 
              onPress={() => router.push('/content-settings')}
            />
            <SettingItem 
              icon="earth-outline" 
              title="Social" 
              onPress={() => router.push('/social')}
            />
            
            <SettingItem 
              icon="shield-outline" 
              title="Privatliv og sikkerhet" 
              onPress={() => router.push('/privacy')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifikasjoner</Text>
          <View style={styles.card}>
            <SettingItem 
              icon="notifications-outline" 
              title="Nytt for deg" 
              onPress={() => router.push('/notifications')}
            />
            <SettingItem 
              icon="fitness-outline" 
              title="Aktivitet" 
              onPress={() => router.push('/activity-notifications')}
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
    </View>
  );
} 