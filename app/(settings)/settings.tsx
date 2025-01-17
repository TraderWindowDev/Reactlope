import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button } from '../../components/Button';
import { useAuth } from '@/src/context/AuthContext';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
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

  return (
    <View style={styles.container}>
        <View style={styles.header}>
            <Ionicons name="arrow-back-outline" size={24} color="black" onPress={() => router.replace('/(tabs)/profile')} />
            <Text style={styles.headerTitle}>Settings</Text>
        </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        <Button
          title="Edit Profile"
          onPress={() => router.push('/edit-profile')}
          variant="outline"
          style={styles.button}
        />
        <Button
          title="Privacy"
          onPress={() => router.push('/privacy')}
          variant="outline"
          style={styles.button}
        />
        <Button
          title="Notifications"
          onPress={() => router.push('/notifications')}
          variant="outline"
          style={styles.button}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <Button
          title="Help Center"
          onPress={() => router.push('/help')}
          variant="outline"
          style={styles.button}
        />
        <Button
          title="Contact Us"
          onPress={() => router.push('/contact')}
          variant="outline"
          style={styles.button}
        />
      </View>

      <View style={styles.section}>
        <Button
          title="Log Out"
          onPress={handleLogout}
          variant="danger"
          style={styles.logoutButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    alignSelf: 'center',
    marginLeft: 10,
  },
  section: {
    padding: 16,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#666',
  },
  button: {
    marginBottom: 8,
  },
  logoutButton: {
    backgroundColor: '#FF4B4B',
  },
}); 