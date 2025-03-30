import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Image, ImageBackground } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDarkMode } = useTheme();
  const [showPassword, setShowPassword] = useState(false);

  // Logo colors
  const primaryColor = '#6A3DE8'; // Purple from logo
  const secondaryColor = '#3D7BE8'; // Blue from logo

  const handleLogin = async () => {
    try {
      setLoading(true);
      await signIn(email, password);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Check if form is valid
  const isFormValid = email.trim() !== '' && password.trim() !== '';

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
    welcomeText: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 8,
      textAlign: 'center',
    },
    
    formContainer: {
      marginBottom: 20,
    },
    inputWrapper: {
      position: 'relative',
      width: '100%',
      height: 50,
      marginBottom: 16,
      borderRadius: 8,
      overflow: 'hidden',
    },
    subtitle: {
      fontSize: 24,
      textAlign: 'center',
      fontWeight: 'bold', 
      marginBottom: 20,
      color: isDarkMode ? '#999' : '#000',
    },
    gradientBorder: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      borderRadius: 8,
    },
    inputContainer: {
      position: 'absolute',
      left: 1,
      right: 1,
      top: 1,
      bottom: 1,
      borderRadius: 7,
      overflow: 'hidden',
    },
    input: {
      height: '100%',
      paddingHorizontal: 16,
      fontSize: 16,
    },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      height: '100%',
    },
    passwordInput: {
      flex: 1,
      height: '100%',
      paddingHorizontal: 16,
      fontSize: 16,
    },
    loginButton: {
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 5,
    },
    loginButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    forgotPasswordContainer: {
      alignItems: 'center',
      marginTop: 15,
    },
    forgotPasswordText: {
      fontSize: 14,
      textDecorationLine: 'underline',
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
    darkInput: {
      backgroundColor: '#000b15',
      borderColor: '#6A3DE8',
      color: '#fff',
    },
    darkText: {
      color: '#666',
    },
    eyeIconContainer: {
      paddingHorizontal: 16,
      height: '100%',
      justifyContent: 'center',
      backgroundColor: isDarkMode ? '#000b15' : 'transparent',
    },
    disabledButton: {
      opacity: 0.6,
    },
  });

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
        
        {/* Gradient welcome text */}
        <Text style={styles.subtitle}>
          Velkommen til Løpeprat
        </Text>
      
        <View style={styles.formContainer}>
          {/* Email input with gradient border */}
          <View style={styles.inputWrapper}>
            <LinearGradient
              colors={['#c82090', '#6a14d1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBorder}
            />
            <View style={[styles.inputContainer, { backgroundColor: isDarkMode ? '#000' : '#fff' }]}>
              <TextInput
                style={[styles.input, isDarkMode && styles.darkInput]}
                placeholder="E-post"
                placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>
          
          {/* Password input with gradient border */}
          <View style={styles.inputWrapper}>
            <LinearGradient
              colors={['#c82090', '#6a14d1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBorder}
            />
            <View style={[styles.inputContainer, { backgroundColor: isDarkMode ? '#000' : '#fff' }]}>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.passwordInput, isDarkMode && styles.darkInput]}
                  placeholder="Passord"
                  placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIconContainer}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color={isDarkMode ? '#fff' : '#000'}
                  />
                </Pressable>
              </View>
            </View>
          </View>
          
          <Pressable
            style={[
              styles.loginButton, 
              { backgroundColor: '#6A3DE8' },
              !isFormValid && styles.disabledButton
            ]}
            onPress={handleLogin}
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <Text style={styles.loginButtonText}>
                Logger inn...
              </Text>
            ) : (
              <Text style={styles.loginButtonText}>
                Logg inn
              </Text>
            )}
          </Pressable>
        </View>

        {/* Forgot Password Link */}
        <Pressable 
          onPress={() => router.push('/reset-password')}
          style={styles.forgotPasswordContainer}
        >
          <Text style={[styles.forgotPasswordText, { color: isDarkMode ? secondaryColor : secondaryColor }]}>
            Glemt passord?
          </Text>
        </Pressable>

        <View style={styles.signupContainer}>
          <Text style={[styles.signupText, { color: isDarkMode ? '#999' : '#666' }]}>
            Har du ikke en konto?{' '}
          </Text>
          <Link href="/signup" asChild>
            <Pressable>
              <Text style={[styles.signupLink, { color: secondaryColor }]}>Opprett konto</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      {/* Company Information Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, isDarkMode && styles.darkFooterText]}>
          Løpeprat AS • Org: 935014239 • Tlf: 41296079 • lopeprat@hotmail.com
        </Text>
      </View>
    </View>
  );
}



