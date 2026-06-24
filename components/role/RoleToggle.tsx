import { TouchableOpacity, View, Text } from 'react-native';
import { useRole } from '@/lib/hooks/useRole';
import { useAppTheme } from '@/lib/contexts/ThemeContext';

export function RoleToggle() {
  const { role, toggleRole } = useRole();
  const theme = useAppTheme();
  const isSitter = role === 'sitter';

  return (
    <TouchableOpacity
      onPress={toggleRole}
      style={{
        flexDirection: 'row',
        backgroundColor: theme.surfaceDim,
        borderRadius: 99,
        padding: 3,
        borderWidth: 1,
        borderColor: theme.border,
      }}
      accessibilityLabel={`Switch to ${isSitter ? 'Host' : 'Sitter'} mode`}
    >
      {(['sitter', 'anbieter'] as const).map((r) => {
        const active = role === r;
        return (
          <View
            key={r}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 99,
              backgroundColor: active ? theme.primaryContainer : 'transparent',
            }}
          >
            <Text style={{
              fontSize: 12,
              letterSpacing: 0.3,
              color: active ? theme.onPrimaryContainer : theme.textSubtle,
              fontFamily: 'Nunito_700Bold',
            }}>
              {r === 'sitter' ? 'Sitter' : 'Host'}
            </Text>
          </View>
        );
      })}
    </TouchableOpacity>
  );
}
