import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { uploadVideoPitch, upsertProfile } from '@/lib/api/profiles';
import { useCan } from '@/lib/hooks/usePermissions';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: 260, borderRadius: 16 }}
      allowsFullscreen
      nativeControls
    />
  );
}

export default function VideoPitchScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const canVideoPitch = useCan('videoPitch');

  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handlePickVideo = async () => {
    if (!user) return;
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
      mediaTypes: ['videos'],
      quality: 0.7,
    });
    if (result.canceled) return;

    setIsUploading(true);
    try {
      const url = await uploadVideoPitch(user.id, result.assets[0].uri);
      const updated = await upsertProfile({ id: user.id, video_pitch_url: url });
      setUser(updated);
    } catch {
      Alert.alert(t('errors.title'), t('videoPitch.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!user) return;
    setIsRemoving(true);
    try {
      const updated = await upsertProfile({ id: user.id, video_pitch_url: null });
      setUser(updated);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('videoPitch.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {!canVideoPitch ? (
          <Card variant="elevated" style={{ alignItems: 'center', paddingVertical: 28 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <MaterialIcons name="videocam" size={32} color="#D97706" />
            </View>
            <Text style={{ fontSize: 18, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 8, textAlign: 'center' }}>{t('videoPitch.proRequiredTitle')}</Text>
            <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular', textAlign: 'center', marginBottom: 16 }}>{t('videoPitch.proRequiredDesc')}</Text>
            <Button label={t('videoPitch.proRequiredCta')} onPress={() => router.push('/(tabs)/konto/subscription')} />
          </Card>
        ) : (
          <>
            <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular', lineHeight: 19 }}>
              {t('videoPitch.intro')}
            </Text>

            {user?.video_pitch_url ? (
              <>
                <VideoPreview uri={user.video_pitch_url} />
                <Button label={t('videoPitch.replaceButton')} onPress={handlePickVideo} loading={isUploading} variant="secondary" fullWidth />
                <Button label={t('videoPitch.removeButton')} onPress={handleRemove} loading={isRemoving} variant="ghost" fullWidth />
              </>
            ) : (
              <TouchableOpacity
                onPress={handlePickVideo}
                disabled={isUploading}
                style={{
                  height: 200, borderRadius: 16,
                  borderWidth: 1.5, borderColor: theme.border, borderStyle: 'dashed',
                  alignItems: 'center', justifyContent: 'center',
                  opacity: isUploading ? 0.5 : 1,
                }}
              >
                <MaterialIcons name="videocam" size={32} color={theme.textMuted} />
                <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_600SemiBold', marginTop: 8 }}>
                  {isUploading ? t('videoPitch.uploading') : t('videoPitch.pickVideo')}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
