import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const clear = useAuthStore((s) => s.clear);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [confirmation, setConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = () => {
    if (confirmation !== 'DELETE') {
      Alert.alert(t('deleteAccount.confirmRequiredTitle'), t('deleteAccount.confirmRequiredMsg'));
      return;
    }
    Alert.alert(
      t('deleteAccount.deleteAlertTitle'),
      t('deleteAccount.deleteAlertMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('deleteAccount.confirmDelete'),
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const { data, error } = await supabase.functions.invoke<{ status: 'deleted' | 'scheduled'; scheduledFor?: string }>('delete-account');
              if (error) throw error;

              if (data?.status === 'scheduled' && data.scheduledFor) {
                const date = new Date(data.scheduledFor).toLocaleDateString();
                Alert.alert(
                  t('deleteAccount.scheduledTitle'),
                  t('deleteAccount.scheduledMsg', { date }),
                  [{ text: t('common.ok'), onPress: () => router.back() }]
                );
                return;
              }

              await supabase.auth.signOut();
              clear();
              Alert.alert(t('deleteAccount.deletedTitle'), t('deleteAccount.deletedMsg'));
            } catch (e) {
              console.error('[delete-account] failed:', e);
              Alert.alert(t('errors.title'), t('deleteAccount.deleteFailedMsg'));
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('deleteAccount.title')}</Text>
      </View>

      <View style={{ padding: 20, gap: 20 }}>
        <Card style={{ backgroundColor: '#FEF2F2', borderColor: theme.error }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="warning" size={22} color={theme.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: theme.error, marginBottom: 6 }}>
                {t('deleteAccount.irreversible')}
              </Text>
              <Text style={{ fontSize: 14, color: '#991B1B', fontFamily: 'Nunito_400Regular', lineHeight: 20 }}>
                {t('deleteAccount.description')}
              </Text>
            </View>
          </View>
        </Card>

        <Input
          label={t('deleteAccount.confirmLabel')}
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
          placeholder={t('deleteAccount.confirmPlaceholder')}
        />

        <Button
          label={t('deleteAccount.deleteButton')}
          onPress={handleDelete}
          variant="danger"
          loading={isLoading}
          disabled={confirmation !== 'DELETE'}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}
