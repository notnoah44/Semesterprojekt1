import { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { getBookingsForUser } from '@/lib/api/bookings';
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

type FilterKey = 'all' | 'requestsMade' | 'requestsReceived' | 'ongoingReceived' | 'ongoingMade' | 'closed';

// A booking belongs to a listing owned either by the owner (host listing) or by the
// sitter (sitter listing) - whoever does NOT own that listing made the request.
function madeByMe(booking: any, userId: string) {
  return booking.listing_id ? booking.sitter_id === userId : booking.owner_id === userId;
}
function receivedByMe(booking: any, userId: string) {
  return booking.listing_id ? booking.owner_id === userId : booking.sitter_id === userId;
}

export default function BookingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    getBookingsForUser(user.id).then(setBookings).finally(() => setIsLoading(false));
  }, [user]);

  const sections = useMemo(() => {
    if (!user) return [];
    const requestsMade = bookings.filter((b) => madeByMe(b, user.id) && b.status === 'pending');
    const requestsReceived = bookings.filter((b) => receivedByMe(b, user.id) && b.status === 'pending');
    const ongoingReceived = bookings.filter((b) => receivedByMe(b, user.id) && b.status === 'accepted');
    const ongoingMade = bookings.filter((b) => madeByMe(b, user.id) && b.status === 'accepted');
    const closed = bookings.filter((b) => b.status === 'completed' || b.status === 'rejected' || b.status === 'cancelled');

    const all = [
      { key: 'requestsMade' as const, title: t('bookings.sectionRequestsMade'), data: requestsMade },
      { key: 'requestsReceived' as const, title: t('bookings.sectionRequestsReceived'), data: requestsReceived },
      { key: 'ongoingReceived' as const, title: t('bookings.sectionOngoingReceived'), data: ongoingReceived },
      { key: 'ongoingMade' as const, title: t('bookings.sectionOngoingMade'), data: ongoingMade },
      { key: 'closed' as const, title: t('bookings.filterClosed'), data: closed },
    ];
    return filter === 'all' ? all.filter((s) => s.data.length > 0) : all.filter((s) => s.key === filter);
  }, [bookings, user, filter, t]);

  const isEmpty = !isLoading && sections.every((s) => s.data.length === 0);

  const filters: { key: FilterKey; labelKey: string }[] = [
    { key: 'all', labelKey: 'bookings.filterAll' },
    { key: 'requestsMade', labelKey: 'bookings.filterRequestsMade' },
    { key: 'requestsReceived', labelKey: 'bookings.filterRequestsReceived' },
    { key: 'ongoingReceived', labelKey: 'bookings.filterOngoingReceived' },
    { key: 'ongoingMade', labelKey: 'bookings.filterOngoingMade' },
    { key: 'closed', labelKey: 'bookings.filterClosed' },
  ];

  return (
    <RequireAuth>
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('bookings.title')}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)}>
              <View style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
                backgroundColor: active ? theme.primary : theme.surfaceDim,
              }}>
                <Text style={{
                  fontSize: 13, fontFamily: 'Nunito_600SemiBold',
                  color: active ? theme.onPrimary : theme.textMuted,
                }}>
                  {t(f.labelKey)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : isEmpty ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 60 }}>
          <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: theme.surfaceDim, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="event" size={36} color={theme.borderMuted} />
          </View>
          <Text style={{ fontSize: 16, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>
            {t('bookings.empty')}
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 32 }}>
          {sections.map((section) => (
            <View key={section.key} style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 12, fontFamily: 'Nunito_700Bold', color: theme.textSubtle,
                letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
              }}>
                {section.title} ({section.data.length})
              </Text>
              {section.data.map((item) => (
                <TouchableOpacity key={item.id} onPress={() => router.push(`/(tabs)/home/bookings/${item.id}`)} style={{ marginBottom: 10 }}>
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
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
    </RequireAuth>
  );
}
