import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { RequireRoleProfile } from '@/components/auth/RequireRoleProfile';
import { upsertSitterListing, getSitterListing, uploadSitterListingPhoto } from '@/lib/api/sitterListings';
import { getTravelCompanions, upsertTravelCompanion } from '@/lib/api/profiles';
import { firstNameOf } from '@/lib/api/connections';
import { getAgeFromBirthYear } from '@/lib/utils/age';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { DateRangeField } from '@/components/ui/DateRangeField';
import { PlaceAutocomplete } from '@/components/ui/PlaceAutocomplete';
import { formatDate, formatDateRange, toDateString } from '@/lib/utils/formatDate';
import type { AvailabilityPeriod, LocationPreference, OwnPetDetails, PetSitting } from '@/types/sitterListing';
import type { CompanionRelation, TravelCompanion } from '@/types/user';

const RELATIONS: CompanionRelation[] = ['partner', 'friend', 'family', 'child'];
const RELATION_KEY: Record<CompanionRelation, string> = {
  partner: 'travelCompanion.relationPartner',
  friend: 'travelCompanion.relationFriend',
  family: 'travelCompanion.relationFamily',
  child: 'travelCompanion.relationChild',
};

function buildTitle(profile: { full_name: string | null; birth_year: number | null; city: string | null }) {
  const firstName = firstNameOf(profile.full_name);
  const age = getAgeFromBirthYear(profile.birth_year);
  return [firstName, age ? String(age) : null, profile.city].filter(Boolean).join(', ');
}

export default function CreateSitterListingScreen() {
  return (
    <RequireAuth>
      <RequireRoleProfile role="sitter">
        <CreateSitterListingContent />
      </RequireRoleProfile>
    </RequireAuth>
  );
}

function CreateSitterListingContent() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const user = useAuthStore((s) => s.user);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const STEPS = [
    t('sitterListingCreate.stepAvailabilityLocation'),
    t('sitterListingCreate.stepPetPreferences'),
    t('sitterListingCreate.stepCompanionsDescription'),
    t('sitterListingCreate.stepPhotosReview'),
  ];
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingListing, setIsLoadingListing] = useState(isEditing);

  // Step 0
  const [periods, setPeriods] = useState<AvailabilityPeriod[]>([]);
  const [newFrom, setNewFrom] = useState<Date | null>(null);
  const [newTo, setNewTo] = useState<Date | null>(null);
  const [locations, setLocations] = useState<LocationPreference[]>([]);

  // Step 1
  const [petSitting, setPetSitting] = useState<PetSitting>('both');
  const [bringsOwnPet, setBringsOwnPet] = useState(false);
  const [ownPets, setOwnPets] = useState<OwnPetDetails[]>([]);
  const [newPetType, setNewPetType] = useState('');
  const [newPetCount, setNewPetCount] = useState('1');
  const [maxAloneHours, setMaxAloneHours] = useState('');

  // Step 2
  const [companions, setCompanions] = useState<TravelCompanion[]>([]);
  const [selectedCompanionIds, setSelectedCompanionIds] = useState<string[]>([]);
  const [showAddCompanion, setShowAddCompanion] = useState(false);
  const [newCompanionName, setNewCompanionName] = useState('');
  const [newCompanionAge, setNewCompanionAge] = useState('');
  const [newCompanionRelation, setNewCompanionRelation] = useState<CompanionRelation>('partner');
  const [description, setDescription] = useState('');

  // Step 3
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const loadCompanions = useCallback(() => {
    if (!user) return;
    getTravelCompanions(user.id).then(setCompanions).catch(() => {});
  }, [user]);

  useEffect(() => { loadCompanions(); }, [loadCompanions]);

  useEffect(() => {
    if (!id) return;
    getSitterListing(id)
      .then((l) => {
        setPeriods(l.availability_periods ?? []);
        setLocations(l.locations ?? []);
        setPetSitting(l.pet_sitting ?? 'both');
        setBringsOwnPet(l.brings_own_pet ?? false);
        setOwnPets(l.own_pet_details ?? []);
        setMaxAloneHours(l.max_alone_hours ? String(l.max_alone_hours) : '');
        setSelectedCompanionIds(l.companion_ids ?? []);
        setDescription(l.description ?? '');
        setCoverPhoto(l.cover_photo ?? null);
        setPhotos(l.photos ?? []);
      })
      .catch(() => Alert.alert(t('errors.title'), t('sitterListingCreate.loadFailed')))
      .finally(() => setIsLoadingListing(false));
  }, [id]);

  const addPeriod = () => {
    if (!newFrom || !newTo) return;
    setPeriods((prev) => [...prev, { from: toDateString(newFrom), to: toDateString(newTo) }]);
    setNewFrom(null);
    setNewTo(null);
  };

  const addLocation = (place: { city: string; country: string }) => {
    const exists = locations.some((l) => l.city === place.city && l.country === place.country);
    if (exists) return;
    setLocations((prev) => [...prev, place]);
  };

  const addOwnPet = () => {
    if (!newPetType.trim()) return;
    const count = Math.max(1, parseInt(newPetCount, 10) || 1);
    setOwnPets((prev) => [...prev, { type: newPetType.trim(), count }]);
    setNewPetType('');
    setNewPetCount('1');
  };

  const toggleCompanion = (companionId: string) => {
    setSelectedCompanionIds((prev) =>
      prev.includes(companionId) ? prev.filter((cid) => cid !== companionId) : [...prev, companionId]
    );
  };

  const handleAddCompanion = async () => {
    if (!user || !newCompanionName.trim()) return;
    try {
      const companion = await upsertTravelCompanion({
        profile_id: user.id,
        name: newCompanionName.trim(),
        age: newCompanionAge ? parseInt(newCompanionAge, 10) : null,
        relation: newCompanionRelation,
      });
      setCompanions((prev) => [...prev, companion]);
      setSelectedCompanionIds((prev) => [...prev, companion.id]);
      setNewCompanionName('');
      setNewCompanionAge('');
      setShowAddCompanion(false);
    } catch {
      Alert.alert(t('errors.title'), t('sitterListingCreate.saveFailed'));
    }
  };

  const handlePickCover = async () => {
    if (!user) return;
    const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      if (!canAskAgain) {
        Alert.alert(t('listingCreate.permissionNeededTitle'), t('listingCreate.permissionNeededMsg'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('profileEdit.openSettings'), onPress: () => Linking.openSettings() },
        ]);
      } else {
        Alert.alert(t('listingCreate.permissionNeededTitle'), t('listingCreate.permissionNeededMsg'));
      }
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled) return;
    setIsUploadingCover(true);
    try {
      const url = await uploadSitterListingPhoto(user.id, result.assets[0].uri);
      setCoverPhoto(url);
    } catch {
      Alert.alert(t('errors.title'), t('listingCreate.uploadFailed'));
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handlePickPhoto = async () => {
    if (!user) return;
    const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      if (!canAskAgain) {
        Alert.alert(t('listingCreate.permissionNeededTitle'), t('listingCreate.permissionNeededMsg'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('profileEdit.openSettings'), onPress: () => Linking.openSettings() },
        ]);
      } else {
        Alert.alert(t('listingCreate.permissionNeededTitle'), t('listingCreate.permissionNeededMsg'));
      }
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (result.canceled) return;
    setIsUploadingPhoto(true);
    try {
      const url = await uploadSitterListingPhoto(user.id, result.assets[0].uri);
      setPhotos((prev) => [...prev, url]);
    } catch {
      Alert.alert(t('errors.title'), t('listingCreate.uploadFailed'));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async (status: 'draft' | 'active' = 'active') => {
    if (!user) return;
    setIsLoading(true);
    try {
      await upsertSitterListing({
        ...(id ? { id } : {}),
        sitter_id: user.id,
        title: buildTitle(user),
        description: description.trim() || undefined,
        availability_periods: periods,
        locations,
        pet_sitting: petSitting,
        companion_ids: selectedCompanionIds,
        brings_own_pet: bringsOwnPet,
        own_pet_details: bringsOwnPet ? ownPets : [],
        max_alone_hours: maxAloneHours ? parseInt(maxAloneHours, 10) : undefined,
        cover_photo: coverPhoto,
        photos,
        status,
      });
      router.replace(isEditing ? '/(tabs)/search/sitter-listings/my-listings' : '/(tabs)/home');
    } catch {
      Alert.alert(t('errors.title'), t('sitterListingCreate.saveFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingListing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => (step === 0 ? router.back() : setStep((s) => s - 1))}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontFamily: 'Nunito_700Bold', color: theme.text }}>
            {isEditing ? t('sitterListingCreate.editTitle') : t('sitterListingCreate.newTitle')}
          </Text>
          <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>
            {t('listingCreate.stepIndicator', { current: step + 1, total: STEPS.length, stepName: STEPS[step] })}
          </Text>
        </View>
        <TouchableOpacity onPress={() => handleSave('draft')}>
          <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_600SemiBold' }}>{t('listingCreate.saveDraft')}</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 6 }}>
        {STEPS.map((_, i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? theme.primary : theme.border }} />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 4 }} keyboardShouldPersistTaps="handled">

        {/* Step 0: Availability & Locations */}
        {step === 0 && (
          <>
            <Text style={{ fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 16 }}>
              {t('sitterListingCreate.stepAvailabilityLocation')}
            </Text>

            <SectionLabel theme={theme} label={t('sitterListingCreate.availabilityTitle')} />
            {periods.length === 0 && (
              <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginBottom: 10 }}>
                {t('sitterListingCreate.noPeriods')}
              </Text>
            )}
            {periods.map((p, i) => (
              <ListRow key={i} theme={theme} text={formatDateRange(p.from, p.to)} onRemove={() => setPeriods((prev) => prev.filter((_, j) => j !== i))} />
            ))}
            <DateRangeField theme={theme} from={newFrom} to={newTo} onChange={(from, to) => { setNewFrom(from); setNewTo(to); }} />
            <AddButton theme={theme} label={t('sitterListingCreate.addPeriod')} onPress={addPeriod} disabled={!newFrom || !newTo} />

            <SectionLabel theme={theme} label={t('sitterListingCreate.locationsTitle')} style={{ marginTop: 20 }} />
            {locations.length === 0 && (
              <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginBottom: 10 }}>
                {t('sitterListingCreate.noLocations')}
              </Text>
            )}
            {locations.map((l, i) => (
              <ListRow key={i} theme={theme} text={[l.city, l.country].filter(Boolean).join(', ')} onRemove={() => setLocations((prev) => prev.filter((_, j) => j !== i))} />
            ))}
            <PlaceAutocomplete theme={theme} placeholder={t('sitterListingCreate.locationSearchPlaceholder')} onSelect={addLocation} />
          </>
        )}

        {/* Step 1: Pet Preferences */}
        {step === 1 && (
          <>
            <Text style={{ fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 16 }}>
              {t('sitterListingCreate.stepPetPreferences')}
            </Text>

            <SectionLabel theme={theme} label={t('sitterListingCreate.petSittingTitle')} />
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {(['with_pet', 'without_pet', 'both'] as PetSitting[]).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setPetSitting(opt)}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center',
                    backgroundColor: petSitting === opt ? theme.primaryContainer : theme.surfaceDim,
                    borderWidth: 1, borderColor: petSitting === opt ? theme.primary : theme.border,
                  }}
                >
                  <Text style={{ fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: petSitting === opt ? theme.onPrimaryContainer : theme.textMuted }}>
                    {t(`sitterListingCreate.petSitting${opt === 'with_pet' ? 'With' : opt === 'without_pet' ? 'Without' : 'Both'}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => setBringsOwnPet((p) => !p)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
                borderRadius: 16, borderWidth: 2,
                borderColor: bringsOwnPet ? theme.primary : theme.border,
                backgroundColor: bringsOwnPet ? theme.primaryContainer : theme.surface,
                marginBottom: 20,
              }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: bringsOwnPet ? theme.surface : theme.surfaceDim, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="paw" size={24} color={bringsOwnPet ? theme.primary : theme.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontFamily: 'Nunito_700Bold', color: bringsOwnPet ? theme.onPrimaryContainer : theme.text }}>
                  {t('sitterListingCreate.bringsOwnPetTitle')}
                </Text>
                <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>
                  {t('sitterListingCreate.bringsOwnPetDesc')}
                </Text>
              </View>
              <MaterialIcons name={bringsOwnPet ? 'check-circle' : 'radio-button-unchecked'} size={22} color={bringsOwnPet ? theme.primary : theme.borderMuted} />
            </TouchableOpacity>

            {bringsOwnPet && (
              <>
                {ownPets.length === 0 && (
                  <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginBottom: 10 }}>
                    {t('sitterListingCreate.noOwnPets')}
                  </Text>
                )}
                {ownPets.map((p, i) => (
                  <ListRow key={i} theme={theme} text={`${p.type} × ${p.count}`} onRemove={() => setOwnPets((prev) => prev.filter((_, j) => j !== i))} />
                ))}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 2 }}>
                    <Input value={newPetType} onChangeText={setNewPetType} placeholder={t('sitterListingCreate.ownPetTypePlaceholder')} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label="" value={newPetCount} onChangeText={setNewPetCount} keyboardType="number-pad" placeholder={t('sitterListingCreate.ownPetCountLabel')} />
                  </View>
                </View>
                <AddButton theme={theme} label={t('sitterListingCreate.addOwnPet')} onPress={addOwnPet} disabled={!newPetType.trim()} />
              </>
            )}

            <Input
              label={t('sitterListingCreate.maxAloneHoursLabel')}
              value={maxAloneHours}
              onChangeText={setMaxAloneHours}
              keyboardType="number-pad"
              placeholder={t('sitterListingCreate.maxAloneHoursPlaceholder')}
              style={{ marginTop: 8 }}
            />
          </>
        )}

        {/* Step 2: Companions & Description */}
        {step === 2 && (
          <>
            <Text style={{ fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 16 }}>
              {t('sitterListingCreate.stepCompanionsDescription')}
            </Text>

            <SectionLabel theme={theme} label={t('sitterListingCreate.companionsTitle')} />
            {companions.length === 0 && !showAddCompanion && (
              <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginBottom: 10 }}>
                {t('sitterListingCreate.companionsEmpty')}
              </Text>
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {companions.map((c) => {
                const selected = selectedCompanionIds.includes(c.id);
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => toggleCompanion(c.id)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99,
                      backgroundColor: selected ? theme.primaryContainer : theme.surfaceDim,
                      borderWidth: 1, borderColor: selected ? theme.primary : theme.border,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: selected ? theme.onPrimaryContainer : theme.textMuted }}>
                      {c.name}{c.relation ? ` · ${t(RELATION_KEY[c.relation])}` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {showAddCompanion ? (
              <View style={{ marginBottom: 16 }}>
                <Input value={newCompanionName} onChangeText={setNewCompanionName} placeholder={t('sitterListingCreate.companionNamePlaceholder')} />
                <Input value={newCompanionAge} onChangeText={setNewCompanionAge} keyboardType="number-pad" placeholder={t('sitterListingCreate.companionAgePlaceholder')} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {RELATIONS.map((rel) => (
                    <TouchableOpacity
                      key={rel}
                      onPress={() => setNewCompanionRelation(rel)}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
                        backgroundColor: newCompanionRelation === rel ? theme.primaryContainer : theme.surfaceDim,
                        borderWidth: 1, borderColor: newCompanionRelation === rel ? theme.primary : theme.border,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: newCompanionRelation === rel ? theme.onPrimaryContainer : theme.textMuted }}>
                        {t(RELATION_KEY[rel])}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Button label={t('sitterListingCreate.addCompanionBtn')} onPress={handleAddCompanion} variant="tonal" size="sm" disabled={!newCompanionName.trim()} />
              </View>
            ) : (
              <AddButton theme={theme} label={t('sitterListingCreate.addCompanionBtn')} onPress={() => setShowAddCompanion(true)} />
            )}

            <Input
              label={t('sitterListingCreate.descriptionLabel')}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={8}
              style={{ height: 160, textAlignVertical: 'top', marginTop: 12 }}
              placeholder={t('sitterListingCreate.descriptionPlaceholder')}
            />
          </>
        )}

        {/* Step 3: Photos & Review */}
        {step === 3 && (
          <>
            <Text style={{ fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 16 }}>
              {t('sitterListingCreate.stepPhotosReview')}
            </Text>

            <SectionLabel theme={theme} label={t('sitterListingCreate.coverPhotoTitle')} />
            <TouchableOpacity onPress={handlePickCover} disabled={isUploadingCover} style={{ marginBottom: 6 }}>
              {coverPhoto ? (
                <Image source={{ uri: coverPhoto }} style={{ width: 96, height: 96, borderRadius: 48 }} />
              ) : (
                <Avatar uri={user?.avatar_url} name={user?.full_name} size={96} />
              )}
              <View style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.background }}>
                {isUploadingCover ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name="add-a-photo" size={15} color="#fff" />}
              </View>
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginBottom: 20 }}>
              {t('sitterListingCreate.coverPhotoHint')}
            </Text>

            <SectionLabel theme={theme} label={t('listingCreate.photosTitle')} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
              {photos.map((uri, i) => (
                <View key={uri} style={{ width: 100, height: 100, borderRadius: 14, overflow: 'hidden' }}>
                  <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
                  <TouchableOpacity
                    onPress={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                    style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <MaterialIcons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                onPress={handlePickPhoto}
                disabled={isUploadingPhoto}
                style={{ width: 100, height: 100, borderRadius: 14, borderWidth: 2, borderColor: theme.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceDim }}
              >
                {isUploadingPhoto ? <ActivityIndicator color={theme.primary} /> : <MaterialIcons name="add-a-photo" size={26} color={theme.textMuted} />}
              </TouchableOpacity>
            </View>

            <SectionLabel theme={theme} label={t('listingCreate.reviewPublish')} />
            {[
              { label: t('sitterListingCreate.reviewHeadlineLabel'), value: user ? buildTitle(user) : '—' },
              { label: t('sitterListingCreate.reviewAvailabilityLabel'), value: periods.length > 0 ? periods.map((p) => formatDateRange(p.from, p.to)).join(' · ') : '—' },
              { label: t('sitterListingCreate.reviewLocationsLabel'), value: locations.length > 0 ? locations.map((l) => [l.city, l.country].filter(Boolean).join(', ')).join(' · ') : '—' },
              { label: t('sitterListingCreate.reviewPetSittingLabel'), value: t(`sitterListingCreate.petSitting${petSitting === 'with_pet' ? 'With' : petSitting === 'without_pet' ? 'Without' : 'Both'}`) },
              { label: t('sitterListingCreate.reviewMaxAloneLabel'), value: maxAloneHours || '—' },
              { label: t('sitterListingCreate.reviewCompanionsLabel'), value: companions.filter((c) => selectedCompanionIds.includes(c.id)).map((c) => c.name).join(', ') || '—' },
            ].map(({ label, value }) => (
              <View key={label} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text style={{ width: 120, fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_600SemiBold' }}>{label}</Text>
                <Text style={{ flex: 1, fontSize: 14, color: theme.text, fontFamily: 'Nunito_400Regular' }}>{value}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface }}>
        {step < STEPS.length - 1 ? (
          <Button label={t('listingCreate.continueBtn')} onPress={() => setStep((s) => s + 1)} fullWidth />
        ) : (
          <Button
            label={isEditing ? t('listingCreate.saveChanges') : t('sitterListingCreate.publishListing')}
            onPress={() => handleSave('active')}
            loading={isLoading}
            fullWidth
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function SectionLabel({ theme, label, style }: { theme: any; label: string; style?: object }) {
  return (
    <Text style={[{ fontSize: 12, fontFamily: 'Nunito_700Bold', color: theme.textMuted, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }, style]}>
      {label}
    </Text>
  );
}

function ListRow({ theme, text, onRemove }: { theme: any; text: string; onRemove: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary }} />
      <Text style={{ flex: 1, fontSize: 14, color: theme.text, fontFamily: 'Nunito_400Regular' }}>{text}</Text>
      <TouchableOpacity onPress={onRemove}>
        <MaterialIcons name="close" size={18} color={theme.error} />
      </TouchableOpacity>
    </View>
  );
}

function AddButton({ theme, label, onPress, disabled }: { theme: any; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{ alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: theme.surfaceDim, marginBottom: 16, opacity: disabled ? 0.5 : 1 }}
    >
      <Text style={{ fontSize: 13, fontFamily: 'Nunito_600SemiBold', color: theme.primary }}>{label}</Text>
    </TouchableOpacity>
  );
}
