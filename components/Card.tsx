import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '@/src/theme/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'elevated' | 'outlined' | 'flat';
}

export function Card({ children, style, variant = 'elevated' }: CardProps) {
  return (
    <View style={[
      styles.card,
      variant === 'elevated' && styles.elevated,
      variant === 'outlined' && styles.outlined,
      style
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  elevated: {
    shadowColor: theme.colors.text,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  outlined: {
    borderWidth: 1,
    borderColor: theme.colors.surface,
  },
});