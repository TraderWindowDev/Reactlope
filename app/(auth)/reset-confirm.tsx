import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { Button } from '../../components/Button';
import { useTheme } from '@/src/context/ThemeContext';
import { router } from 'expo-router';

export default function ResetConfirmScreen() {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDarkMode } = useTheme();

  const handleUpdatePassword = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      Alert.alert('Success', 'Your password has been updated.');
      router.replace('/login');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#fff' }]}>
      <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>
        Enter New Password
      </Text>
      <TextInput
        placeholder="New password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
      />
      <Button
        title={loading ? "Updating..." : "Update Password"}
        onPress={handleUpdatePassword}
        disabled={loading || !newPassword}
      />
    </View>
  );
}

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
}); 