import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useLanguageStore } from '@/stores/languageStore';
import { upsertProfile } from '@/lib/api/profiles';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Role } from '@/types/user';

const STEPS = 4;

export default function OnboardingScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const { setUser, setRole, user } = useAuthStore();
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<Role>('sitter');
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFinish = async () => {
    const userId = user?.id;
    if (!userId) {
      Alert.alert('Error', 'Session expired. Please log in again.');
      router.replace('/(auth)/login');
      return;
    }
    setIsLoading(true);
    try {
      const profile = await upsertProfile({
        id: userId,
        bio: bio || undefined,
        role_default: selectedRole,
      });
      setUser(profile);
      setRole(selectedRole);
      router.replace('/(tabs)/home');
    } catch (e) {
      Alert.alert('Error', 'Could not save your profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const ROLES: { value: Role; icon: string; title: string; subtitle: string }[] = [
    { value: 'sitter', icon: 'account-heart', title: t('onboarding.sitterTitle'), subtitle: t('onboarding.sitterSubtitle') },
    { value: 'anbieter', icon: 'home-heart', title: t('onboarding.hostTitle'), subtitle: t('onboarding.hostSubtitle') },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ padding: 24, flex: 1 }}>
        {/* Progress bar */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 32 }}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1, height: 4, borderRadius: 2,
                backgroundColor: i < step ? theme.primary : theme.border,
              }}
            />
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {step === 1 && (
            <View>
              <Text style={{ fontSize: 28, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 8 }}>
                {t('onboarding.languageTitle')}
              </Text>
              <Text style={{ fontSize: 16, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginBottom: 32 }}>
                {t('onboarding.languageSubtitle')}
              </Text>

              {SUPPORTED_LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  onPress={() => setLanguage(lang.code)}
                  style={{
                    padding: 18, borderRadius: 18, borderWidth: 2, marginBottom: 14,
                    flexDirection: 'row', alignItems: 'center', gap: 16,
                    borderColor: i18n.language === lang.code ? theme.primary : theme.border,
                    backgroundColor: i18n.language === lang.code ? theme.primaryContainer : theme.surface,
                  }}
                >
                  <Text style={{ fontSize: 28 }}>{lang.flag}</Text>
                  <Text style={{ flex: 1, fontSize: 17, fontFamily: 'Nunito_700Bold', color: i18n.language === lang.code ? theme.onPrimaryContainer : theme.text }}>
                    {lang.label}
                  </Text>
                  {i18n.language === lang.code && (
                    <MaterialIcons name="check-circle" size={22} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={{ fontSize: 28, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 8 }}>
                {t('onboarding.roleTitle')}
              </Text>
              <Text style={{ fontSize: 16, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginBottom: 32 }}>
                {t('onboarding.roleSubtitle')}
              </Text>

              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  onPress={() => setSelectedRole(r.value)}
                  style={{
                    padding: 20, borderRadius: 18, borderWidth: 2, marginBottom: 16,
                    flexDirection: 'row', alignItems: 'center', gap: 16,
                    borderColor: selectedRole === r.value ? theme.primary : theme.border,
                    backgroundColor: selectedRole === r.value ? theme.primaryContainer : theme.surface,
                  }}
                >
                  <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: selectedRole === r.value ? theme.surface : theme.surfaceDim, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialCommunityIcons name={r.icon as any} size={28} color={selectedRole === r.value ? theme.primary : theme.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontFamily: 'Nunito_700Bold', color: selectedRole === r.value ? theme.onPrimaryContainer : theme.text }}>
                      {r.title}
                    </Text>
                    <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginTop: 3 }}>
                      {r.subtitle}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={{ fontSize: 28, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 8 }}>
                {t('onboarding.aboutTitle', { name: user?.full_name?.split(' ')[0] ?? 'there' })}
              </Text>
              <Text style={{ fontSize: 16, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginBottom: 32 }}>
                {t('onboarding.aboutSubtitle')}
              </Text>
              <Input
                label={t('onboarding.aboutLabel')}
                value={bio}
                onChangeText={setBio}
                placeholder={t('onboarding.aboutPlaceholder')}
                multiline
                numberOfLines={4}
                style={{ height: 100, textAlignVertical: 'top' }}
              />
            </View>
          )}

          {step === 4 && (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Text style={{ fontSize: 56, marginBottom: 16 }}>🎉</Text>
              <Text style={{ fontSize: 28, fontFamily: 'Nunito_700Bold', color: theme.text, textAlign: 'center', marginBottom: 12 }}>
                {t('onboarding.doneTitle')}
              </Text>
              <Text style={{ fontSize: 16, color: theme.textMuted, fontFamily: 'Nunito_400Regular', textAlign: 'center', marginBottom: 40 }}>
                {selectedRole === 'sitter' ? t('onboarding.doneSitter') : t('onboarding.doneHost')}
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 12, paddingTop: 16 }}>
          {step > 1 && (
            <Button
              label={t('common.back')}
              onPress={() => setStep((s) => s - 1)}
              variant="secondary"
            />
          )}
          <View style={{ flex: 1 }}>
            {step < STEPS ? (
              <Button
                label={t('common.continue')}
                onPress={() => setStep((s) => s + 1)}
                fullWidth
              />
            ) : (
              <Button
                label={t('common.getStarted')}
                onPress={handleFinish}
                loading={isLoading}
                fullWidth
              />
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
