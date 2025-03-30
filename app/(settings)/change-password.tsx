import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Modal, Pressable } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { useTheme } from '@/src/context/ThemeContext';


export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { isDarkMode } = useTheme();
  const primaryColor = '#6A3DE8'; // Purple from logo
  const secondaryColor = '#3D7BE8'; // Blue from logo

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Error changing password:', error);
        alert('Failed to change password');
      } else {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        alert('Passord oppdatert!');
      }
    } catch (error) {
      console.error('Error in handleChangePassword:', error);
    }
  };
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      justifyContent: 'center',
      backgroundColor: isDarkMode ? '#05101a' : '#f5f5f5',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 16,
      textAlign: 'center',
      color: isDarkMode ? '#fff' : '#000',
    },
    input: {
      marginVertical: 8,
      padding: 12,

      backgroundColor: isDarkMode ? '#000b15' : '#fff',
      borderRadius: 8,
      borderWidth: 0.2,
      borderColor: isDarkMode ? '#6A3DE8' : '#000',
      color: isDarkMode ? '#fff' : '#000',
    },
    button: {
      backgroundColor: isDarkMode ? '#0047AB' : '#0047AB',
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 16,
    },
    buttonText: {
      color: isDarkMode ? '#fff' : '#fff',
      fontWeight: 'bold',
    },
    disabledButton: {
      opacity: 0.7,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
      padding: 20,
      width: '80%',
      height: '20%',
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalText: {
      color: isDarkMode ? '#fff' : '#000',
    },
    closeButton: {
      marginTop: 10,
      color: isDarkMode ? '#0047AB' : '#0047AB',
    },
  });
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Endre Passord</Text>
      <TextInput
        placeholder="Gammelt Passord.."
        placeholderTextColor={isDarkMode ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)"}
        secureTextEntry
        value={currentPassword}
        onChangeText={setCurrentPassword}
        style={styles.input}
      />
      <TextInput
        placeholder="Nytt Passord.."
        placeholderTextColor={isDarkMode ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)"}
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
        style={styles.input}
      />
      <TextInput
        placeholder="Bekreft Nytt Passord.."
        placeholderTextColor={isDarkMode ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)"}
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={styles.input}
      />
      <Pressable style={[styles.button, {backgroundColor: (!currentPassword || !newPassword || !confirmPassword) ? `${primaryColor}80` : primaryColor}, (!currentPassword || !newPassword || !confirmPassword) && styles.disabledButton]} onPress={handleChangePassword}>
        <Text style={styles.buttonText}>OPPDATER PASSORD</Text>
      </Pressable>

      
    </View>
  );
}

