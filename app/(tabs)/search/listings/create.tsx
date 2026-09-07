import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { RequireEmailVerified } from '@/components/auth/RequireEmailVerified';
import { RequireRoleProfile } from '@/components/auth/RequireRoleProfile';
import { upsertListing, getListing, uploadListingPhoto } from '@/lib/api/listings';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DateRangeField } from '@/components/ui/DateRangeField';
import { formatDate, toDateString } from '@/lib/utils/formatDate';

export default function CreateListingScreen() {
  return (
    <RequireAuth>
      <RequireEmailVerified>
        <RequireRoleProfile role="host">
          <CreateListingContent />
        </RequireRoleProfile>
      </RequireEmailVerified>
    </RequireAuth>
  );
}

function CreateListingContent() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const user = useAuthStore((s) => s.user);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const STEPS = [
    t('listingCreate.stepLocation'),
    t('listingCreate.stepResponsibilities'),
    t('listingCreate.stepDescription'),
    t('listingCreate.stepReview'),
  ];
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingListing, setIsLoadingListing] = useState(isEditing);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [availableFrom, setAvailableFrom] = useState<Date | null>(null);
  const [availableTo, setAvailableTo] = useState<Date | null>(null);
  const [hasPets, setHasPets] = useState(false);
  const [pets, setPets] = useState<{ type: string; name: string; special_needs?: string }[]>([]);
  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [responsibilityInput, setResponsibilityInput] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!id) return;
    getListing(id)
      .then((l) => {
        setTitle(l.title ?? '');
        setDescription(l.description ?? '');
        setCity(l.city ?? '');
        setCountry(l.country ?? '');
        setAvailableFrom(l.available_from ? new Date(l.available_from) : null);
        setAvailableTo(l.available_to ? new Date(l.available_to) : null);
        setHasPets(l.has_pets ?? false);
        setPets(l.pet_details ?? []);
        setResponsibilities(l.responsibilities ?? []);
        setPhotos(l.photos ?? []);
      })
      .catch(() => Alert.alert(t('errors.title'), t('listingCreate.loadFailed')))
      .finally(() => setIsLoadingListing(false));
  }, [id]);

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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (result.canceled) return;
    setIsUploading(true);
    try {
      const url = await uploadListingPhoto(user.id, result.assets[0].uri);
      setPhotos((prev) => [...prev, url]);
    } catch {
      Alert.alert(t('errors.title'), t('listingCreate.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (status: 'draft' | 'active' = 'active') => {
    if (!user) return;
    if (status === 'active' && !title.trim()) { Alert.alert(t('listingCreate.missingTitleAlert'), t('listingCreate.missingTitleMsg')); return; }
    if (status === 'active' && hasPets && (pets.length === 0 || pets.some(p => !p.type.trim() || !p.name.trim() || !p.special_needs?.trim()))) {
      Alert.alert(t('errors.title'), t('fixes.petsRequired')); setStep(1); return;
    }
    setIsLoading(true);
    try {
      await upsertListing({
        ...(id ? { id } : {}),
        owner_id: user.id,
        title: title.trim() || 'Entwurf',
        description: description.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        available_from: availableFrom ? toDateString(availableFrom) : undefined,
        available_to: availableTo ? toDateString(availableTo) : undefined,
        has_pets: hasPets,
        pet_details: hasPets ? pets : [],
        responsibilities,
        photos,
        status,
      });
      // Return to the search root after creating a listing so the role-specific
      // search view remains active. Editing still returns to the own-listings list.
      router.replace(isEditing ? '/(tabs)/search/listings/my-listings' : '/(tabs)/search');
    } catch {
      Alert.alert(t('errors.title'), t('listingCreate.saveFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const addResponsibility = () => {
    if (responsibilityInput.trim()) {
      setResponsibilities((prev) => [...prev, responsibilityInput.trim()]);
      setResponsibilityInput('');
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
          <Text style={{ fontSize: 18, fontFamily: 'Nunito_700Bold', color: theme.text }}>{isEditing ? t('listingCreate.editTitle') : t('listingCreate.newTitle')}</Text>
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

        {/* Step 0: Location */}
        {step === 0 && (
          <>
            <Text style={{ fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 16 }}>
              {t('listingCreate.homeLocation')}
            </Text>
            <Input label={t('listingCreate.listingTitleLabel')} value={title} onChangeText={setTitle} placeholder={t('listingCreate.listingTitlePlaceholder')} />
            <Input label={t('listingCreate.cityLabel')} value={city} onChangeText={setCity} placeholder={t('listingCreate.cityPlaceholder')} />
            <Input label={t('listingCreate.countryLabel')} value={country} onChangeText={setCountry} placeholder={t('listingCreate.countryPlaceholder')} />

            {/* Date range */}
            <DateRangeField
              theme={theme}
              label={t('listingCreate.availableDates')}
              from={availableFrom}
              to={availableTo}
              onChange={(from, to) => { setAvailableFrom(from); setAvailableTo(to); }}
            />
          </>
        )}

        {/* Step 1: Responsibilities */}
        {step === 1 && (
          <>
            <Text style={{ fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 16 }}>
              {t('listingCreate.stepResponsibilities')}
            </Text>

            {/* Pets toggle */}
            <TouchableOpacity
              onPress={() => setHasPets((p) => !p)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
                borderRadius: 16, borderWidth: 2,
                borderColor: hasPets ? theme.primary : theme.border,
                backgroundColor: hasPets ? theme.primaryContainer : theme.surface,
                marginBottom: 20,
              }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: hasPets ? theme.surface : theme.surfaceDim, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="paw" size={24} color={hasPets ? theme.primary : theme.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontFamily: 'Nunito_700Bold', color: hasPets ? theme.onPrimaryContainer : theme.text }}>
                  {t('listingCreate.hasPetsTitle')}
                </Text>
                <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>
                  {t('listingCreate.hasPetsDesc')}
                </Text>
              </View>
              <MaterialIcons name={hasPets ? 'check-circle' : 'radio-button-unchecked'} size={22} color={hasPets ? theme.primary : theme.borderMuted} />
            </TouchableOpacity>

            {hasPets && <View>
              <Text style={{ color: theme.text, marginBottom: 12 }}>{t('fixes.petCount', { count: pets.length })}</Text>
              {pets.map((pet, index) => <View key={index} style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 16, padding: 12, marginBottom: 12 }}>
                <Input label={t('fixes.petType')} value={pet.type} onChangeText={value => setPets(prev => prev.map((p, i) => i === index ? { ...p, type: value } : p))} />
                <Input label={t('fixes.petName')} value={pet.name} onChangeText={value => setPets(prev => prev.map((p, i) => i === index ? { ...p, name: value } : p))} />
                <Input label={t('fixes.petNeeds')} placeholder={t('fixes.petNeedsHint')} value={pet.special_needs} multiline onChangeText={value => setPets(prev => prev.map((p, i) => i === index ? { ...p, special_needs: value } : p))} />
                <TouchableOpacity onPress={() => setPets(prev => prev.filter((_, i) => i !== index))}><Text style={{ color: theme.error }}>{t('fixes.remove')}</Text></TouchableOpacity>
              </View>)}
              <Button label={t('fixes.addPet')} onPress={() => setPets(prev => [...prev, { type: '', name: '', special_needs: '' }])} />
            </View>}

            {/* Add responsibility */}
            <Text style={{ fontSize: 12, fontFamily: 'Nunito_700Bold', color: theme.textMuted, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>
              {t('listingCreate.tasksTitle')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Input
                  style={{ marginBottom: 0 }}
                  value={responsibilityInput}
                  onChangeText={setResponsibilityInput}
                  placeholder={t('listingCreate.taskPlaceholder')}
                  onSubmitEditing={addResponsibility}
                  returnKeyType="done"
                />
              </View>
              <TouchableOpacity
                onPress={addResponsibility}
                style={{ width: 48, height: 48, backgroundColor: theme.primary, borderRadius: 14, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', marginTop: 0 }}
              >
                <MaterialIcons name="add" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            {responsibilities.map((r, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary }} />
                <Text style={{ flex: 1, fontSize: 14, color: theme.text, fontFamily: 'Nunito_400Regular' }}>{r}</Text>
                <TouchableOpacity onPress={() => setResponsibilities((prev) => prev.filter((_, j) => j !== i))}>
                  <MaterialIcons name="close" size={18} color={theme.error} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* Step 2: Description */}
        {step === 2 && (
          <>
            <Text style={{ fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 16 }}>
              {t('listingCreate.stepDescription')}
            </Text>
            <Input
              label={t('listingCreate.describeHomeLabel')}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={8}
              style={{ height: 160, textAlignVertical: 'top' }}
              placeholder={t('listingCreate.describeHomePlaceholder')}
            />

            {/* Photos */}
            <Text style={{ fontSize: 12, fontFamily: 'Nunito_700Bold', color: theme.textMuted, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 8, marginBottom: 10 }}>
              {t('listingCreate.photosTitle')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
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
                disabled={isUploading}
                style={{ width: 100, height: 100, borderRadius: 14, borderWidth: 2, borderColor: theme.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceDim }}
              >
                {isUploading ? (
                  <ActivityIndicator color={theme.primary} />
                ) : (
                  <MaterialIcons name="add-a-photo" size={26} color={theme.textMuted} />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <>
            <Text style={{ fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 16 }}>
              {t('listingCreate.reviewPublish')}
            </Text>
            {[
              { label: t('listingCreate.reviewTitleLabel'), value: title || '—' },
              { label: t('listingCreate.cityLabel'), value: city || '—' },
              { label: t('listingCreate.countryLabel'), value: country || '—' },
              { label: t('common.from'), value: availableFrom ? formatDate(toDateString(availableFrom)) : '—' },
              { label: t('common.to'), value: availableTo ? formatDate(toDateString(availableTo)) : '—' },
              { label: t('search.petsLabel'), value: hasPets ? t('common.yes') : t('common.no') },
              ...(hasPets ? [{ label: t('listingDetail.petsTitle'), value: pets.map(p => `${p.name} (${p.type}): ${p.special_needs ?? ''}`).join('\n') }] : []),
              { label: t('listingCreate.tasksTitle'), value: responsibilities.length > 0 ? responsibilities.join(', ') : '—' },
            ].map(({ label, value }) => (
              <View key={label} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text style={{ width: 80, fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_600SemiBold' }}>{label}</Text>
                <Text style={{ flex: 1, fontSize: 14, color: theme.text, fontFamily: 'Nunito_400Regular' }}>{value}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface }}>
        {step < STEPS.length - 1 ? (
          <Button
            label={t('listingCreate.continueBtn')}
            onPress={() => setStep((s) => s + 1)}
            fullWidth
          />
        ) : (
          <Button
            label={isEditing ? t('listingCreate.saveChanges') : t('listingCreate.publishListing')}
            onPress={() => handleSave('active')}
            loading={isLoading}
            fullWidth
          />
        )}
      </View>
    </SafeAreaView>
  );
}
