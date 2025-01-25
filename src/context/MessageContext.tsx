import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface SubscriptionCheckProps {
  isVisible: boolean;
  onClose: () => void;
  onSubscribe: () => void;
}

export default function SubscriptionCheck({ isVisible, onClose, onSubscribe }: SubscriptionCheckProps) {
  const { isDarkMode } = useTheme();

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContent,
          { backgroundColor: isDarkMode ? '#1E1E1E' : '#fff' }
        ]}>
          <Ionicons 
            name="lock-closed-outline" 
            size={48} 
            color={isDarkMode ? '#fff' : '#000'} 
            style={styles.icon}
          />
          <Text style={[
            styles.title,
            { color: isDarkMode ? '#fff' : '#000' }
          ]}>
            Premium Feature
          </Text>
          <Text style={[
            styles.description,
            { color: isDarkMode ? '#ccc' : '#666' }
          ]}>
            Subscribe to chat with coaches and get personalized training advice
          </Text>
          <Pressable
            style={[styles.subscribeButton]}
            onPress={onSubscribe}
          >
            <Text style={styles.buttonText}>Subscribe Now</Text>
          </Pressable>
          <Pressable
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={[
              styles.cancelText,
              { color: isDarkMode ? '#fff' : '#666' }
            ]}>
              Maybe Later
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  subscribeButton: {
    backgroundColor: '#0047AB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 16,
  },
});
