import { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { formatDateRange, toDateString } from '@/lib/utils/formatDate';
import type { AppTheme } from '@/lib/constants/themes';

interface DateRangeFieldProps {
  theme: AppTheme;
  label?: string;
  from: Date | null;
  to: Date | null;
  onChange: (from: Date | null, to: Date | null) => void;
}

/**
 * Zeitraum-Auswahl (Punkt 3, offene-punkte-anpassungen.md): Kalender öffnet
 * sich zuerst für den Start, springt nach Auswahl automatisch zum Ende und
 * klappt danach zu einer "Von – Bis"-Zusammenfassung zusammen. Erneutes
 * Antippen öffnet die Auswahl wieder von vorne, statt dauerhaft offen zu bleiben.
 */
export function DateRangeField({ theme, label, from, to, onChange }: DateRangeFieldProps) {
  const { t } = useTranslation();
  const [stage, setStage] = useState<'closed' | 'from' | 'to'>('closed');

  const handlePickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android' && event.type === 'dismissed') {
      setStage('closed');
      return;
    }
    if (!date) return;
    if (stage === 'from') {
      onChange(date, to && to >= date ? to : null);
      setStage('to');
    } else if (stage === 'to') {
      onChange(from, date);
      setStage('closed');
    }
  };

  return (
    <View>
      {label && (
        <Text style={{ fontSize: 12, fontFamily: 'Nunito_700Bold', color: theme.textMuted, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>
          {label}
        </Text>
      )}
      <TouchableOpacity
        onPress={() => setStage('from')}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: theme.surfaceVariant, borderRadius: 14, padding: 14,
          borderWidth: 1, borderColor: theme.border,
          marginBottom: stage !== 'closed' ? 10 : 16,
        }}
      >
        <MaterialIcons name="event" size={18} color={from && to ? theme.primary : theme.textMuted} />
        <Text style={{ flex: 1, fontSize: 14, fontFamily: 'Nunito_600SemiBold', color: from && to ? theme.text : theme.textSubtle }}>
          {from && to ? formatDateRange(toDateString(from), toDateString(to)) : t('common.selectDateRange')}
        </Text>
        {from && to && <MaterialIcons name="edit" size={16} color={theme.textMuted} />}
      </TouchableOpacity>

      {stage !== 'closed' && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'Nunito_600SemiBold', marginBottom: 6 }}>
            {stage === 'from' ? t('common.selectStartDate') : t('common.selectEndDate')}
          </Text>
          <DateTimePicker
            key={stage}
            value={(stage === 'from' ? from : to) ?? from ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={stage === 'to' ? (from ?? undefined) : undefined}
            onChange={handlePickerChange}
          />
        </View>
      )}
    </View>
  );
}
