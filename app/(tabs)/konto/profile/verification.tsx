import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Alert, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { uploadVerificationPhoto, submitVerification } from '@/lib/api/profiles';
import { useCan } from '@/lib/hooks/usePermissions';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

function PhotoPickerSlot({ label, uri, onPick }: { label: string; uri: string | null; onPick: () => void }) {
  const theme = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onPick}
      style={{
        flex: 1, aspectRatio: 1, borderRadius: 16,
        borderWidth: 1.5, borderColor: uri ? theme.primary : theme.border,
        borderStyle: uri ? 'solid' : 'dashed',
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        backgroundColor: theme.surface,
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <>
          <MaterialIcons name="add-a-photo" size={26} color={theme.textMuted} />
          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'Nunito_600SemiBold', marginTop: 6, textAlign: 'center', paddingHorizontal: 8 }}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export default function VerificationScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const canIdCheck = useCan('idCheck');

  const [idPhotoUri, setIdPhotoUri] = useState<string | null>(null);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickPhoto = async (setter: (uri: string) => void) => {
    const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      if (!canAskAgain) {
        Alert.alert(t('errors.title'), t('profileEdit.photoPermissionDenied'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('profileEdit.openSettings'), onPress: () => Linking.openSettings() },
        ]);
      } else {
        Alert.alert(t('errors.title'), t('profileEdit.photoPermissionDenied'));
      }
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setter(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!user || !idPhotoUri || !selfieUri) return;
    setIsSubmitting(true);
    try {
      await uploadVerificationPhoto(user.id, 'id-photo', idPhotoUri);
      await uploadVerificationPhoto(user.id, 'selfie', selfieUri);
      const updated = await submitVerification(user.id);
      setUser(updated);
      setIdPhotoUri(null);
      setSelfieUri(null);
    } catch {
      Alert.alert(t('errors.title'), t('verification.submitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isVerified = user?.id_verified ?? false;
  const isPending = !isVerified && !!user?.id_verification_submitted_at;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('verification.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {isVerified ? (
          <Card variant="elevated" style={{ alignItems: 'center', paddingVertical: 28 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: theme.successContainer, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <MaterialIcons name="verified" size={32} color="#2E7D50" />
            </View>
            <Text style={{ fontSize: 18, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 8 }}>{t('verification.verifiedTitle')}</Text>
            <Badge label={t('verification.verifiedBadge')} variant="success" />
          </Card>
        ) : isPending ? (
          <Card variant="elevated" style={{ alignItems: 'center', paddingVertical: 28 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: theme.warningContainer, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <MaterialIcons name="hourglass-top" size={32} color="#7A4F00" />
            </View>
            <Text style={{ fontSize: 18, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 8, textAlign: 'center' }}>{t('verification.pendingTitle')}</Text>
            <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular', textAlign: 'center' }}>{t('verification.pendingDesc')}</Text>
          </Card>
        ) : !canIdCheck ? (
          <Card variant="elevated" style={{ alignItems: 'center', paddingVertical: 28 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <MaterialIcons name="workspace-premium" size={32} color="#D97706" />
            </View>
            <Text style={{ fontSize: 18, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 8, textAlign: 'center' }}>{t('verification.proRequiredTitle')}</Text>
            <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular', textAlign: 'center', marginBottom: 16 }}>{t('verification.proRequiredDesc')}</Text>
            <Button label={t('verification.proRequiredCta')} onPress={() => router.push('/(tabs)/konto/subscription')} />
          </Card>
        ) : (
          <>
            <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular', lineHeight: 19 }}>
              {t('verification.intro')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <PhotoPickerSlot label={t('verification.idPhoto')} uri={idPhotoUri} onPick={() => pickPhoto(setIdPhotoUri)} />
              <PhotoPickerSlot label={t('verification.selfie')} uri={selfieUri} onPick={() => pickPhoto(setSelfieUri)} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, backgroundColor: theme.tertiaryContainer, borderRadius: 14, padding: 14, alignItems: 'flex-start' }}>
              <MaterialIcons name="lock" size={18} color={theme.tertiary} style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, fontSize: 12, color: theme.tertiary, fontFamily: 'Nunito_400Regular', lineHeight: 17 }}>
                {t('verification.privacyNotice')}
              </Text>
            </View>
            <Button
              label={t('verification.submitButton')}
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={!idPhotoUri || !selfieUri}
              fullWidth
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
