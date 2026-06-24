import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Platform, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/stores/authStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { upsertListing, getListing, uploadListingPhoto } from '@/lib/api/listings';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatDate, toDateString } from '@/lib/utils/formatDate';

const STEPS = ['Location', 'Responsibilities', 'Description', 'Review'];

export default function CreateListingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const user = useAuthStore((s) => s.user);
  const theme = useAppTheme();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingListing, setIsLoadingListing] = useState(isEditing);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [availableFrom, setAvailableFrom] = useState<Date | null>(null);
  const [availableTo, setAvailableTo] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [hasPets, setHasPets] = useState(false);
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
        setAddress(l.address ?? '');
        setCity(l.city ?? '');
        setCountry(l.country ?? '');
        setAvailableFrom(l.available_from ? new Date(l.available_from) : null);
        setAvailableTo(l.available_to ? new Date(l.available_to) : null);
        setHasPets(l.has_pets ?? false);
        setResponsibilities(l.responsibilities ?? []);
        setPhotos(l.photos ?? []);
      })
      .catch(() => Alert.alert('Error', 'Could not load this listing.'))
      .finally(() => setIsLoadingListing(false));
  }, [id]);

  const handlePickPhoto = async () => {
    if (!user) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow photo access to add images.'); return; }
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
      Alert.alert('Error', 'Failed to upload photo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (status: 'draft' | 'active' = 'active') => {
    if (!user) return;
    if (!title.trim()) { Alert.alert('Missing info', 'Please add a title.'); return; }
    setIsLoading(true);
    try {
      await upsertListing({
        ...(id ? { id } : {}),
        owner_id: user.id,
        title: title.trim(),
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        available_from: availableFrom ? toDateString(availableFrom) : undefined,
        available_to: availableTo ? toDateString(availableTo) : undefined,
        has_pets: hasPets,
        responsibilities,
        photos,
        status,
      });
      router.replace(isEditing ? '/listings/my-listings' : '/(tabs)/home');
    } catch {
      Alert.alert('Error', 'Failed to save listing');
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
          <Text style={{ fontSize: 18, fontFamily: 'Nunito_700Bold', color: theme.text }}>{isEditing ? 'Edit Listing' : 'New Listing'}</Text>
          <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </Text>
        </View>
        <TouchableOpacity onPress={() => handleSave('draft')}>
          <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_600SemiBold' }}>Save Draft</Text>
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
              Home & Location
            </Text>
            <Input label="Listing Title" value={title} onChangeText={setTitle} placeholder="Beautiful apartment in Munich" />
            <Input label="Address" value={address} onChangeText={setAddress} placeholder="Musterstraße 1" />
            <Input label="City" value={city} onChangeText={setCity} placeholder="Munich" />
            <Input label="Country" value={country} onChangeText={setCountry} placeholder="Germany" />

            {/* Date pickers */}
            <Text style={{ fontSize: 12, fontFamily: 'Nunito_700Bold', color: theme.textMuted, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>
              Available Dates
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <DatePickerField label="From" value={availableFrom} theme={theme} onPress={() => setShowFromPicker(true)} />
              <DatePickerField label="To" value={availableTo} theme={theme} onPress={() => setShowToPicker(true)} />
            </View>
            {showFromPicker && (
              <DateTimePicker
                value={availableFrom ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => { setShowFromPicker(Platform.OS === 'ios'); if (date) setAvailableFrom(date); }}
              />
            )}
            {showToPicker && (
              <DateTimePicker
                value={availableTo ?? availableFrom ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => { setShowToPicker(Platform.OS === 'ios'); if (date) setAvailableTo(date); }}
              />
            )}
          </>
        )}

        {/* Step 1: Responsibilities */}
        {step === 1 && (
          <>
            <Text style={{ fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 16 }}>
              Responsibilities
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
                  There are pets
                </Text>
                <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>
                  The sitter will need to care for animals
                </Text>
              </View>
              <MaterialIcons name={hasPets ? 'check-circle' : 'radio-button-unchecked'} size={22} color={hasPets ? theme.primary : theme.borderMuted} />
            </TouchableOpacity>

            {/* Add responsibility */}
            <Text style={{ fontSize: 12, fontFamily: 'Nunito_700Bold', color: theme.textMuted, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>
              Tasks
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Input
                  style={{ marginBottom: 0 }}
                  value={responsibilityInput}
                  onChangeText={setResponsibilityInput}
                  placeholder="e.g. Water plants, take mail"
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
              Description
            </Text>
            <Input
              label="Describe your home"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={8}
              style={{ height: 160, textAlignVertical: 'top' }}
              placeholder="Tell sitters about your home, the neighbourhood, and what makes it special…"
            />

            {/* Photos */}
            <Text style={{ fontSize: 12, fontFamily: 'Nunito_700Bold', color: theme.textMuted, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 8, marginBottom: 10 }}>
              Photos
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
              Review & Publish
            </Text>
            {[
              { label: 'Title', value: title || '—' },
              { label: 'City', value: city || '—' },
              { label: 'Country', value: country || '—' },
              { label: 'From', value: availableFrom ? formatDate(toDateString(availableFrom)) : '—' },
              { label: 'To', value: availableTo ? formatDate(toDateString(availableTo)) : '—' },
              { label: 'Pets', value: hasPets ? 'Yes' : 'No' },
              { label: 'Tasks', value: responsibilities.length > 0 ? responsibilities.join(', ') : '—' },
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
            label="Continue"
            onPress={() => setStep((s) => s + 1)}
            fullWidth
          />
        ) : (
          <Button
            label={isEditing ? 'Save Changes' : 'Publish Listing'}
            onPress={() => handleSave('active')}
            loading={isLoading}
            fullWidth
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function DatePickerField({ label, value, theme, onPress }: { label: string; value: Date | null; theme: any; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flex: 1, backgroundColor: theme.surfaceVariant, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: theme.border }}
    >
      <Text style={{ fontSize: 11, fontFamily: 'Nunito_700Bold', color: theme.textSubtle, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <MaterialIcons name="event" size={15} color={value ? theme.primary : theme.textMuted} />
        <Text style={{ fontSize: 14, fontFamily: 'Nunito_600SemiBold', color: value ? theme.text : theme.textSubtle }}>
          {value ? formatDate(toDateString(value)) : 'Select'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
