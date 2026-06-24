import { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { getProfile } from '@/lib/api/profiles';
import { getReviewsForUser, getReviewStats, type ReviewWithReviewer, type ReviewStats } from '@/lib/api/reviews';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StarRating } from '@/components/ui/StarRating';
import { formatDate } from '@/lib/utils/formatDate';
import type { Profile } from '@/types/user';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<ReviewWithReviewer[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ average: 0, count: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getProfile(id), getReviewsForUser(id), getReviewStats(id)])
      .then(([p, r, s]) => {
        setProfile(p);
        setReviews(r);
        setStats(s);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>Profile not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Header */}
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Avatar uri={profile.avatar_url} name={profile.full_name} size={96} />
          <Text style={{ fontSize: 24, fontFamily: 'Nunito_700Bold', color: theme.text }}>
            {profile.full_name ?? 'PawStay user'}
          </Text>
          {stats.count > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <StarRating rating={stats.average} size={18} />
              <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_600SemiBold' }}>
                {stats.average.toFixed(1)} ({stats.count})
              </Text>
            </View>
          )}
          {profile.membership_tier === 'standard' && <Badge label="Standard Member" variant="primary" />}
        </View>

        {/* Details */}
        {(profile.job || profile.origin || profile.age) && (
          <Card>
            {profile.job && <DetailRow theme={theme} icon="work" label={profile.job} />}
            {profile.origin && <DetailRow theme={theme} icon="public" label={`From ${profile.origin}`} />}
            {profile.age && <DetailRow theme={theme} icon="cake" label={`${profile.age} years old`} />}
          </Card>
        )}

        {/* Bio */}
        {profile.bio && (
          <View>
            <Text style={{ fontSize: 17, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 8 }}>About</Text>
            <Text style={{ fontSize: 15, color: theme.textMuted, fontFamily: 'Nunito_400Regular', lineHeight: 22 }}>
              {profile.bio}
            </Text>
          </View>
        )}

        {/* Animals cared / languages */}
        {profile.animals_cared?.length > 0 && (
          <View>
            <Text style={{ fontSize: 17, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 8 }}>Experience with</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {profile.animals_cared.map((a) => (
                <View key={a} style={{ flexDirection: 'row' }}><Badge label={a} variant="neutral" /></View>
              ))}
            </View>
          </View>
        )}

        {/* Reviews */}
        <View>
          <Text style={{ fontSize: 17, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 8 }}>
            Reviews {stats.count > 0 ? `(${stats.count})` : ''}
          </Text>
          {reviews.length === 0 ? (
            <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>
              No reviews yet.
            </Text>
          ) : (
            reviews.map((r) => (
              <Card key={r.id} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Avatar uri={r.reviewer?.avatar_url} name={r.reviewer?.full_name} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontFamily: 'Nunito_700Bold', color: theme.text }}>
                      {r.reviewer?.full_name ?? 'PawStay user'}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>
                      {formatDate(r.created_at)}
                    </Text>
                  </View>
                  <StarRating rating={r.rating} size={14} />
                </View>
                {r.comment && (
                  <Text style={{ fontSize: 14, color: theme.text, fontFamily: 'Nunito_400Regular', lineHeight: 20 }}>
                    {r.comment}
                  </Text>
                )}
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ theme, icon, label }: { theme: any; icon: any; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
      <MaterialIcons name={icon} size={18} color={theme.textMuted} />
      <Text style={{ fontSize: 14, color: theme.text, fontFamily: 'Nunito_400Regular' }}>{label}</Text>
    </View>
  );
}
