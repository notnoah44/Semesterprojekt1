import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Alert, Image, Switch, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { upsertProfile, uploadProfilePhoto, MIN_BIO_LENGTH } from '@/lib/api/profiles';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function EditProfileScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const goBack = () => (returnTo ? router.replace(returnTo as any) : router.back());
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const theme = useAppTheme();
  const { t } = useTranslation();

  const [birthYear, setBirthYear] = useState(user?.birth_year?.toString() ?? '');
  const [job, setJob] = useState(user?.job ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [country, setCountry] = useState(user?.country ?? '');
  const [hasOwnPets, setHasOwnPets] = useState(user?.has_own_pets ?? false);
  const [ownPetsDescription, setOwnPetsDescription] = useState(user?.own_pets_description ?? '');
  const [photos, setPhotos] = useState<string[]>(user?.photos ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const updated = await upsertProfile({
        id: user.id,
        birth_year: birthYear ? parseInt(birthYear, 10) : undefined,
        job: job || undefined,
        bio: bio || undefined,
        city: city || undefined,
        country: country || undefined,
        has_own_pets: hasOwnPets,
        own_pets_description: hasOwnPets ? (ownPetsDescription || undefined) : null,
        photos,
      });
      setUser(updated);
      goBack();
    } catch (e) {
      console.error('[profile/edit] save failed:', e);
      const detail = e instanceof Error ? e.message : undefined;
      Alert.alert(t('errors.title'), detail ? `${t('profileEdit.saveFailed')}\n\n${detail}` : t('profileEdit.saveFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const requestPhotoAccess = async () => {
    const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status === 'granted') return true;
    if (!canAskAgain) {
      Alert.alert(t('errors.title'), t('profileEdit.photoPermissionDenied'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('profileEdit.openSettings'), onPress: () => Linking.openSettings() },
      ]);
    } else {
      Alert.alert(t('errors.title'), t('profileEdit.photoPermissionDenied'));
    }
    return false;
  };

  const handleAddPhoto = async () => {
    if (!user) return;
    if (!(await requestPhotoAccess())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    setIsUploadingPhoto(true);
    try {
      const url = await uploadProfilePhoto(user.id, result.assets[0].uri);
      setPhotos((prev) => [...prev, url]);
    } catch (e) {
      console.error('[profile/edit] gallery photo upload failed:', e);
      Alert.alert(t('errors.title'), t('profileEdit.photoUploadFailed'));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePickAvatar = async () => {
    if (!(await requestPhotoAccess())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !user) return;

    try {
      const uri = result.assets[0].uri;
      const ext = uri.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;

      const arrayBuffer = await new File(uri).arrayBuffer();

      const { error } = await supabase.storage.from('avatars').upload(path, arrayBuffer, {
        contentType: `image/${ext}`,
        upsert: true,
      });
      if (error) throw error;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const updated = await upsertProfile({ id: user.id, avatar_url: data.publicUrl });
      setUser(updated);
    } catch (e) {
      console.error('[profile/edit] avatar upload failed:', e);
      Alert.alert(t('errors.title'), t('profileEdit.photoUploadFailed'));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={goBack}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('profileEdit.title')}</Text>
        <Button label={t('common.save')} onPress={handleSave} loading={isLoading} size="sm" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Avatar */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View style={{ position: 'relative' }}>
            <Avatar uri={user?.avatar_url} name={user?.full_name} size={96} />
            <TouchableOpacity
              onPress={handlePickAvatar}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                backgroundColor: theme.primary, borderRadius: 99,
                width: 30, height: 30, alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: theme.surface,
              }}
            >
              <MaterialIcons name="camera-alt" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <Input label={t('profileEdit.birthYear')} value={birthYear} onChangeText={setBirthYear} keyboardType="number-pad" maxLength={4} />
        <Input label={t('profileEdit.job')} value={job} onChangeText={setJob} />
        <Input label={t('profileEdit.city')} value={city} onChangeText={setCity} />
        <Input label={t('profileEdit.country')} value={country} onChangeText={setCountry} />
        <Input
          label={`${t('profileEdit.about')} (${t('profileEdit.aboutMinLength', { min: MIN_BIO_LENGTH })})`}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={5}
          style={{ height: 120, textAlignVertical: 'top' }}
        />
        <Text
          style={{
            fontSize: 12,
            fontFamily: 'Nunito_400Regular',
            color: bio.length >= MIN_BIO_LENGTH ? theme.textMuted : theme.error,
            textAlign: 'right',
            marginTop: -12,
            marginBottom: 16,
          }}
        >
          {t('profileEdit.aboutCounter', { count: bio.length, min: MIN_BIO_LENGTH })}
        </Text>

        {/* Own pets */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: hasOwnPets ? 12 : 16 }}>
          <Text style={{ flex: 1, fontSize: 14, fontFamily: 'Nunito_600SemiBold', color: theme.text }}>
            {t('profileEdit.hasOwnPets')}
          </Text>
          <Switch value={hasOwnPets} onValueChange={setHasOwnPets} trackColor={{ true: theme.primary, false: theme.border }} />
        </View>
        {hasOwnPets && (
          <Input
            label={t('profileEdit.ownPetsDescription')}
            value={ownPetsDescription}
            onChangeText={setOwnPetsDescription}
            placeholder={t('profileEdit.ownPetsDescriptionPlaceholder')}
            multiline
            numberOfLines={2}
            style={{ height: 70, textAlignVertical: 'top' }}
          />
        )}

        {/* Photo gallery */}
        <Text style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8, fontFamily: 'Nunito_600SemiBold', letterSpacing: 0.4, textTransform: 'uppercase' }}>
          {t('profileEdit.gallery')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
          {photos.map((uri, i) => (
            <View key={uri} style={{ position: 'relative' }}>
              <Image source={{ uri }} style={{ width: 72, height: 72, borderRadius: 12 }} />
              <TouchableOpacity
                onPress={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                style={{
                  position: 'absolute', top: -6, right: -6,
                  backgroundColor: theme.error, borderRadius: 99,
                  width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
                }}
              >
                <MaterialIcons name="close" size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            onPress={handleAddPhoto}
            disabled={isUploadingPhoto}
            style={{
              width: 72, height: 72, borderRadius: 12,
              borderWidth: 1.5, borderColor: theme.border, borderStyle: 'dashed',
              alignItems: 'center', justifyContent: 'center',
              opacity: isUploadingPhoto ? 0.5 : 1,
            }}
          >
            <MaterialIcons name="add-a-photo" size={22} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ID-Check */}
        <Card style={{ marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/konto/profile/verification')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
          >
            <MaterialIcons name="verified-user" size={22} color={theme.primary} />
            <Text style={{ flex: 1, fontSize: 15, fontFamily: 'Nunito_600SemiBold', color: theme.text }}>
              {t('verification.title')}
            </Text>
            {user?.id_verified ? (
              <Badge label={t('verification.verifiedBadge')} variant="success" />
            ) : user?.id_verification_submitted_at ? (
              <Badge label={t('verification.pendingBadge')} variant="warning" />
            ) : null}
            <MaterialIcons name="chevron-right" size={20} color={theme.borderMuted} />
          </TouchableOpacity>
        </Card>

        {/* Video pitch */}
        <Card style={{ marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/konto/profile/video-pitch')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
          >
            <MaterialIcons name="videocam" size={22} color={theme.primary} />
            <Text style={{ flex: 1, fontSize: 15, fontFamily: 'Nunito_600SemiBold', color: theme.text }}>
              {t('videoPitch.title')}
            </Text>
            {user?.video_pitch_url && <Badge label={t('videoPitch.addedBadge')} variant="success" />}
            <MaterialIcons name="chevron-right" size={20} color={theme.borderMuted} />
          </TouchableOpacity>
        </Card>

        {/* Role-specific profile */}
        <Card style={{ marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/konto/profile/sitter')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
          >
            <MaterialIcons name="pets" size={22} color={theme.primary} />
            <Text style={{ flex: 1, fontSize: 15, fontFamily: 'Nunito_600SemiBold', color: theme.text }}>
              {t('profileEdit.sitterProfileCta')}
            </Text>
            <MaterialIcons name="chevron-right" size={20} color={theme.borderMuted} />
          </TouchableOpacity>
        </Card>
        <Card style={{ marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/konto/profile/host')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
          >
            <MaterialIcons name="home" size={22} color={theme.primary} />
            <Text style={{ flex: 1, fontSize: 15, fontFamily: 'Nunito_600SemiBold', color: theme.text }}>
              {t('profileEdit.hostProfileCta')}
            </Text>
            <MaterialIcons name="chevron-right" size={20} color={theme.borderMuted} />
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
