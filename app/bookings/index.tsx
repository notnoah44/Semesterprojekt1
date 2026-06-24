import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useRole } from '@/lib/hooks/useRole';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
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

export default function BookingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { isSitter } = useRole();
  const theme = useAppTheme();
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const fn = isSitter ? getBookingsForSitter(user.id) : getBookingsForOwner(user.id);
    fn.then(setBookings).finally(() => setIsLoading(false));
  }, [user, isSitter]);

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
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
                No bookings yet
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/bookings/${item.id}`)}>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 15, fontFamily: 'Nunito_700Bold', color: theme.text }}>
                    {item.listing?.title ?? 'Listing'}
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
                <Badge label={item.status} variant={statusVariant[item.status as Booking['status']]} />
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
