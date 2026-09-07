import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ChangeEmailScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentEmail(data.user?.email ?? ''));
  }, []);

  const handleSave = async () => {
    if (!EMAIL_RE.test(newEmail)) {
      Alert.alert(t('errors.title'), t('changeEmail.invalidEmail'));
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setIsLoading(false);
    if (error) {
      Alert.alert(t('errors.title'), error.message);
      return;
    }
    Alert.alert(t('changeEmail.successTitle'), t('changeEmail.successMsg'), [
      { text: t('common.ok'), onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('changeEmail.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 8 }}>
        <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginBottom: 12 }}>
          {t('changeEmail.subtitle')}
        </Text>
        <Input
          label={t('changeEmail.currentEmail')}
          value={currentEmail}
          editable={false}
        />
        <Input
          label={t('changeEmail.newEmail')}
          value={newEmail}
          onChangeText={setNewEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          placeholder={t('changeEmail.newEmailPlaceholder')}
        />
        <View style={{ marginTop: 12 }}>
          <Button label={t('changeEmail.updateButton')} onPress={handleSave} loading={isLoading} fullWidth />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
