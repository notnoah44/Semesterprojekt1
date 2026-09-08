import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Pressable, ActivityIndicator, Alert, Modal, TextInput, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { getBooking, updateBookingStatus } from '@/lib/api/bookings';
import { findConversation, getOrCreateConversation } from '@/lib/api/chat';
import { getReviewForBooking, createReview } from '@/lib/api/reviews';
import { useMembership } from '@/lib/hooks/useMembership';
import { showPaywallModal } from '@/lib/paywall';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StarRating } from '@/components/ui/StarRating';
import { formatDateRange, formatDate } from '@/lib/utils/formatDate';
import type { BookingStatus } from '@/types/booking';
import type { Review } from '@/types/review';

const STATUS_CONFIG: Record<BookingStatus, { labelKey: string; variant: 'success' | 'warning' | 'danger' | 'neutral'; icon: string }> = {
  pending:   { labelKey: 'bookingDetail.statusPending', variant: 'warning', icon: 'schedule' },
  accepted:  { labelKey: 'bookingDetail.statusAccepted', variant: 'success', icon: 'check-circle' },
  rejected:  { labelKey: 'bookingDetail.statusDeclined', variant: 'danger', icon: 'cancel' },
  completed: { labelKey: 'bookingDetail.statusCompleted', variant: 'neutral', icon: 'verified' },
  cancelled: { labelKey: 'bookingDetail.statusCancelled', variant: 'neutral', icon: 'block' },
};

export default function BookingDetailScreen() {
  return (
    <RequireAuth>
      <BookingDetailContent />
    </RequireAuth>
  );
}

function BookingDetailContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { isPro } = useMembership();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [reviewModal, setReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      setAndroidKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setAndroidKeyboardHeight(0);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    getBooking(id).then(setBooking).finally(() => setIsLoading(false));
  }, [id]);

  const isOwner = booking?.owner_id === user?.id;
  const isSitter = booking?.sitter_id === user?.id;
  const status = booking?.status as BookingStatus | undefined;
  const statusCfg = status ? STATUS_CONFIG[status] : null;
  const otherUser = isOwner ? booking?.sitter : booking?.owner;

  useEffect(() => {
    if (!booking || !user || booking.status !== 'completed') return;
    getReviewForBooking(booking.id, user.id).then(setMyReview).catch(() => {});
  }, [booking, user]);

  const handleSubmitReview = async () => {
    if (!booking || !user || !otherUser) return;
    setIsSubmitting(true);
    try {
      const created = await createReview({
        booking_id: booking.id,
        reviewer_id: user.id,
        reviewee_id: otherUser.id,
        rating,
        comment: comment.trim() || null,
      });
      setMyReview(created);
      setReviewModal(false);
      Alert.alert(t('bookingDetail.reviewThankYouTitle'), t('bookingDetail.reviewThankYouMsg'));
    } catch {
      Alert.alert(t('errors.title'), t('bookingDetail.reviewFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatus = async (newStatus: BookingStatus) => {
    if (!booking) return;
    setIsActing(true);
    try {
      const updated = await updateBookingStatus(booking.id, newStatus);
      setBooking((b: any) => ({ ...b, status: updated.status }));
    } catch {
      Alert.alert(t('errors.title'), t('bookingDetail.statusUpdateFailed'));
    } finally {
      setIsActing(false);
    }
  };

  const handleChat = async () => {
    if (!user || !otherUser) return;
    const existing = await findConversation(user.id, otherUser.id, booking.listing_id ?? undefined, booking.sitter_listing_id ?? undefined);
    if (!existing && !isPro) {
      showPaywallModal(t, router);
      return;
    }
    const conv = existing ?? (await getOrCreateConversation(user.id, otherUser.id, booking.listing_id ?? undefined, booking.sitter_listing_id ?? undefined));
    router.push(`/(tabs)/chat/${conv.id}`);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <Text style={{ color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>{t('bookingDetail.notFound')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home/bookings'))}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>
          {t('bookingDetail.title')}
        </Text>
        {statusCfg && <Badge label={t(statusCfg.labelKey)} variant={statusCfg.variant} />}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>

        {/* Status banner */}
        {statusCfg && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 14,
            backgroundColor: theme.primaryContainer, borderRadius: 16, padding: 16,
          }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name={statusCfg.icon as any} size={24} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: theme.onPrimaryContainer }}>
                {t(statusCfg.labelKey)}
              </Text>
              <Text style={{ fontSize: 13, color: theme.onPrimaryContainer, fontFamily: 'Nunito_400Regular', opacity: 0.7 }}>
                {t('bookingDetail.submittedOn', { date: formatDate(booking.created_at) })}
              </Text>
            </View>
          </View>
        )}

        {/* Listing */}
        <Card>
          <Text style={{ fontSize: 11, fontFamily: 'Nunito_700Bold', color: theme.textSubtle, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            {t('bookingDetail.listingLabel')}
          </Text>
          <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: theme.text }}>
            {booking.listing?.title ?? booking.sitter_listing?.title ?? '—'}
          </Text>
          {booking.listing?.city && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <MaterialIcons name="location-on" size={14} color={theme.textMuted} />
              <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>
                {booking.listing.city}, {booking.listing.country}
              </Text>
            </View>
          )}
          {!booking.listing?.city && booking.sitter_listing?.locations?.[0] && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <MaterialIcons name="location-on" size={14} color={theme.textMuted} />
              <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>
                {[booking.sitter_listing.locations[0].city, booking.sitter_listing.locations[0].country].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
            <MaterialIcons name="event" size={14} color={theme.primary} />
            <Text style={{ fontSize: 14, color: theme.primary, fontFamily: 'Nunito_600SemiBold' }}>
              {formatDateRange(booking.start_date, booking.end_date)}
            </Text>
          </View>
        </Card>

        {/* Other user */}
        {otherUser && (
          <TouchableOpacity onPress={() => router.push(`/profile/${otherUser.id}?viewMode=${isOwner ? 'sitter' : 'host'}`)} activeOpacity={0.8}>
            <Card>
              <Text style={{ fontSize: 11, fontFamily: 'Nunito_700Bold', color: theme.textSubtle, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                {isOwner ? t('bookingDetail.sitterLabel') : t('bookingDetail.hostLabel')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Avatar uri={otherUser.avatar_url} name={otherUser.full_name} size={52} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: theme.text }}>
                    {otherUser.full_name}
                  </Text>
                  {otherUser.bio && (
                    <Text numberOfLines={2} style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginTop: 3 }}>
                      {otherUser.bio}
                    </Text>
                  )}
                </View>
                <MaterialIcons name="chevron-right" size={22} color={theme.borderMuted} />
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* Message */}
        {booking.message && (
          <Card>
            <Text style={{ fontSize: 11, fontFamily: 'Nunito_700Bold', color: theme.textSubtle, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
              {t('bookingDetail.messageLabel')}
            </Text>
            <Text style={{ fontSize: 14, color: theme.text, fontFamily: 'Nunito_400Regular', lineHeight: 21 }}>
              {booking.message}
            </Text>
          </Card>
        )}

        {/* Actions */}
        <View style={{ gap: 10 }}>
          {/* Host: accept/decline if pending */}
          {isOwner && status === 'pending' && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button
                  label={t('bookingDetail.accept')}
                  onPress={() => handleStatus('accepted')}
                  loading={isActing}
                  fullWidth
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label={t('bookingDetail.decline')}
                  onPress={() => handleStatus('rejected')}
                  variant="danger"
                  loading={isActing}
                  fullWidth
                />
              </View>
            </View>
          )}

          {/* Host: mark completed once accepted */}
          {isOwner && status === 'accepted' && (
            <Button
              label={t('bookingDetail.markCompleted')}
              onPress={() => Alert.alert(t('bookingDetail.completeConfirmTitle'), t('bookingDetail.completeConfirmMsg'), [
                { text: t('bookingDetail.notYet') },
                { text: t('bookingDetail.markCompletedConfirm'), onPress: () => handleStatus('completed') },
              ])}
              loading={isActing}
              fullWidth
            />
          )}

          {/* Sitter: cancel if pending or accepted */}
          {isSitter && (status === 'pending' || status === 'accepted') && (
            <Button
              label={t('bookingDetail.cancelRequest')}
              onPress={() => Alert.alert(t('bookingDetail.cancelConfirmTitle'), t('bookingDetail.cancelConfirmMsg'), [
                { text: t('common.no') },
                { text: t('bookingDetail.cancelConfirmYes'), style: 'destructive', onPress: () => handleStatus('cancelled') },
              ])}
              variant="danger"
              loading={isActing}
              fullWidth
            />
          )}

          {/* Both: leave a review on completed bookings */}
          {status === 'completed' && otherUser && (
            myReview ? (
              <Card style={{ backgroundColor: theme.surfaceDim }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('bookingDetail.yourReview')}</Text>
                  <StarRating rating={myReview.rating} size={16} />
                </View>
                {myReview.comment && (
                  <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular', lineHeight: 19 }}>
                    {myReview.comment}
                  </Text>
                )}
              </Card>
            ) : (
              <Button
                label={t('bookingDetail.reviewUser', { name: otherUser.full_name?.split(' ')[0] ?? t('bookingDetail.userFallback') })}
                onPress={() => { setRating(5); setComment(''); setReviewModal(true); }}
                fullWidth
              />
            )
          )}

          {/* Chat */}
          {otherUser && (
            <Button
              label={t('bookingDetail.messageUser', { name: otherUser.full_name?.split(' ')[0] ?? t('bookingDetail.userFallback') })}
              onPress={handleChat}
              variant="tonal"
              fullWidth
            />
          )}
        </View>

      </ScrollView>

      {/* Review modal */}
      <Modal visible={reviewModal} transparent animationType="slide" onRequestClose={() => setReviewModal(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          // Android is adjusted explicitly using the keyboard height below;
          // KeyboardAvoidingView is retained for iOS where padding is reliable.
          enabled={Platform.OS === 'ios'}
          behavior="padding"
        >
        <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={Keyboard.dismiss}>
          <Pressable
            onPress={() => {}}
            style={{ backgroundColor: theme.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 + (Platform.OS === 'android' ? androidKeyboardHeight : 0), gap: 16 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>
                {t('bookingDetail.reviewUser', { name: otherUser?.full_name?.split(' ')[0] ?? t('bookingDetail.userFallback') })}
              </Text>
              <TouchableOpacity onPress={() => setReviewModal(false)}>
                <MaterialIcons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>{t('bookingDetail.tapToRate')}</Text>
              <StarRating rating={rating} size={36} onChange={setRating} />
            </View>

            <View>
              <Text style={{ fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: theme.text, marginBottom: 6 }}>
                {t('bookingDetail.commentOptional')}
              </Text>
              <TextInput
                style={{ backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, padding: 14, fontSize: 15, color: theme.text, fontFamily: 'Nunito_400Regular', minHeight: 90, textAlignVertical: 'top' }}
                placeholder={t('bookingDetail.commentPlaceholder')}
                placeholderTextColor={theme.textMuted}
                value={comment}
                onChangeText={setComment}
                multiline
              />
            </View>

            <Button label={t('bookingDetail.submitReview')} onPress={handleSubmitReview} loading={isSubmitting} fullWidth />
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
