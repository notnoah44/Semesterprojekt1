import { useEffect, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { getHostProfile, upsertHostProfile } from '@/lib/api/profiles';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/ChipGroup';
import type { HousingType, SitterAccommodation } from '@/types/user';

const ENVIRONMENT_OPTIONS = ['quietRural', 'cityCenter', 'nearForest', 'nonSmoking'] as const;

export default function HostProfileScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const goBack = () => (returnTo ? router.replace(returnTo as any) : router.back());
  const user = useAuthStore((s) => s.user);
  const theme = useAppTheme();
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [housingType, setHousingType] = useState<HousingType[]>([]);
  const [environmentTags, setEnvironmentTags] = useState<string[]>([]);
  const [houseRules, setHouseRules] = useState('');
  const [gardenPlantsNotes, setGardenPlantsNotes] = useState('');
  const [sitterAccommodation, setSitterAccommodation] = useState<SitterAccommodation[]>([]);

  useEffect(() => {
    if (!user) return;
    getHostProfile(user.id)
      .then((profile) => {
        if (profile) {
          setHousingType(profile.housing_type ? [profile.housing_type] : []);
          setEnvironmentTags(profile.environment_tags ?? []);
          setHouseRules(profile.house_rules ?? '');
          setGardenPlantsNotes(profile.garden_plants_notes ?? '');
          setSitterAccommodation(profile.sitter_accommodation ? [profile.sitter_accommodation] : []);
        }
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await upsertHostProfile({
        profile_id: user.id,
        housing_type: housingType[0] ?? null,
        environment_tags: environmentTags,
        house_rules: houseRules || null,
        garden_plants_notes: gardenPlantsNotes || null,
        sitter_accommodation: sitterAccommodation[0] ?? null,
      });
      goBack();
    } catch {
      Alert.alert(t('errors.title'), t('hostProfile.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={goBack}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('hostProfile.title')}</Text>
        <Button label={t('common.save')} onPress={handleSave} loading={isSaving} size="sm" />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginBottom: 20, lineHeight: 19 }}>
            {t('hostProfile.intro')}
          </Text>

          <ChipGroup
            label={t('hostProfile.housingType')}
            options={[
              { value: 'house', label: t('hostProfile.housingHouse') },
              { value: 'apartment', label: t('hostProfile.housingApartment') },
              { value: 'farmhouse', label: t('hostProfile.housingFarmhouse') },
            ]}
            selected={housingType}
            onChange={setHousingType}
          />

          <ChipGroup
            label={t('hostProfile.environmentTags')}
            options={ENVIRONMENT_OPTIONS.map((v) => ({ value: v, label: t(`hostProfile.env_${v}`) }))}
            selected={environmentTags}
            onChange={setEnvironmentTags}
            multiple
          />

          <Input
            label={t('hostProfile.houseRules')}
            value={houseRules}
            onChangeText={setHouseRules}
            placeholder={t('hostProfile.houseRulesPlaceholder')}
            multiline
            numberOfLines={3}
            style={{ height: 90, textAlignVertical: 'top' }}
          />

          <Input
            label={t('hostProfile.gardenPlantsNotes')}
            value={gardenPlantsNotes}
            onChangeText={setGardenPlantsNotes}
            placeholder={t('hostProfile.gardenPlantsNotesPlaceholder')}
            multiline
            numberOfLines={3}
            style={{ height: 90, textAlignVertical: 'top' }}
          />

          <ChipGroup
            label={t('hostProfile.sitterAccommodation')}
            options={[
              { value: 'guest_room', label: t('hostProfile.accommodationGuestRoom') },
              { value: 'own_bathroom', label: t('hostProfile.accommodationOwnBathroom') },
              { value: 'owners_bedroom', label: t('hostProfile.accommodationOwnersBedroom') },
            ]}
            selected={sitterAccommodation}
            onChange={setSitterAccommodation}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
