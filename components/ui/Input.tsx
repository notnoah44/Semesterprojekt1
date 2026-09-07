import { useState } from 'react';
import { TextInput, View, Text, TextInputProps, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/lib/contexts/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
}

export function Input({ label, error, style, isPassword, secureTextEntry, ...props }: InputProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const password = isPassword || secureTextEntry;

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
      <View>
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
          password ? { paddingRight: 52 } : undefined,
        ]}
        placeholderTextColor={theme.textSubtle}
        {...props}
        secureTextEntry={password ? !visible : false}
      />
      {password && <TouchableOpacity accessibilityRole="button" accessibilityLabel={t(visible ? 'fixes.hidePassword' : 'fixes.showPassword')} onPress={() => setVisible((v) => !v)} style={{ position: 'absolute', right: 4, top: 0, bottom: 0, width: 44, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialIcons name={visible ? 'visibility-off' : 'visibility'} size={22} color={theme.textMuted} />
      </TouchableOpacity>}
      </View>
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
