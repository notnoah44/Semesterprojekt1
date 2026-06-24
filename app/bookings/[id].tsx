import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { getBooking, updateBookingStatus } from '@/lib/api/bookings';
import { getOrCreateConversation } from '@/lib/api/chat';
import { getReviewForBooking, createReview } from '@/lib/api/reviews';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StarRating } from '@/components/ui/StarRating';
import { formatDateRange, formatDate } from '@/lib/utils/formatDate';
import type { BookingStatus } from '@/types/booking';
import type { Review } from '@/types/review';

const STATUS_CONFIG: Record<BookingStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral'; icon: string }> = {
  pending:   { label: 'Pending', variant: 'warning', icon: 'schedule' },
  accepted:  { label: 'Accepted', variant: 'success', icon: 'check-circle' },
  rejected:  { label: 'Declined', variant: 'danger', icon: 'cancel' },
  completed: { label: 'Completed', variant: 'neutral', icon: 'verified' },
  cancelled: { label: 'Cancelled', variant: 'neutral', icon: 'block' },
};

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const theme = useAppTheme();
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [reviewModal, setReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      Alert.alert('Thank you', 'Your review has been submitted.');
    } catch {
      Alert.alert('Error', 'Could not submit your review.');
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
      Alert.alert('Error', 'Could not update booking status');
    } finally {
      setIsActing(false);
    }
  };

  const handleChat = async () => {
    if (!user || !otherUser) return;
    const conv = await getOrCreateConversation(user.id, otherUser.id, booking.listing_id);
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
        <Text style={{ color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>Booking not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>
          Booking
        </Text>
        {statusCfg && <Badge label={statusCfg.label} variant={statusCfg.variant} />}
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
                {statusCfg.label}
              </Text>
              <Text style={{ fontSize: 13, color: theme.onPrimaryContainer, fontFamily: 'Nunito_400Regular', opacity: 0.7 }}>
                Submitted {formatDate(booking.created_at)}
              </Text>
            </View>
          </View>
        )}

        {/* Listing */}
        <Card>
          <Text style={{ fontSize: 11, fontFamily: 'Nunito_700Bold', color: theme.textSubtle, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            Listing
          </Text>
          <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: theme.text }}>
            {booking.listing?.title ?? '—'}
          </Text>
          {booking.listing?.city && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <MaterialIcons name="location-on" size={14} color={theme.textMuted} />
              <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>
                {booking.listing.city}, {booking.listing.country}
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
          <TouchableOpacity onPress={() => router.push(`/profile/${otherUser.id}`)} activeOpacity={0.8}>
            <Card>
              <Text style={{ fontSize: 11, fontFamily: 'Nunito_700Bold', color: theme.textSubtle, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                {isOwner ? 'Sitter' : 'Host'}
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
              Message
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
                  label="Accept"
                  onPress={() => handleStatus('accepted')}
                  loading={isActing}
                  fullWidth
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Decline"
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
              label="Mark as Completed"
              onPress={() => Alert.alert('Complete booking', 'Mark this housesit as completed? You can then leave a review.', [
                { text: 'Not yet' },
                { text: 'Mark completed', onPress: () => handleStatus('completed') },
              ])}
              loading={isActing}
              fullWidth
            />
          )}

          {/* Sitter: cancel if pending or accepted */}
          {isSitter && (status === 'pending' || status === 'accepted') && (
            <Button
              label="Cancel Request"
              onPress={() => Alert.alert('Cancel booking', 'Are you sure?', [
                { text: 'No' },
                { text: 'Yes, cancel', style: 'destructive', onPress: () => handleStatus('cancelled') },
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
                  <Text style={{ fontSize: 14, fontFamily: 'Nunito_700Bold', color: theme.text }}>Your review</Text>
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
                label={`Review ${otherUser.full_name?.split(' ')[0] ?? 'user'}`}
                onPress={() => { setRating(5); setComment(''); setReviewModal(true); }}
                fullWidth
              />
            )
          )}

          {/* Chat */}
          {otherUser && (
            <Button
              label={`Message ${otherUser.full_name?.split(' ')[0] ?? 'user'}`}
              onPress={handleChat}
              variant="tonal"
              fullWidth
            />
          )}
        </View>

      </ScrollView>

      {/* Review modal */}
      <Modal visible={reviewModal} transparent animationType="slide" onRequestClose={() => setReviewModal(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: theme.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>
                Review {otherUser?.full_name?.split(' ')[0] ?? 'user'}
              </Text>
              <TouchableOpacity onPress={() => setReviewModal(false)}>
                <MaterialIcons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>Tap to rate</Text>
              <StarRating rating={rating} size={36} onChange={setRating} />
            </View>

            <View>
              <Text style={{ fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: theme.text, marginBottom: 6 }}>
                Comment (optional)
              </Text>
              <TextInput
                style={{ backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, padding: 14, fontSize: 15, color: theme.text, fontFamily: 'Nunito_400Regular', minHeight: 90, textAlignVertical: 'top' }}
                placeholder="Share your experience…"
                placeholderTextColor={theme.textMuted}
                value={comment}
                onChangeText={setComment}
                multiline
              />
            </View>

            <Button label="Submit Review" onPress={handleSubmitReview} loading={isSubmitting} fullWidth />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
