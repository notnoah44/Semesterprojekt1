import { View, Text, Image } from 'react-native';
import { useAppTheme } from '@/lib/contexts/ThemeContext';

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
}

export function Avatar({ uri, name, size = 44 }: AvatarProps) {
  const theme = useAppTheme();

  const initials = name
    ? name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.surfaceVariant,
        }}
      />
    );
  }

  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: theme.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.primaryLight,
    }}>
      <Text style={{
        color: theme.onPrimaryContainer,
        fontSize: size * 0.35,
        fontFamily: 'Nunito_700Bold',
      }}>
        {initials}
      </Text>
    </View>
  );
}
