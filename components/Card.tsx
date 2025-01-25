import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '@/src/theme/theme';
import { useTheme } from '@/src/context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'elevated' | 'outlined' | 'flat';
  onPress?: () => void;
}

export function Card({ children, style, variant = 'elevated', onPress }: CardProps) {
  const { isDarkMode } = useTheme();
  
  const styles = StyleSheet.create({
    card: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#fff',
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
    },
    
    outlined: {
      borderWidth: 1,
      borderColor: isDarkMode ? '#fff' : theme.colors.surface,
    },
    pressed: {
      opacity: 0.9,
      transform: [{ scale: 0.98 }],
    },
  });
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        variant === 'elevated' && styles.elevated,
        variant === 'outlined' && styles.outlined,
        pressed && styles.pressed,
        style
      ]}
    >
      {children}
    </Pressable>
  );
}
