import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientBorderProps {
  children: React.ReactNode;
  style?: ViewStyle;
  gradientColors?: string[];
  borderWidth?: number;
  borderRadius?: number;
}

export default function GradientBorder({
  children,
  style,
  gradientColors = ['#c82090', '#6a14d1'],
  borderWidth = 0.2,
  borderRadius = 8,
}: GradientBorderProps) {
  return (
    <View style={[styles.container, { borderRadius }, style]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          StyleSheet.absoluteFill,
          { borderRadius, padding: borderWidth },
        ]}
      />
      <View style={[
        styles.innerContainer,
        { borderRadius: borderRadius - borderWidth }
      ]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  innerContainer: {
    backgroundColor: 'white',
    overflow: 'hidden',
    flex: 1,
  },
}); 