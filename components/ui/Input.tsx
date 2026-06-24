import { TextInput, View, Text, TextInputProps } from 'react-native';
import { useAppTheme } from '@/lib/contexts/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const theme = useAppTheme();

  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Text style={{
          fontSize: 12,
          color: error ? theme.error : theme.textMuted,
          marginBottom: 6,
          fontFamily: 'Nunito_600SemiBold',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}>
          {label}
        </Text>
      )}
      <TextInput
        style={[
          {
            borderWidth: error ? 2 : 1,
            borderColor: error ? theme.error : theme.border,
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 13,
            fontSize: 15,
            color: theme.text,
            backgroundColor: error ? theme.errorContainer : theme.surfaceVariant,
            fontFamily: 'Nunito_400Regular',
          },
          style,
        ]}
        placeholderTextColor={theme.textSubtle}
        {...props}
      />
      {error && (
        <Text style={{
          fontSize: 12,
          color: theme.error,
          marginTop: 4,
          fontFamily: 'Nunito_400Regular',
        }}>
          {error}
        </Text>
      )}
    </View>
  );
}
