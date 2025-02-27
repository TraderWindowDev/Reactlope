import { useState } from 'react';
import { View, Text, StyleSheet, Alert, TextInput, Pressable } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { router } from 'expo-router';
import { useTheme } from '@/src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDarkMode } = useTheme();

  const handleResetPassword = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'reactlope://reset-confirm',
      });

      if (error) throw error;
      Alert.alert(
        'Check your email',
        'We have sent you a password reset link to your email address. Please click the link to reset your password.'
      );
      router.replace('/login');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#fff' }]}>
      {/* Back Button */}
      <Pressable 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <Ionicons 
          name="arrow-back" 
          size={24} 
          color={isDarkMode ? '#fff' : '#000'} 
        />
      </Pressable>

      <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>
        Reset Password
      </Text>
      
      <Text style={[styles.subtitle, { color: isDarkMode ? '#999' : '#666' }]}>
        Enter your email address and we'll send you a link to reset your password.
      </Text>

      <TextInput
        style={[
          styles.input, 
          { 
            backgroundColor: isDarkMode ? '#333' : '#fff',
            borderColor: isDarkMode ? '#444' : '#ddd',
            color: isDarkMode ? '#fff' : '#000'
          }
        ]}
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholderTextColor={isDarkMode ? '#999' : '#666'}
      />

      <Pressable 
        style={[
          styles.button,
          { opacity: loading || !email ? 0.5 : 1 }
        ]}
        onPress={handleResetPassword}
        disabled={loading || !email}
      >
        <Text style={styles.buttonText}>
          {loading ? "Sending..." : "Send Reset Link"}
        </Text>
      </Pressable>

      <Pressable 
        style={styles.cancelButton}
        onPress={() => router.back()}
      >
        <Text style={[styles.cancelText, { color: isDarkMode ? '#fff' : '#000' }]}>
          Back to Login
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#0047AB',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 16,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});