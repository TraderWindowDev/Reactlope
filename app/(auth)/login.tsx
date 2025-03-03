import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Button } from '../../components/Button';
import { useTheme } from '@/src/context/ThemeContext';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDarkMode } = useTheme();

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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      justifyContent: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
    },
    input: {
      height: 48,
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 8,
      paddingHorizontal: 16,
      marginBottom: 16,
      fontSize: 16,
      backgroundColor: '#fff',
    },
    button: {
      backgroundColor: '#000',
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    link: {
      marginTop: 15,
      color: '#000',
      textAlign: 'center',
    },
    forgotPasswordContainer: {
      alignItems: 'center',
      marginTop: 15,
      marginBottom: 20,
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
      color: '#0047AB',
      fontWeight: 'bold',
    },
    loginButton: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#1E1E1E',
      color: isDarkMode ? '#fff' : '#000',
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#fff' }]}>
      <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>Welcome Back!</Text>
      
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <Button
        title={loading ? "Logging in..." : "Log In"}
        onPress={handleLogin}
        style={styles.loginButton}
        disabled={loading || !email || !password}
      />

      {/* Forgot Password Link */}
      <Pressable 
        onPress={() => router.push('/reset-password')}
        style={styles.forgotPasswordContainer}
      >
        <Text style={[styles.forgotPasswordText, { color: isDarkMode ? '#fff' : '#000' }]}>
          Forgot Password?
        </Text>
      </Pressable>

      <View style={styles.signupContainer}>
        <Text style={[styles.signupText, { color: isDarkMode ? '#999' : '#666' }]}>
          Don't have an account?{' '}
        </Text>
        <Link href="/signup" asChild>
          <Pressable>
            <Text style={styles.signupLink}>Sign Up</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

