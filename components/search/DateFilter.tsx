import { View, TouchableOpacity, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DateRangeField } from '@/components/ui/DateRangeField';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { useSearchStore } from '@/stores/searchStore';

export function DateFilter() {
  const { filters, setFilters } = useSearchStore();
  const theme = useAppTheme();
  const { t } = useTranslation();
  return <View style={{ marginTop: 8 }}>
    <DateRangeField theme={theme} from={filters.dateFrom ? new Date(filters.dateFrom) : null} to={filters.dateTo ? new Date(filters.dateTo) : null}
      onChange={(from, to) => setFilters({ ...filters, dateFrom: from ?? undefined, dateTo: to ?? undefined })} />
    {(filters.dateFrom || filters.dateTo) && <TouchableOpacity onPress={() => setFilters({ ...filters, dateFrom: undefined, dateTo: undefined })}>
      <Text style={{ color: theme.primary, marginBottom: 8 }}>{t('fixes.clearDates')}</Text>
    </TouchableOpacity>}
  </View>;
}
