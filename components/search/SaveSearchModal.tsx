import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { createSavedSearch } from '@/lib/api/savedSearches';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { SearchFilters } from '@/types/listing';

export function SaveSearchModal({ visible, userId, filters, onClose, onSaved }: {
  visible: boolean;
  userId: string;
  filters: SearchFilters;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const saving = useRef(false);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(false);
    try {
      await createSavedSearch(userId, trimmed, filters);
      onSaved(trimmed);
    } catch { setError(true); }
    finally { saving.current = false; setBusy(false); }
  };

  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!saving.current) onClose(); }}>
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#0006', justifyContent: 'center', padding: 24 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: 0, borderRadius: 20, backgroundColor: theme.surface }} contentContainerStyle={{ padding: 24 }}>
        <Text style={{ fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 20 }}>{t('fixes.nameSearchTitle')}</Text>
        <Input label={t('fixes.searchName')} placeholder={t('search.nameHint')} value={name} onChangeText={setName} autoFocus maxLength={80} editable={!busy} returnKeyType="done" onSubmitEditing={save} />
        {error && <Text accessibilityRole="alert" style={{ color: theme.error, marginBottom: 16 }}>{t('search.saveFailed')}</Text>}
        <View style={{ gap: 8 }}>
          <Button label={t('common.save')} onPress={save} disabled={!name.trim() || busy} loading={busy} fullWidth />
          <Button label={t('common.cancel')} onPress={onClose} disabled={busy} variant="ghost" fullWidth />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </Modal>;
}
