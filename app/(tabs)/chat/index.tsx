import { useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { getConversations, hideConversationForUser, isMissingChatHidingTable } from '@/lib/api/chat';
import { useChatUpdates } from '@/lib/hooks/useUnreadChatCount';
import { getConnectedProfileIds, getDisplayName } from '@/lib/api/connections';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Avatar } from '@/components/ui/Avatar';

export default function ChatListScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<any[]>([]);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const request = useRef(0);

  const load = useCallback(async () => {
    const current = ++request.current;
    if (!user?.id) { setConversations([]); setIsLoading(false); return; }
    setIsLoading(true);
    setLoadError(false);
    try {
      const data = await getConversations(user.id);
      if (current === request.current) setConversations(data);
    } catch {
      if (current === request.current) setLoadError(true);
    } finally {
      if (current === request.current) setIsLoading(false);
    }
  }, [user?.id]);

  const revision = useChatUpdates(s => s.revision);
  useFocusEffect(useCallback(() => {
    let active = true;
    void load();
    if (user) getConnectedProfileIds(user.id).then(ids => { if (active) setConnectedIds(ids); }).catch(() => {});
    return () => { active = false; ++request.current; };
  }, [load, revision]));

  const getOtherUser = (conv: any) => {
    if (!user) return null;
    return conv.participant1 === user.id
      ? conv.participant2_profile
      : conv.participant1_profile;
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.background }}>
      {loadError && <View style={{ padding: 16, gap: 8 }}>
        <Text accessibilityRole="alert" style={{ color: theme.error }}>{t('fixes.chatLoadFailed')}</Text>
        <TouchableOpacity onPress={load}><Text style={{ color: theme.primary }}>{t('fixes.retry')}</Text></TouchableOpacity>
      </View>}
      {conversations.length === 0 && !isLoading && !loadError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
          <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: theme.surfaceDim, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="chat" size={36} color={theme.borderMuted} />
          </View>
          <Text style={{ fontSize: 20, fontFamily: 'Nunito_700Bold', color: theme.text, textAlign: 'center' }}>
            {t('chat.emptyTitle')}
          </Text>
          <Text style={{ fontSize: 15, color: theme.textMuted, fontFamily: 'Nunito_400Regular', textAlign: 'center' }}>
            {t('chat.emptySubtitle')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          refreshing={isLoading}
          onRefresh={load}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: theme.border, marginLeft: 76 }} />
          )}
          renderItem={({ item }) => {
            const other = getOtherUser(item);
            const displayName = other ? getDisplayName(other.full_name, connectedIds.has(other.id)) : '';
            const confirmDelete = () => Alert.alert(t('fixes.deleteChat'), t('fixes.deleteChatHint'), [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('fixes.deleteChat'), style: 'destructive', onPress: async () => {
                    try { await hideConversationForUser(item.id, user!.id); setConversations(prev => prev.filter(c => c.id !== item.id)); }
                    catch (error) { Alert.alert(t('errors.title'), t(isMissingChatHidingTable(error as { code?: string; message?: string }) ? 'fixes.chatDeleteUnavailable' : 'errors.auth.generic')); }
                  } },
                ]);
            return (
              <Swipeable
                overshootRight={false}
                rightThreshold={40}
                renderRightActions={() => (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={t('fixes.deleteChat')}
                    onPress={confirmDelete}
                    style={{ width: 76, backgroundColor: theme.error, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <MaterialIcons name="delete" size={24} color="#fff" />
                  </TouchableOpacity>
                )}
              >
              <TouchableOpacity
                onPress={() => router.push(`/(tabs)/chat/${item.id}`)}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  padding: 16, gap: 12, backgroundColor: theme.surface,
                }}
              >
                <Avatar uri={other?.avatar_url} name={displayName} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: theme.text }}>
                    {displayName || t('chat.unknownUser')}
                  </Text>
                  {(item.listing?.title || item.sitter_listing?.title) && <Text numberOfLines={1} style={{ color: theme.primary, fontSize: 12 }}>{item.listing?.title ?? item.sitter_listing?.title}</Text>}
                  <Text numberOfLines={1} style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginTop: 2 }}>
                    {item.messages?.[0]?.content ?? t('chat.tapToOpen')}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={theme.borderMuted} />
              </TouchableOpacity>
              </Swipeable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
