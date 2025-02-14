import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { theme } from '@/src/theme/theme';
import { useTheme } from '@/src/context/ThemeContext';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  height?: number;
  width?: number; 
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  onPress,
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  height,
  width,
  style,
  textStyle,
}: ButtonProps) {
  const { isDarkMode } = useTheme();
  const getVariantStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryButton;
      case 'outline':
        return styles.outlineButton;
      default:
        return styles.primaryButton;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return styles.smallButton;
      case 'large':
        return styles.largeButton;
      default:
        return styles.mediumButton;
    }
  };

  const styles = StyleSheet.create({
    button: {
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDarkMode ? '#fff' : theme.colors.primary,
    },
    primaryButton: {
      backgroundColor: isDarkMode ? '#fff' : theme.colors.primary,
    },
    secondaryButton: {
      backgroundColor: isDarkMode ? '#fff' : theme.colors.secondary,
    },
    outlineButton: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: isDarkMode ? '#fff' : theme.colors.primary,
    },
    smallButton: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
    },
    mediumButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
    },
    largeButton: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
    },
    text: {
      color: isDarkMode ? '#fff' : theme.colors.background,
      ...theme.typography.body,
    },
    outlineText: {
      color: isDarkMode ? '#fff' : theme.colors.primary,
    },
    disabledButton: {
      opacity: 0.5,
    },
    disabledText: {
      opacity: 0.5,
    },
  });

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        getVariantStyle(),
        getSizeStyle(),
        disabled && styles.disabledButton,
        height && { height },
        width && { width },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? theme.colors.primary : theme.colors.background} />
      ) : (
        <Text
          style={[
            styles.text,
            variant === 'outline' && styles.outlineText,
            disabled && styles.disabledText,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

