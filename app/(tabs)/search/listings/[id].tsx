import { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Image, ActivityIndicator, TextInput, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { getListing } from '@/lib/api/listings';
import { createBooking } from '@/lib/api/bookings';
import { findConversation, getOrCreateConversation } from '@/lib/api/chat';
import { getFavouriteListingIds, addFavourite, removeFavourite } from '@/lib/api/favourites';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { useCan } from '@/lib/hooks/usePermissions';
import { showPaywallModal } from '@/lib/paywall';
import { ensureSitterProfile } from '@/lib/profileGate';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatDateRange, formatDate, toDateString, fromDateString } from '@/lib/utils/formatDate';
import type { Listing } from '@/types/listing';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const ensureAuth = useRequireAuth();
  const canSendFirstMessage = useCan('sendFirstMessage');
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);

  useEffect(() => {
    if (!id) return;
    getListing(id).then(setListing).finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;
    getFavouriteListingIds(user.id)
      .then((ids) => setIsFavourite(ids.includes(id)))
      .catch(() => {});
  }, [id, user]);

  const toggleFavourite = async () => {
    if (!ensureAuth() || !user || !listing) return;
    const next = !isFavourite;
    setIsFavourite(next);
    try {
      if (next) await addFavourite(user.id, listing.id);
      else await removeFavourite(user.id, listing.id);
    } catch {
      setIsFavourite(!next);
    }
  };

  const handleMessage = async () => {
    if (!ensureAuth() || !user || !listing) return;
    const existing = await findConversation(user.id, listing.owner_id);
    if (!existing && !(await ensureSitterProfile(user.id, t, router))) return;
    if (!existing && !canSendFirstMessage) {
      showPaywallModal(t, router);
      return;
    }
    const conv = existing ?? (await getOrCreateConversation(user.id, listing.owner_id, listing.id, undefined, canSendFirstMessage));
    router.push(`/(tabs)/chat/${conv.id}`);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <Text style={{ color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>{t('listingDetail.notFound')}</Text>
      </View>
    );
  }

  const isOwner = user?.id === listing.owner_id;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView>
        {/* Photo */}
        {listing.photos.length > 0 ? (
          <Image source={{ uri: listing.photos[0] }} style={{ width: '100%', height: 260 }} resizeMode="cover" />
        ) : (
          <View style={{ width: '100%', height: 200, backgroundColor: theme.surfaceDim, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 48 }}>🏡</Text>
          </View>
        )}

        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 99, padding: 8 }}
        >
          <MaterialIcons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>

        {/* Favourite button */}
        {!isOwner && (
          <TouchableOpacity
            onPress={toggleFavourite}
            style={{ position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 99, padding: 8 }}
          >
            <MaterialIcons name={isFavourite ? 'favorite' : 'favorite-border'} size={20} color={isFavourite ? theme.error : theme.text} />
          </TouchableOpacity>
        )}

        <View style={{ padding: 20, gap: 16 }}>
          {/* Title + badges */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 24, fontFamily: 'Nunito_700Bold', color: theme.text }}>{listing.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                <MaterialIcons name="location-on" size={14} color={theme.textMuted} />
                <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>
                  {listing.city}, {listing.country}
                </Text>
              </View>
            </View>
            {listing.has_pets && <Badge label={t('search.petsLabel')} variant="primary" />}
          </View>

          {/* Dates */}
          {listing.available_from && listing.available_to && (
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <MaterialIcons name="event" size={18} color={theme.primary} />
              <Text style={{ fontSize: 15, color: theme.text, fontFamily: 'Nunito_600SemiBold' }}>
                {formatDateRange(listing.available_from, listing.available_to)}
              </Text>
            </Card>
          )}

          {/* Description */}
          {listing.description && (
            <View>
              <Text style={{ fontSize: 17, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 8 }}>{t('listingDetail.aboutTitle')}</Text>
              <Text style={{ fontSize: 15, color: theme.textMuted, fontFamily: 'Nunito_400Regular', lineHeight: 22 }}>
                {listing.description}
              </Text>
            </View>
          )}

          {/* Responsibilities */}
          {listing.responsibilities.length > 0 && (
            <View>
              <Text style={{ fontSize: 17, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 8 }}>{t('listingDetail.responsibilities')}</Text>
              {listing.responsibilities.map((r) => (
                <View key={r} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary }} />
                  <Text style={{ fontSize: 14, color: theme.text, fontFamily: 'Nunito_400Regular' }}>{r}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Pet details */}
          {listing.has_pets && listing.pet_details && (
            <Card style={{ backgroundColor: theme.primaryContainer, borderColor: theme.primary }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <MaterialCommunityIcons name="paw" size={18} color={theme.onPrimaryContainer} />
                <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: theme.onPrimaryContainer }}>{t('listingDetail.petsTitle')}</Text>
              </View>
              {listing.pet_details.map((pet, i) => (
                <Text key={i} style={{ fontSize: 14, color: theme.text, fontFamily: 'Nunito_400Regular', marginBottom: 4 }}>
                  • {pet.name} ({pet.type}{pet.age ? t('listingDetail.petAgeSuffix', { age: pet.age }) : ''})
                </Text>
              ))}
            </Card>
          )}

          {/* CTAs */}
          {!isOwner && (
            <View style={{ gap: 10 }}>
              <Button
                label={t('listingDetail.requestSit')}
                onPress={async () => {
                  if (!ensureAuth() || !user) return;
                  if (!(await ensureSitterProfile(user.id, t, router))) return;
                  if (!canSendFirstMessage) {
                    showPaywallModal(t, router);
                    return;
                  }
                  setShowRequest(true);
                }}
                fullWidth
              />
              <Button label={t('listingDetail.messageHost')} onPress={handleMessage} variant="tonal" fullWidth />
              <Button label={t('listingDetail.viewHostProfile')} onPress={() => router.push(`/profile/${listing.owner_id}?viewMode=host`)} variant="ghost" fullWidth />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Booking request bottom sheet */}
      {showRequest && listing && user && (
        <BookingRequestSheet
          listing={listing}
          userId={user.id}
          theme={theme}
          onClose={() => setShowRequest(false)}
          onSuccess={(bookingId) => {
            setShowRequest(false);
            router.push(`/(tabs)/home/bookings/${bookingId}`);
          }}
        />
      )}
    </SafeAreaView>
  );
}

function BookingRequestSheet({ listing, userId, theme, onClose, onSuccess }: {
  listing: Listing;
  userId: string;
  theme: any;
  onClose: () => void;
  onSuccess: (bookingId: string) => void;
}) {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState<Date>(
    listing.available_from ? fromDateString(listing.available_from) : new Date()
  );
  const [endDate, setEndDate] = useState<Date>(
    listing.available_to ? fromDateString(listing.available_to) : new Date()
  );
  const [message, setMessage] = useState('');
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const booking = await createBooking({
        listing_id: listing.id,
        sitter_listing_id: null,
        sitter_id: userId,
        owner_id: listing.owner_id,
        start_date: toDateString(startDate),
        end_date: toDateString(endDate),
        status: 'pending',
        message: message.trim() || null,
      });
      onSuccess(booking.id);
    } catch {
      Alert.alert(t('errors.title'), t('listingDetail.requestFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ position: 'absolute', inset: 0, justifyContent: 'flex-end' }}>
      <TouchableOpacity style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} activeOpacity={1} onPress={onClose} />
      <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('listingDetail.requestSheetTitle')}</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Date pickers */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <DateField label={t('common.from')} value={startDate} theme={theme} onPress={() => setShowStart(true)} />
          <DateField label={t('common.to')} value={endDate} theme={theme} onPress={() => setShowEnd(true)} />
        </View>

        {showStart && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, date) => { setShowStart(Platform.OS === 'ios'); if (date) setStartDate(date); }}
          />
        )}
        {showEnd && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, date) => { setShowEnd(Platform.OS === 'ios'); if (date) setEndDate(date); }}
          />
        )}

        {/* Message */}
        <TextInput
          style={{
            backgroundColor: theme.surfaceVariant, borderRadius: 14,
            padding: 14, fontSize: 15, color: theme.text,
            fontFamily: 'Nunito_400Regular', minHeight: 90,
            textAlignVertical: 'top', borderWidth: 1, borderColor: theme.border,
          }}
          placeholder={t('listingDetail.introPlaceholder')}
          placeholderTextColor={theme.textSubtle}
          value={message}
          onChangeText={setMessage}
          multiline
        />

        <Button label={t('listingDetail.sendRequest')} onPress={handleSubmit} loading={isLoading} fullWidth />
      </View>
    </View>
  );
}

function DateField({ label, value, theme, onPress }: { label: string; value: Date; theme: any; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flex: 1, backgroundColor: theme.surfaceVariant, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: theme.border }}
    >
      <Text style={{ fontSize: 11, fontFamily: 'Nunito_700Bold', color: theme.textSubtle, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <MaterialIcons name="event" size={15} color={theme.primary} />
        <Text style={{ fontSize: 14, fontFamily: 'Nunito_600SemiBold', color: theme.text }}>
          {formatDate(toDateString(value))}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
