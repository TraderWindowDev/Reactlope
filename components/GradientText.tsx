import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientTextProps {
  text: string;
  style?: any;
  gradientColors?: string[];
}

export default function GradientText({
  text,
  style,
  gradientColors = ['#c82090', '#6a14d1'],
}: GradientTextProps) {
  // Simple version without MaskedView
  return (
    <Text style={[styles.text, style, { color: gradientColors[0] }]}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'transparent',
  },
}); 