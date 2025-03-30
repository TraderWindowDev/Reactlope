import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Image } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { isDarkMode } = useTheme();

  // Logo colors
  const primaryColor = '#6A3DE8'; // Purple from logo
  const secondaryColor = '#3D7BE8'; // Blue from logo

  const handleSignup = async () => {
    try {
      if (!email || !password) {
        alert('Please enter both email and password');
        return;
      }
      
      if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
      }
      
      setLoading(true);
      await signUp(email, password);
      alert('Sign up successful. Please check your email to verify your account.');
    } catch (error: any) {
      console.error('Signup error:', error);
      alert(error.message || 'Failed to sign up');
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

        <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>Opprett Konto</Text>
        
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
        
        {/* Password input with gradient border */}
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
                placeholder="Passord"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
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
            { backgroundColor: (!email || !password) ? `${primaryColor}80` : primaryColor },
            (!email || !password) && styles.disabledButton
          ]}
          onPress={handleSignup}
          disabled={loading || !email || !password}
        >
          <Text style={styles.buttonText}>
            {loading ? "Oppretter konto..." : "Opprett konto"}
          </Text>
        </Pressable>
        
        <View style={styles.signupContainer}>
          <Text style={[styles.signupText, { color: isDarkMode ? '#999' : '#666' }]}>
            Har du allerede en konto?{' '}
          </Text>
          <Link href="/login" asChild>
            <Pressable>
              <Text style={[styles.signupLink, { color: secondaryColor }]}>Logg inn</Text>
            </Pressable>
          </Link>
        </View>
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
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
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
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signupText: {
    fontSize: 14,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
