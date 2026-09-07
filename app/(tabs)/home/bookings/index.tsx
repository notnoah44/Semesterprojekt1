import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useRole } from '@/lib/hooks/useRole';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { getBookingsForSitter, getBookingsForOwner } from '@/lib/api/bookings';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDateRange } from '@/lib/utils/formatDate';
import type { Booking } from '@/types/booking';

const statusVariant: Record<Booking['status'], 'success' | 'warning' | 'danger' | 'neutral'> = {
  accepted: 'success',
  pending: 'warning',
  rejected: 'danger',
  completed: 'neutral',
  cancelled: 'neutral',
};

const statusLabelKey: Record<Booking['status'], string> = {
  pending: 'bookingDetail.statusPending',
  accepted: 'bookingDetail.statusAccepted',
  rejected: 'bookingDetail.statusDeclined',
  completed: 'bookingDetail.statusCompleted',
  cancelled: 'bookingDetail.statusCancelled',
};

export default function BookingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { isSitter } = useRole();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const fn = isSitter ? getBookingsForSitter(user.id) : getBookingsForOwner(user.id);
    fn.then(setBookings).finally(() => setIsLoading(false));
  }, [user, isSitter]);

  return (
    <RequireAuth>
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('bookings.title')}</Text>
      </View>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        refreshing={isLoading}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        ListEmptyComponent={
          !isLoading ? (
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: theme.surfaceDim, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="event" size={36} color={theme.borderMuted} />
              </View>
              <Text style={{ fontSize: 16, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>
                {t('bookings.empty')}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/(tabs)/home/bookings/${item.id}`)}>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 15, fontFamily: 'Nunito_700Bold', color: theme.text }}>
                    {item.listing?.title ?? item.sitter_listing?.title ?? t('search.listingFallback')}
                  </Text>
                  {item.start_date && item.end_date && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <MaterialIcons name="event" size={13} color={theme.primary} />
                      <Text style={{ fontSize: 13, color: theme.primary, fontFamily: 'Nunito_600SemiBold' }}>
                        {formatDateRange(item.start_date, item.end_date)}
                      </Text>
                    </View>
                  )}
                </View>
                <Badge label={t(statusLabelKey[item.status as Booking['status']])} variant={statusVariant[item.status as Booking['status']]} />
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
    </RequireAuth>
  );
}
