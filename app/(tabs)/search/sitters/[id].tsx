import { PhotoGallery } from '@/components/ui/PhotoGallery';
import { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Image, ActivityIndicator, TextInput, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { getSitterListing } from '@/lib/api/sitterListings';
import { getTravelCompanions } from '@/lib/api/profiles';
import { createBooking } from '@/lib/api/bookings';
import { findConversation, getOrCreateConversation } from '@/lib/api/chat';
import { getFavouriteSitterIds, addFavouriteSitter, removeFavouriteSitter, getFavouriteCount } from '@/lib/api/favourites';
import { isConnected, getDisplayName } from '@/lib/api/connections';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { useCan } from '@/lib/hooks/usePermissions';
import { showPaywallModal } from '@/lib/paywall';
import { ensureHostProfile } from '@/lib/profileGate';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { formatDateRange, formatDate, toDateString, fromDateString } from '@/lib/utils/formatDate';
import type { SitterListingWithProfile } from '@/types/sitterListing';
import type { CompanionRelation, TravelCompanion } from '@/types/user';

const RELATION_KEY: Record<CompanionRelation, string> = {
  partner: 'travelCompanion.relationPartner',
  friend: 'travelCompanion.relationFriend',
  family: 'travelCompanion.relationFamily',
  child: 'travelCompanion.relationChild',
};

export default function SitterListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const ensureAuth = useRequireAuth();
  const canSendFirstMessage = useCan('sendFirstMessage');
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [listing, setListing] = useState<SitterListingWithProfile | null>(null);
  const [companions, setCompanions] = useState<TravelCompanion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const [favouriteCount, setFavouriteCount] = useState(0);
  const [connectedToSitter, setConnectedToSitter] = useState(false);

  useEffect(() => {
    if (!id) return;
    getSitterListing(id)
      .then((l) => {
        setListing(l);
        if (l.companion_ids.length > 0) {
          getTravelCompanions(l.sitter_id).then(setCompanions).catch(() => {});
        }
        if (user) isConnected(user.id, l.sitter_id).then(setConnectedToSitter);
      })
      .finally(() => setIsLoading(false));
  }, [id, user]);

  useEffect(() => {
    if (!listing || !user) return;
    getFavouriteSitterIds(user.id)
      .then((ids) => setIsFavourite(ids.includes(listing.sitter_id)))
      .catch(() => {});
  }, [listing, user]);

  useEffect(() => {
    if (!listing) return;
    getFavouriteCount({ sitterId: listing.sitter_id }).then(setFavouriteCount).catch(() => {});
  }, [listing, isFavourite]);

  const toggleFavourite = async () => {
    if (!ensureAuth() || !user || !listing) return;
    const next = !isFavourite;
    setIsFavourite(next);
    try {
      if (next) await addFavouriteSitter(user.id, listing.sitter_id);
      else await removeFavouriteSitter(user.id, listing.sitter_id);
    } catch {
      setIsFavourite(!next);
    }
  };

  const handleMessage = async () => {
    if (!ensureAuth() || !user || !listing) return;
    const existing = await findConversation(user.id, listing.sitter_id, undefined, listing.id);
    if (!existing && !(await ensureHostProfile(user.id, t, router))) return;
    if (!existing && !canSendFirstMessage) {
      showPaywallModal(t, router);
      return;
    }
    const conv = existing ?? (await getOrCreateConversation(user.id, listing.sitter_id, undefined, listing.id, canSendFirstMessage));
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
        <Text style={{ color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>{t('sitterListingDetail.notFound')}</Text>
      </View>
    );
  }

  const isOwner = user?.id === listing.sitter_id;
  const coverImage = listing.cover_photo ?? listing.sitter?.avatar_url ?? null;
  const selectedCompanions = companions.filter((c) => listing.companion_ids.includes(c.id));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView>
        {/* Photo */}
        {coverImage ? (
          <PhotoGallery photos={[...new Set([coverImage, ...(listing.sitter?.photos ?? [])])]} />
        ) : (
          <View style={{ width: '100%', height: 200, backgroundColor: theme.surfaceDim, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 48 }}>🧑‍🦱</Text>
          </View>
        )}

        {/* Back button */}
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/search'))}
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
          {/* Title + badge */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 24, fontFamily: 'Nunito_700Bold', color: theme.text }}>{listing.title}</Text>
              {listing.locations.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                  <MaterialIcons name="location-on" size={14} color={theme.textMuted} />
                  <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>
                    {listing.locations.map((l) => [l.city, l.country].filter(Boolean).join(', ')).join(' · ')}
                  </Text>
                </View>
              )}
              {favouriteCount > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                  <MaterialIcons name="favorite" size={14} color={theme.error} />
                  <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>
                    {favouriteCount}
                  </Text>
                </View>
              )}
            </View>
            <Badge
              label={t(listing.pet_sitting === 'with_pet' ? 'sitterListingCreate.petSittingWith' : listing.pet_sitting === 'without_pet' ? 'sitterListingCreate.petSittingWithout' : 'sitterListingCreate.petSittingBoth')}
              variant="primary"
            />
          </View>

          {/* Availability */}
          {listing.availability_periods.length > 0 && (
            <Card style={{ gap: 8 }}>
              {listing.availability_periods.map((p, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <MaterialIcons name="event" size={18} color={theme.primary} />
                  <Text style={{ fontSize: 15, color: theme.text, fontFamily: 'Nunito_600SemiBold' }}>
                    {formatDateRange(p.from, p.to)}
                  </Text>
                </View>
              ))}
            </Card>
          )}

          {/* Description */}
          {listing.description && (
            <View>
              <Text style={{ fontSize: 17, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 8 }}>{t('sitterListingDetail.aboutTitle')}</Text>
              <Text style={{ fontSize: 15, color: theme.textMuted, fontFamily: 'Nunito_400Regular', lineHeight: 22 }}>
                {listing.description}
              </Text>
            </View>
          )}

          {/* Own pet */}
          {listing.brings_own_pet && listing.own_pet_details.length > 0 && (
            <Card style={{ backgroundColor: theme.primaryContainer, borderColor: theme.primary }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <MaterialCommunityIcons name="paw" size={18} color={theme.onPrimaryContainer} />
                <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: theme.onPrimaryContainer }}>{t('sitterListingDetail.ownPetTitle')}</Text>
              </View>
              {listing.own_pet_details.map((pet, i) => (
                <Text key={i} style={{ fontSize: 14, color: theme.text, fontFamily: 'Nunito_400Regular', marginBottom: 4 }}>
                  • {pet.type} × {pet.count}
                </Text>
              ))}
            </Card>
          )}

          {/* Max alone hours */}
          {listing.max_alone_hours != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="schedule" size={18} color={theme.textMuted} />
              <Text style={{ fontSize: 14, color: theme.text, fontFamily: 'Nunito_400Regular' }}>
                {t('sitterListingDetail.maxAloneLabel')}: {listing.max_alone_hours}h
              </Text>
            </View>
          )}

          {/* Companions */}
          {selectedCompanions.length > 0 && (
            <View>
              <Text style={{ fontSize: 17, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 8 }}>{t('sitterListingCreate.companionsTitle')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {selectedCompanions.map((c) => (
                  <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, backgroundColor: theme.surfaceDim }}>
                    <Avatar uri={c.avatar_url} name={c.name} size={22} />
                    <Text style={{ fontSize: 13, color: theme.text, fontFamily: 'Nunito_600SemiBold' }}>
                      {c.name}{c.relation ? ` · ${t(RELATION_KEY[c.relation])}` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Sitter profile summary */}
          {listing.sitter && (
            <TouchableOpacity onPress={() => router.push(`/profile/${listing.sitter_id}?viewMode=sitter`)}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar uri={listing.sitter.avatar_url} name={getDisplayName(listing.sitter.full_name, connectedToSitter)} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontFamily: 'Nunito_700Bold', color: theme.text }}>{getDisplayName(listing.sitter.full_name, connectedToSitter)}</Text>
                  {listing.sitter.languages.length > 0 && (
                    <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>{listing.sitter.languages.join(', ')}</Text>
                  )}
                </View>
                <MaterialIcons name="chevron-right" size={22} color={theme.borderMuted} />
              </Card>
            </TouchableOpacity>
          )}

          {/* CTAs */}
          {!isOwner && (
            <View style={{ gap: 10 }}>
              <Button
                label={t('sitterListingDetail.requestBooking')}
                onPress={async () => {
                  if (!ensureAuth() || !user) return;
                  if (!(await ensureHostProfile(user.id, t, router))) return;
                  if (!canSendFirstMessage) {
                    showPaywallModal(t, router);
                    return;
                  }
                  setShowRequest(true);
                }}
                fullWidth
              />
              <Button label={t('sitterListingDetail.messageSitter')} onPress={handleMessage} variant="tonal" fullWidth />
              <Button label={t('sitterListingDetail.viewSitterProfile')} onPress={() => router.push(`/profile/${listing.sitter_id}?viewMode=sitter`)} variant="ghost" fullWidth />
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
  listing: SitterListingWithProfile;
  userId: string;
  theme: any;
  onClose: () => void;
  onSuccess: (bookingId: string) => void;
}) {
  const { t } = useTranslation();
  const firstPeriod = listing.availability_periods[0];
  const [startDate, setStartDate] = useState<Date>(
    firstPeriod ? fromDateString(firstPeriod.from) : new Date()
  );
  const [endDate, setEndDate] = useState<Date>(
    firstPeriod ? fromDateString(firstPeriod.to) : new Date()
  );
  const [message, setMessage] = useState('');
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const booking = await createBooking({
        listing_id: null,
        sitter_listing_id: listing.id,
        sitter_id: listing.sitter_id,
        owner_id: userId,
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
          <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('sitterListingDetail.requestSheetTitle')}</Text>
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
