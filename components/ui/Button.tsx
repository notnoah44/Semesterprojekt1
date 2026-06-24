import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useAppTheme } from '@/lib/contexts/ThemeContext';

type Variant = 'primary' | 'secondary' | 'tonal' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

const sizeStyles: Record<Size, { px: number; py: number; fontSize: number; radius: number }> = {
  sm: { px: 14, py: 8,  fontSize: 13, radius: 20 },
  md: { px: 24, py: 12, fontSize: 15, radius: 24 },
  lg: { px: 32, py: 16, fontSize: 17, radius: 28 },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  const theme = useAppTheme();
  const ss = sizeStyles[size];

  const variantStyles: Record<Variant, { bg: string; text: string }> = {
    primary:   { bg: theme.primary,            text: theme.onPrimary },
    secondary: { bg: theme.secondaryContainer, text: theme.secondary },
    tonal:     { bg: theme.primaryContainer,   text: theme.onPrimaryContainer },
    ghost:     { bg: 'transparent',            text: theme.primary },
    danger:    { bg: theme.errorContainer,     text: theme.error },
  };

  const vs = variantStyles[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        backgroundColor: vs.bg,
        paddingHorizontal: ss.px,
        paddingVertical: ss.py,
        borderRadius: ss.radius,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        opacity: disabled || loading ? 0.5 : 1,
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
        shadowColor: variant === 'primary' ? theme.primary : 'transparent',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: variant === 'primary' ? 2 : 0,
      }}
    >
      {loading && (
        <ActivityIndicator size="small" color={vs.text} style={{ marginRight: 8 }} />
      )}
      <Text style={{
        color: vs.text,
        fontSize: ss.fontSize,
        fontFamily: 'Nunito_700Bold',
        letterSpacing: 0.2,
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
