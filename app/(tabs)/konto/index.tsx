import { useRef, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Modal, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useLanguageStore } from '@/stores/languageStore';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { useRole } from '@/lib/hooks/useRole';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { daysUntil } from '@/lib/utils/formatDate';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import type { AppTheme } from '@/lib/constants/themes';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface MenuItemProps {
  iconName: MaterialIconName;
  iconBg: string;
  iconColor: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}

function MenuItem({ iconName, iconBg, iconColor, label, subtitle, onPress, danger }: MenuItemProps) {
  const theme = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 }}
    >
      <View style={{
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: iconBg,
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <MaterialIcons name={iconName} size={22} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 15, fontFamily: 'Nunito_600SemiBold',
          color: danger ? theme.error : theme.text,
        }}>
          {label}
        </Text>
        {subtitle && (
          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginTop: 1 }}>
            {subtitle}
          </Text>
        )}
      </View>
      <MaterialIcons name="chevron-right" size={20} color={theme.borderMuted} />
    </TouchableOpacity>
  );
}

function LanguageRow() {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const rowRef = useRef<View>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, left: 20, right: 20 });

  const current = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];

  const openDropdown = () => {
    rowRef.current?.measureInWindow((x, y, width, height) => {
      const screenWidth = Dimensions.get('window').width;
      setAnchor({ top: y + height + 6, left: x, right: Math.max(20, screenWidth - x - width) });
      setIsOpen(true);
    });
  };

  return (
    <>
      <TouchableOpacity
        ref={rowRef}
        onPress={openDropdown}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 }}
      >
        <View style={{
          width: 44, height: 44, borderRadius: 14,
          backgroundColor: theme.surfaceDim,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <MaterialIcons name="language" size={22} color={theme.textMuted} />
        </View>
        <Text style={{ flex: 1, fontSize: 15, fontFamily: 'Nunito_600SemiBold', color: theme.text }}>
          {t('settings.language')}
        </Text>
        <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginRight: 4 }}>
          {current.flag} {current.label}
        </Text>
        <MaterialIcons name="expand-more" size={20} color={theme.borderMuted} />
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setIsOpen(false)}>
          <View
            style={{
              position: 'absolute',
              top: anchor.top,
              left: anchor.left,
              right: anchor.right,
              backgroundColor: theme.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            {SUPPORTED_LANGUAGES.map((lang, i) => (
              <View key={lang.code}>
                <TouchableOpacity
                  onPress={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}
                >
                  <Text style={{ fontSize: 20 }}>{lang.flag}</Text>
                  <Text style={{ flex: 1, fontSize: 15, fontFamily: 'Nunito_600SemiBold', color: theme.text }}>{lang.label}</Text>
                  {i18n.language === lang.code && <MaterialIcons name="check" size={20} color={theme.primary} />}
                </TouchableOpacity>
                {i < SUPPORTED_LANGUAGES.length - 1 && (
                  <View style={{ height: 1, backgroundColor: theme.border }} />
                )}
              </View>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export default function KontoScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const theme = useAppTheme();
  const { isSitter } = useRole();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clear();
  };

  const membershipDays = user?.membership_expires_at
    ? daysUntil(user.membership_expires_at)
    : null;

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>

        {/* Profile header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 16,
          backgroundColor: theme.primaryContainer,
          borderRadius: 20, padding: 20, marginBottom: 4,
        }}>
          <Avatar uri={user?.avatar_url} name={user?.full_name} size={64} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontFamily: 'Nunito_700Bold', color: theme.onPrimaryContainer }}>
              {user?.full_name ?? t('konto.yourName')}
            </Text>
            <Text style={{ fontSize: 13, fontFamily: 'Nunito_400Regular', color: theme.onPrimaryContainer, opacity: 0.7, marginBottom: 6 }}>
              {isSitter ? t('konto.sitterAccount') : t('konto.hostAccount')}
            </Text>
            <Badge
              label={user?.membership_tier === 'standard' ? t('konto.standardMember') : t('konto.freePlan')}
              variant={user?.membership_tier === 'standard' ? 'primary' : 'neutral'}
            />
          </View>
        </View>

        {/* Konto & Profil */}
        <Card>
          <SectionLabel theme={theme} label={t('konto.groupAccount')} />
          <MenuItem
            iconName="badge"
            iconBg={theme.primaryContainer}
            iconColor={theme.onPrimaryContainer}
            label={t('konto.credentials')}
            onPress={() => router.push('/(tabs)/konto/account')}
          />
          <MenuItem
            iconName="person"
            iconBg={theme.primaryContainer}
            iconColor={theme.onPrimaryContainer}
            label={t('konto.publicProfile')}
            onPress={() => router.push('/(tabs)/konto/profile/edit')}
          />
        </Card>

        {/* Abo & Zahlung */}
        <Card>
          <SectionLabel theme={theme} label={t('konto.groupSubscription')} />
          <MenuItem
            iconName="workspace-premium"
            iconBg="#FEF3C7"
            iconColor="#D97706"
            label={t('konto.subscription')}
            subtitle={user?.membership_tier === 'standard'
              ? (membershipDays !== null ? t('konto.membershipDays', { days: membershipDays }) : t('konto.standardActive'))
              : t('konto.upgradeHint')}
            onPress={() => router.push('/(tabs)/konto/subscription')}
          />
          <MenuItem
            iconName="payment"
            iconBg={theme.surfaceDim}
            iconColor={theme.textMuted}
            label={t('payment.title')}
            onPress={() => router.push('/(tabs)/konto/subscription/payment')}
          />
          <MenuItem
            iconName="notifications"
            iconBg={theme.surfaceDim}
            iconColor={theme.textMuted}
            label={t('settings.notifications')}
            onPress={() => router.push('/(tabs)/konto/subscription/notifications')}
          />
        </Card>

        {/* Support & Rechtliches */}
        <Card>
          <SectionLabel theme={theme} label={t('konto.groupSupport')} />
          <MenuItem
            iconName="help"
            iconBg={theme.tertiaryContainer}
            iconColor={theme.tertiary}
            label={t('konto.helpSupport')}
            onPress={() => router.push('/(tabs)/konto/support/help-support')}
          />
          <MenuItem
            iconName="info-outline"
            iconBg={theme.tertiaryContainer}
            iconColor={theme.tertiary}
            label={t('konto.aboutUs')}
            onPress={() => router.push('/(tabs)/konto/support/about')}
          />
          <MenuItem
            iconName="gavel"
            iconBg={theme.secondaryContainer}
            iconColor={theme.secondary}
            label={t('konto.legal')}
            onPress={() => router.push('/(tabs)/konto/support/legal')}
          />
          <LanguageRow />
          <MenuItem
            iconName="logout"
            iconBg={theme.errorContainer}
            iconColor={theme.error}
            label={t('konto.signOut')}
            onPress={handleLogout}
            danger
          />
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ theme, label }: { theme: AppTheme; label: string }) {
  return (
    <Text style={{
      fontSize: 11, fontFamily: 'Nunito_700Bold',
      color: theme.textSubtle, marginBottom: 6,
      letterSpacing: 1, textTransform: 'uppercase',
    }}>
      {label}
    </Text>
  );
}
