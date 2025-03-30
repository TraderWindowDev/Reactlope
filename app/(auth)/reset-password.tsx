import { useState } from 'react';
import { View, Text, StyleSheet, Alert, TextInput, Pressable, Image, ActivityIndicator } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { router } from 'expo-router';
import { useTheme } from '@/src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDarkMode } = useTheme();

  // Logo colors
  const primaryColor = '#6A3DE8'; // Purple from logo
  const secondaryColor = '#3D7BE8'; // Blue from logo

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

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
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#000b15' : '#fff' }]}>
      {/* Background Logo */}
      <Image 
        source={require('../../assets/images/LP2.png')} 
        style={styles.backgroundLogo}
        resizeMode="contain"
        opacity={0.1} // Very subtle in the background
      />
      
      {/* Main Content */}
      <View style={styles.contentContainer}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/LP2.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>
          Reset Password
        </Text>
        
        <Text style={[styles.subtitle, { color: isDarkMode ? '#ccc' : '#666' }]}>
          Enter your email address and we'll send you a link to reset your password.
        </Text>
        
        {/* Email input with gradient border */}
        <View style={styles.inputContainer}>
          <LinearGradient
            colors={['#c82090', '#6a14d1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientBorder}
          >
            <View style={[
              styles.inputInner,
              { backgroundColor: isDarkMode ? '#000b15' : '#F8F9FA' }
            ]}>
              <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={[
                  styles.input,
                  { color: isDarkMode ? '#fff' : '#000' }
                ]}
                placeholderTextColor={isDarkMode ? '#aaa' : '#888'}
              />
            </View>
          </LinearGradient>
        </View>
        
        <Pressable
          style={[
            styles.button,
            { backgroundColor: !email ? `${primaryColor}80` : primaryColor },
            !email && styles.disabledButton
          ]}
          onPress={handleResetPassword}
          disabled={loading || !email}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Send Reset Link</Text>
          )}
        </Pressable>
        
        <Pressable 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={[styles.backButtonText, { color: secondaryColor }]}>
            Back to Login
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  backgroundLogo: {
    position: 'absolute',
    width: '150%',
    height: '150%',
    top: '10%',
    left: '50%',
    transform: [{ translateX: -300 }, { translateY: -300 }],
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    zIndex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  gradientBorder: {
    borderRadius: 8,
    padding: 1, // Border thickness
  },
  inputInner: {
    borderRadius: 6.5,
    overflow: 'hidden',
  },
  input: {
    padding: 15,
    fontSize: 16,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});