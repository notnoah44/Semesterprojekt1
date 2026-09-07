import { useEffect, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { getSitterProfile, upsertSitterProfile, upsertProfile } from '@/lib/api/profiles';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/ChipGroup';
import type { ExperienceLevel, Mobility, WorkSetup } from '@/types/user';

const ANIMAL_OPTIONS = ['dogs', 'cats', 'rodents', 'reptiles', 'birds', 'horses', 'other'] as const;
const SKILL_OPTIONS = ['medication', 'seniorDogs', 'firstAid'] as const;

export default function SitterProfileScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const goBack = () => (returnTo ? router.replace(returnTo as any) : router.back());
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const theme = useAppTheme();
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel[]>([]);
  const [experienceReferences, setExperienceReferences] = useState('');
  const [animalsCared, setAnimalsCared] = useState<string[]>(user?.animals_cared ?? []);
  const [specialSkills, setSpecialSkills] = useState<string[]>([]);
  const [specialSkillsNotes, setSpecialSkillsNotes] = useState('');
  const [mobility, setMobility] = useState<Mobility[]>([]);
  const [workSetup, setWorkSetup] = useState<WorkSetup[]>([]);

  useEffect(() => {
    if (!user) return;
    getSitterProfile(user.id)
      .then((profile) => {
        if (profile) {
          setExperienceLevel(profile.experience_level ? [profile.experience_level] : []);
          setExperienceReferences(profile.experience_references ?? '');
          setSpecialSkills(profile.special_skills ?? []);
          setSpecialSkillsNotes(profile.special_skills_notes ?? '');
          setMobility(profile.mobility ? [profile.mobility] : []);
          setWorkSetup(profile.work_setup ? [profile.work_setup] : []);
        }
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await upsertProfile({ id: user.id, animals_cared: animalsCared });
      await upsertSitterProfile({
        profile_id: user.id,
        experience_level: experienceLevel[0] ?? null,
        experience_references: experienceReferences || null,
        special_skills: specialSkills,
        special_skills_notes: specialSkillsNotes || null,
        mobility: mobility[0] ?? null,
        work_setup: workSetup[0] ?? null,
      });
      setUser({ ...user, animals_cared: animalsCared });
      goBack();
    } catch {
      Alert.alert(t('errors.title'), t('sitterProfile.saveFailed'));
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
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('sitterProfile.title')}</Text>
        <Button label={t('common.save')} onPress={handleSave} loading={isSaving} size="sm" />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginBottom: 20, lineHeight: 19 }}>
            {t('sitterProfile.intro')}
          </Text>

          <ChipGroup
            label={t('sitterProfile.experienceLevel')}
            options={[
              { value: 'beginner', label: t('sitterProfile.experienceBeginner') },
              { value: 'advanced', label: t('sitterProfile.experienceAdvanced') },
              { value: 'expert', label: t('sitterProfile.experienceExpert') },
            ]}
            selected={experienceLevel}
            onChange={setExperienceLevel}
          />
          <Input
            label={t('sitterProfile.experienceReferences')}
            value={experienceReferences}
            onChangeText={setExperienceReferences}
            multiline
            numberOfLines={3}
            style={{ height: 90, textAlignVertical: 'top' }}
          />

          <ChipGroup
            label={t('sitterProfile.animalsCared')}
            options={ANIMAL_OPTIONS.map((v) => ({ value: v, label: t(`sitterProfile.animal_${v}`) }))}
            selected={animalsCared}
            onChange={setAnimalsCared}
            multiple
          />

          <ChipGroup
            label={t('sitterProfile.specialSkills')}
            options={SKILL_OPTIONS.map((v) => ({ value: v, label: t(`sitterProfile.skill_${v}`) }))}
            selected={specialSkills}
            onChange={setSpecialSkills}
            multiple
          />
          <Input
            label={t('sitterProfile.specialSkillsNotes')}
            value={specialSkillsNotes}
            onChangeText={setSpecialSkillsNotes}
            multiline
            numberOfLines={2}
            style={{ height: 70, textAlignVertical: 'top' }}
          />

          <ChipGroup
            label={t('sitterProfile.mobility')}
            options={[
              { value: 'own_car', label: t('sitterProfile.mobilityOwnCar') },
              { value: 'public_transport', label: t('sitterProfile.mobilityPublicTransport') },
            ]}
            selected={mobility}
            onChange={setMobility}
          />

          <ChipGroup
            label={t('sitterProfile.workSetup')}
            options={[
              { value: 'remote', label: t('sitterProfile.workRemote') },
              { value: 'away_daytime', label: t('sitterProfile.workAwayDaytime') },
              { value: 'flexible', label: t('sitterProfile.workFlexible') },
            ]}
            selected={workSetup}
            onChange={setWorkSetup}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
