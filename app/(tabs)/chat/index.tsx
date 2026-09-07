import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { getConversations } from '@/lib/api/chat';
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

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    getConversations(user.id)
      .then(setConversations)
      .finally(() => setIsLoading(false));
    getConnectedProfileIds(user.id).then(setConnectedIds);
  }, [user]);

  const getOtherUser = (conv: any) => {
    if (!user) return null;
    return conv.participant1 === user.id
      ? conv.participant2_profile
      : conv.participant1_profile;
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      {conversations.length === 0 && !isLoading ? (
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
          onRefresh={() => user && getConversations(user.id).then(setConversations)}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: theme.border, marginLeft: 76 }} />
          )}
          renderItem={({ item }) => {
            const other = getOtherUser(item);
            const displayName = other ? getDisplayName(other.full_name, connectedIds.has(other.id)) : '';
            return (
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
                  <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginTop: 2 }}>
                    {t('chat.tapToOpen')}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={theme.borderMuted} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
