import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { getConversations } from '@/lib/api/chat';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Avatar } from '@/components/ui/Avatar';

export default function ChatListScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const theme = useAppTheme();
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    getConversations(user.id)
      .then(setConversations)
      .finally(() => setIsLoading(false));
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
            No conversations yet
          </Text>
          <Text style={{ fontSize: 15, color: theme.textMuted, fontFamily: 'Nunito_400Regular', textAlign: 'center' }}>
            Start a conversation by contacting a sitter or listing owner
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
            return (
              <TouchableOpacity
                onPress={() => router.push(`/(tabs)/chat/${item.id}`)}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  padding: 16, gap: 12, backgroundColor: theme.surface,
                }}
              >
                <Avatar uri={other?.avatar_url} name={other?.full_name} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontFamily: 'Nunito_700Bold', color: theme.text }}>
                    {other?.full_name ?? 'Unknown user'}
                  </Text>
                  <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginTop: 2 }}>
                    Tap to open conversation
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
