import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { useRole } from '@/lib/hooks/useRole';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { daysUntil } from '@/lib/utils/formatDate';
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

        {/* Profile */}
        <Card>
          <SectionLabel theme={theme} label={t('konto.profile')} />
          <MenuItem
            iconName="person"
            iconBg={theme.primaryContainer}
            iconColor={theme.onPrimaryContainer}
            label={t('konto.editProfile')}
            onPress={() => router.push('/(tabs)/konto/profile/edit')}
          />
          <MenuItem
            iconName="workspace-premium"
            iconBg="#FEF3C7"
            iconColor="#D97706"
            label={t('konto.membership')}
            subtitle={user?.membership_tier === 'standard'
              ? (membershipDays !== null ? t('konto.membershipDays', { days: membershipDays }) : t('konto.standardActive'))
              : t('konto.upgradeHint')}
            onPress={() => router.push('/(tabs)/konto/membership')}
          />
        </Card>

        {/* Settings */}
        <Card>
          <SectionLabel theme={theme} label={t('konto.settings')} />
          <MenuItem
            iconName="settings"
            iconBg={theme.surfaceDim}
            iconColor={theme.textMuted}
            label={t('konto.settings')}
            onPress={() => router.push('/(tabs)/konto/settings')}
          />
        </Card>

        {/* Support */}
        <Card>
          <SectionLabel theme={theme} label={t('konto.support')} />
          <MenuItem
            iconName="help"
            iconBg={theme.tertiaryContainer}
            iconColor={theme.tertiary}
            label={t('konto.helpSupport')}
            onPress={() => router.push('/(tabs)/konto/help-support')}
          />
          <MenuItem
            iconName="feedback"
            iconBg={theme.tertiaryContainer}
            iconColor={theme.tertiary}
            label={t('konto.sendFeedback')}
            onPress={() => router.push('/(tabs)/konto/feedback')}
          />
        </Card>

        {/* Legal */}
        <Card>
          <SectionLabel theme={theme} label={t('konto.legal')} />
          <MenuItem
            iconName="description"
            iconBg={theme.secondaryContainer}
            iconColor={theme.secondary}
            label={t('konto.terms')}
            onPress={() => router.push('/(tabs)/konto/terms')}
          />
          <MenuItem
            iconName="privacy-tip"
            iconBg={theme.secondaryContainer}
            iconColor={theme.secondary}
            label={t('konto.privacy')}
            onPress={() => router.push('/(tabs)/konto/privacy')}
          />
        </Card>

        {/* Logout */}
        <Card>
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
