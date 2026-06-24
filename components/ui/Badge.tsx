import { View, Text } from 'react-native';
import { useAppTheme } from '@/lib/contexts/ThemeContext';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  const theme = useAppTheme();

  const variantMap: Record<BadgeVariant, { bg: string; text: string }> = {
    primary:   { bg: theme.primaryContainer,   text: theme.onPrimaryContainer },
    secondary: { bg: theme.secondaryContainer, text: theme.secondary },
    success:   { bg: theme.successContainer,   text: '#2E7D50' },
    warning:   { bg: theme.warningContainer,   text: '#7A4F00' },
    danger:    { bg: theme.errorContainer,     text: theme.error },
    neutral:   { bg: theme.surfaceDim,         text: theme.textMuted },
  };

  const { bg, text } = variantMap[variant];

  return (
    <View style={{
      backgroundColor: bg,
      borderRadius: 99,
      paddingHorizontal: 12,
      paddingVertical: 5,
      alignSelf: 'flex-start',
    }}>
      <Text style={{
        color: text,
        fontSize: 12,
        fontFamily: 'Nunito_600SemiBold',
        letterSpacing: 0.2,
      }}>
        {label}
      </Text>
    </View>
  );
}
