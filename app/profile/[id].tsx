import { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useVideoPlayer, VideoView } from 'expo-video';
import { getProfile, getSitterProfile, getHostProfile } from '@/lib/api/profiles';
import { getReviewsForUser, getReviewStats, type ReviewWithReviewer, type ReviewStats } from '@/lib/api/reviews';
import { isConnected, getDisplayName } from '@/lib/api/connections';
import { getAgeFromBirthYear } from '@/lib/utils/age';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StarRating } from '@/components/ui/StarRating';
import { formatDate } from '@/lib/utils/formatDate';
import type { Profile, SitterProfile, HostProfile } from '@/types/user';

const ANIMAL_LABEL_KEYS: Record<string, string> = {
  dogs: 'sitterProfile.animal_dogs', cats: 'sitterProfile.animal_cats', rodents: 'sitterProfile.animal_rodents',
  reptiles: 'sitterProfile.animal_reptiles', birds: 'sitterProfile.animal_birds', horses: 'sitterProfile.animal_horses',
  other: 'sitterProfile.animal_other',
};
const SKILL_LABEL_KEYS: Record<string, string> = {
  medication: 'sitterProfile.skill_medication', seniorDogs: 'sitterProfile.skill_seniorDogs', firstAid: 'sitterProfile.skill_firstAid',
};
const ENV_LABEL_KEYS: Record<string, string> = {
  quietRural: 'hostProfile.env_quietRural', cityCenter: 'hostProfile.env_cityCenter',
  nearForest: 'hostProfile.env_nearForest', nonSmoking: 'hostProfile.env_nonSmoking',
};
const EXPERIENCE_LABEL_KEYS: Record<string, string> = {
  beginner: 'sitterProfile.experienceBeginner', advanced: 'sitterProfile.experienceAdvanced', expert: 'sitterProfile.experienceExpert',
};
const MOBILITY_LABEL_KEYS: Record<string, string> = {
  own_car: 'sitterProfile.mobilityOwnCar', public_transport: 'sitterProfile.mobilityPublicTransport',
};
const WORK_SETUP_LABEL_KEYS: Record<string, string> = {
  remote: 'sitterProfile.workRemote', away_daytime: 'sitterProfile.workAwayDaytime', flexible: 'sitterProfile.workFlexible',
};
const HOUSING_LABEL_KEYS: Record<string, string> = {
  house: 'hostProfile.housingHouse', apartment: 'hostProfile.housingApartment', farmhouse: 'hostProfile.housingFarmhouse',
};
const ACCOMMODATION_LABEL_KEYS: Record<string, string> = {
  guest_room: 'hostProfile.accommodationGuestRoom', own_bathroom: 'hostProfile.accommodationOwnBathroom', owners_bedroom: 'hostProfile.accommodationOwnersBedroom',
};

function labelFor(t: (key: string) => string, map: Record<string, string>, value: string): string {
  const key = map[value];
  return key ? t(key) : value;
}

function ProfileVideoPitch({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: 220, borderRadius: 16 }}
      allowsFullscreen
      nativeControls
    />
  );
}

export default function PublicProfileScreen() {
  const { id, viewMode } = useLocalSearchParams<{ id: string; viewMode?: 'sitter' | 'host' }>();
  const router = useRouter();
  const viewer = useAuthStore((s) => s.user);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sitterProfile, setSitterProfile] = useState<SitterProfile | null>(null);
  const [hostProfile, setHostProfile] = useState<HostProfile | null>(null);
  const [reviews, setReviews] = useState<ReviewWithReviewer[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ average: 0, count: 0 });
  const [connected, setConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getProfile(id),
      getReviewsForUser(id),
      getReviewStats(id),
      viewMode === 'sitter' ? getSitterProfile(id) : Promise.resolve(null),
      viewMode === 'host' ? getHostProfile(id) : Promise.resolve(null),
      viewer ? isConnected(viewer.id, id) : Promise.resolve(false),
    ])
      .then(([p, r, s, sp, hp, isConn]) => {
        setProfile(p);
        setReviews(r);
        setStats(s);
        setSitterProfile(sp);
        setHostProfile(hp);
        setConnected(isConn);
      })
      .finally(() => setIsLoading(false));
  }, [id, viewMode, viewer]);

  const displayName = getDisplayName(profile?.full_name, connected);

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
          <Text style={{ color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>{t('profile.notFound')}</Text>
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
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('profile.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Header */}
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Avatar uri={profile.avatar_url} name={displayName} size={96} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 24, fontFamily: 'Nunito_700Bold', color: theme.text }}>
              {displayName || t('profile.userFallback')}
            </Text>
            {profile.id_verified && <MaterialIcons name="verified" size={20} color={theme.primary} />}
          </View>
          {stats.count > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <StarRating rating={stats.average} size={18} />
              <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_600SemiBold' }}>
                {stats.average.toFixed(1)} ({stats.count})
              </Text>
            </View>
          )}
          {profile.membership_tier === 'standard' && <Badge label={t('subscription.currentPlanPro')} variant="primary" />}
        </View>

        {/* Details */}
        {(profile.job || profile.birth_year || (profile.city && profile.country)) && (
          <Card>
            {profile.job && <DetailRow theme={theme} icon="work" label={profile.job} />}
            {profile.city && profile.country && <DetailRow theme={theme} icon="location-on" label={`${profile.city}, ${profile.country}`} />}
            {profile.birth_year && <DetailRow theme={theme} icon="cake" label={t('profile.yearsOld', { age: getAgeFromBirthYear(profile.birth_year) })} />}
          </Card>
        )}

        {/* Bio */}
        {profile.bio && (
          <View>
            <Text style={{ fontSize: 17, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 8 }}>{t('profile.about')}</Text>
            <Text style={{ fontSize: 15, color: theme.textMuted, fontFamily: 'Nunito_400Regular', lineHeight: 22 }}>
              {profile.bio}
            </Text>
          </View>
        )}

        {/* Own pets */}
        {profile.has_own_pets && (
          <View>
            <Text style={{ fontSize: 17, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 8 }}>{t('profile.ownPets')}</Text>
            <Text style={{ fontSize: 15, color: theme.textMuted, fontFamily: 'Nunito_400Regular', lineHeight: 22 }}>
              {profile.own_pets_description || t('profile.ownPetsYes')}
            </Text>
          </View>
        )}

        {/* Video pitch */}
        {profile.video_pitch_url && (
          <View>
            <Text style={{ fontSize: 17, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 8 }}>{t('videoPitch.title')}</Text>
            <ProfileVideoPitch uri={profile.video_pitch_url} />
          </View>
        )}

        {/* Photo gallery */}
        {profile.photos?.length > 0 && (
          <View>
            <Text style={{ fontSize: 17, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 8 }}>{t('profileEdit.gallery')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {profile.photos.map((uri) => (
                <Image key={uri} source={{ uri }} style={{ width: 96, height: 96, borderRadius: 14 }} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Animals cared */}
        {profile.animals_cared?.length > 0 && (
          <View>
            <Text style={{ fontSize: 17, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 8 }}>{t('profile.experienceWith')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {profile.animals_cared.map((a) => (
                <View key={a} style={{ flexDirection: 'row' }}><Badge label={labelFor(t, ANIMAL_LABEL_KEYS, a)} variant="neutral" /></View>
              ))}
            </View>
          </View>
        )}

        {/* Sitter-specific ("Kompetenz-Akte") */}
        {viewMode === 'sitter' && sitterProfile && (
          <Card>
            <Text style={{ fontSize: 17, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 10 }}>{t('sitterProfile.title')}</Text>
            {sitterProfile.experience_level && (
              <DetailRow theme={theme} icon="star" label={t(EXPERIENCE_LABEL_KEYS[sitterProfile.experience_level])} />
            )}
            {sitterProfile.mobility && (
              <DetailRow theme={theme} icon="directions-car" label={t(MOBILITY_LABEL_KEYS[sitterProfile.mobility])} />
            )}
            {sitterProfile.work_setup && (
              <DetailRow theme={theme} icon="work-outline" label={t(WORK_SETUP_LABEL_KEYS[sitterProfile.work_setup])} />
            )}
            {sitterProfile.experience_references && (
              <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginTop: 6, lineHeight: 20 }}>
                {sitterProfile.experience_references}
              </Text>
            )}
            {sitterProfile.special_skills.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {sitterProfile.special_skills.map((s) => (
                  <View key={s} style={{ flexDirection: 'row' }}><Badge label={labelFor(t, SKILL_LABEL_KEYS, s)} variant="secondary" /></View>
                ))}
              </View>
            )}
          </Card>
        )}

        {/* Host-specific ("Zuhause-Akte") */}
        {viewMode === 'host' && hostProfile && (
          <Card>
            <Text style={{ fontSize: 17, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 10 }}>{t('hostProfile.title')}</Text>
            {hostProfile.housing_type && (
              <DetailRow theme={theme} icon="home" label={t(HOUSING_LABEL_KEYS[hostProfile.housing_type])} />
            )}
            {hostProfile.sitter_accommodation && (
              <DetailRow theme={theme} icon="bed" label={t(ACCOMMODATION_LABEL_KEYS[hostProfile.sitter_accommodation])} />
            )}
            {hostProfile.environment_tags.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6, marginBottom: 6 }}>
                {hostProfile.environment_tags.map((tag) => (
                  <View key={tag} style={{ flexDirection: 'row' }}><Badge label={labelFor(t, ENV_LABEL_KEYS, tag)} variant="secondary" /></View>
                ))}
              </View>
            )}
            {hostProfile.house_rules && (
              <View style={{ marginTop: 6 }}>
                <Text style={{ fontSize: 12, color: theme.textSubtle, fontFamily: 'Nunito_700Bold', marginBottom: 2 }}>{t('hostProfile.houseRules')}</Text>
                <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular', lineHeight: 20 }}>{hostProfile.house_rules}</Text>
              </View>
            )}
            {hostProfile.garden_plants_notes && (
              <View style={{ marginTop: 10 }}>
                <Text style={{ fontSize: 12, color: theme.textSubtle, fontFamily: 'Nunito_700Bold', marginBottom: 2 }}>{t('hostProfile.gardenPlantsNotes')}</Text>
                <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular', lineHeight: 20 }}>{hostProfile.garden_plants_notes}</Text>
              </View>
            )}
          </Card>
        )}

        {/* Reviews */}
        <View>
          <Text style={{ fontSize: 17, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 8 }}>
            {stats.count > 0 ? t('profile.reviewsCount', { count: stats.count }) : t('profile.reviewsNoCount')}
          </Text>
          {reviews.length === 0 ? (
            <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>
              {t('profile.noReviews')}
            </Text>
          ) : (
            reviews.map((r) => (
              <Card key={r.id} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Avatar uri={r.reviewer?.avatar_url} name={r.reviewer?.full_name} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontFamily: 'Nunito_700Bold', color: theme.text }}>
                      {r.reviewer?.full_name ?? t('profile.userFallback')}
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
