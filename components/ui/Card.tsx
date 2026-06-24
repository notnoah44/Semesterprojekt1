import { View, ViewProps } from 'react-native';
import { useAppTheme } from '@/lib/contexts/ThemeContext';

type CardVariant = 'elevated' | 'filled' | 'outlined';

interface CardProps extends ViewProps {
  variant?: CardVariant;
}

export function Card({ children, style, variant = 'outlined', ...props }: CardProps) {
  const theme = useAppTheme();

  const variantStyle: Record<CardVariant, object> = {
    elevated: {
      backgroundColor: theme.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 12,
      elevation: 5,
      borderWidth: 0,
    },
    filled: {
      backgroundColor: theme.surfaceVariant,
      shadowColor: 'transparent',
      elevation: 0,
      borderWidth: 0,
    },
    outlined: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: 'transparent',
      elevation: 0,
    },
  };

  return (
    <View
      style={[{ borderRadius: 20, padding: 16 }, variantStyle[variant], style]}
      {...props}
    >
      {children}
    </View>
  );
}
