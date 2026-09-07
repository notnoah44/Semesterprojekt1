import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (password.length < 6) {
      Alert.alert(t('changePassword.tooShortTitle'), t('changePassword.tooShortMsg'));
      return;
    }
    if (password !== confirm) {
      Alert.alert(t('changePassword.mismatchTitle'), t('changePassword.mismatchMsg'));
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (error) {
      Alert.alert(t('errors.title'), error.message);
      return;
    }
    Alert.alert(t('changePassword.successTitle'), t('changePassword.successMsg'), [
      { text: t('common.ok'), onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('changePassword.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 8 }}>
        <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginBottom: 12 }}>
          {t('changePassword.subtitle')}
        </Text>
        <Input
          label={t('changePassword.newPassword')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          placeholder={t('changePassword.newPasswordPlaceholder')}
        />
        <Input
          label={t('changePassword.confirmPassword')}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoComplete="new-password"
          placeholder={t('changePassword.confirmPasswordPlaceholder')}
        />
        <View style={{ marginTop: 12 }}>
          <Button label={t('changePassword.updateButton')} onPress={handleSave} loading={isLoading} fullWidth />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
