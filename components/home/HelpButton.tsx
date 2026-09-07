import { TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/lib/contexts/ThemeContext';

export function HelpButton() {
  const router = useRouter();
  const theme = useAppTheme();

  return (
    <TouchableOpacity onPress={() => router.push('/(tabs)/konto/support/help-support')} style={{ padding: 4 }}>
      <MaterialIcons name="help-outline" size={26} color={theme.text} />
    </TouchableOpacity>
  );
}
