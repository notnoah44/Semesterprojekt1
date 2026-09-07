import { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createReport } from '@/lib/api/reports';

export function ReportModal({ userId, conversationId, onClose }: { userId: string; conversationId?: string; onClose: () => void }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!reason || busy) return;
    setBusy(true);
    try { await createReport(userId, reason, description, conversationId); Alert.alert(t('chat.reportUser'), t('fixes.reportSent')); onClose(); }
    catch { Alert.alert(t('errors.title'), t('errors.auth.generic')); }
    finally { setBusy(false); }
  };
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#0008', padding: 24 }}>
      <ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: 0, backgroundColor: theme.surface, borderRadius: 20 }} contentContainerStyle={{ padding: 20, gap: 12 }}>
        <Text style={{ color: theme.text, fontSize: 20 }}>{t('chat.reportUser')}</Text>
        {['harassment', 'fraud', 'inappropriate', 'other'].map(value => <TouchableOpacity key={value} onPress={() => setReason(value)} style={{ padding: 12, backgroundColor: reason === value ? theme.primaryContainer : theme.surfaceDim, borderRadius: 12 }}><Text style={{ color: theme.text }}>{t(`fixes.${value}`)}</Text></TouchableOpacity>)}
        <Input label={t('fixes.reportDescription')} value={description} onChangeText={setDescription} multiline maxLength={2000} />
        <Button label={t('fixes.reportSend')} onPress={submit} disabled={!reason || busy} loading={busy} />
        <Button label={t('common.cancel')} onPress={onClose} disabled={busy} />
      </ScrollView>
    </View>
  </Modal>;
}
