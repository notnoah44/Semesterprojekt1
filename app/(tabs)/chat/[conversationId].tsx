import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { getMessages, sendMessage, markMessagesRead, getConversation } from '@/lib/api/chat';
import { useRealTimeChat } from '@/lib/hooks/useRealTimeChat';
import { useCan } from '@/lib/hooks/usePermissions';
import { isConnected, getDisplayName } from '@/lib/api/connections';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { Avatar } from '@/components/ui/Avatar';
import type { Message } from '@/types/chat';

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const canContinueUnlockedThread = useCan('continueUnlockedThread');
  const canSendFirstMessage = useCan('sendFirstMessage');
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'sitter' | 'host' | undefined>(undefined);
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [connected, setConnected] = useState(false);
  const [text, setText] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!conversationId || !user) return;
    getMessages(conversationId).then((msgs) => {
      setMessages(msgs);
      markMessagesRead(conversationId, user.id);
    });
    getConversation(conversationId).then((conv) => {
      const other = conv.participant1 === user.id
        ? conv.participant2_profile
        : conv.participant1_profile;
      setOtherUser(other);
      setIsUnlocked(conv.is_unlocked ?? true);
      if (other?.id) isConnected(user.id, other.id).then(setConnected);

      if (conv.listing?.owner_id) {
        setViewMode(conv.listing.owner_id === user.id ? 'sitter' : 'host');
      } else if (conv.sitter_listing?.sitter_id) {
        setViewMode(conv.sitter_listing.sitter_id === user.id ? 'host' : 'sitter');
      }
    });
  }, [conversationId, user]);

  const handleNewMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  useRealTimeChat(conversationId ?? null, handleNewMessage);

  const canReply = isUnlocked ? canContinueUnlockedThread : canSendFirstMessage;

  const handleSend = async () => {
    if (!canReply || !text.trim() || !user || !conversationId) return;
    const content = text.trim();
    setText('');
    await sendMessage({ conversation_id: conversationId, sender_id: user.id, content });
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.surface, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => otherUser?.id && router.push(`/profile/${otherUser.id}${viewMode ? `?viewMode=${viewMode}` : ''}`)}
          disabled={!otherUser?.id}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          {otherUser && <Avatar uri={otherUser.avatar_url} name={getDisplayName(otherUser.full_name, connected)} size={36} />}
          <Text style={{ flex: 1, fontSize: 17, fontFamily: 'Nunito_700Bold', color: theme.text }}>
            {otherUser ? getDisplayName(otherUser.full_name, connected) : '…'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowHelp(true)}>
          <MaterialIcons name="more-vert" size={24} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Help bottom sheet */}
      {showHelp && (
        <TouchableOpacity
          style={{ position: 'absolute', inset: 0, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowHelp(false)}
        >
          <TouchableOpacity activeOpacity={1} style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 }}>
            <Text style={{ fontSize: 18, fontFamily: 'Nunito_700Bold', color: theme.text, marginBottom: 4 }}>
              {t('chat.helpSafety')}
            </Text>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, backgroundColor: '#D1FAE5', borderRadius: 14 }}>
              <MaterialIcons name="phone" size={22} color="#065F46" />
              <View>
                <Text style={{ fontSize: 15, fontFamily: 'Nunito_700Bold', color: '#065F46' }}>{t('chat.vetAdviceLine')}</Text>
                <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>{t('chat.callVetDesc')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, backgroundColor: theme.surfaceDim, borderRadius: 14 }}>
              <MaterialIcons name="phone" size={22} color={theme.text} />
              <View>
                <Text style={{ fontSize: 15, fontFamily: 'Nunito_700Bold', color: theme.text }}>{t('chat.directCall')}</Text>
                <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>{t('chat.callUserDesc')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, backgroundColor: '#FEE2E2', borderRadius: 14 }}>
              <MaterialIcons name="flag" size={22} color="#991B1B" />
              <View>
                <Text style={{ fontSize: 15, fontFamily: 'Nunito_700Bold', color: '#991B1B' }}>{t('chat.reportUser')}</Text>
                <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>{t('chat.reportUserDesc')}</Text>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 6 }}
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const isMe = item.sender_id === user?.id;
          return (
            <View style={{ alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              <View style={{
                maxWidth: '80%',
                backgroundColor: isMe ? theme.primary : theme.surface,
                borderRadius: 18,
                borderBottomRightRadius: isMe ? 4 : 18,
                borderBottomLeftRadius: isMe ? 18 : 4,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderWidth: isMe ? 0 : 1,
                borderColor: theme.border,
              }}>
                <Text style={{ fontSize: 15, color: isMe ? '#fff' : theme.text, fontFamily: 'Nunito_400Regular', lineHeight: 21 }}>
                  {item.content}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {canReply ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface }}>
            <TextInput
              style={{
                flex: 1, minHeight: 42, maxHeight: 120,
                backgroundColor: theme.surfaceDim,
                borderRadius: 21, paddingHorizontal: 16, paddingVertical: 10,
                fontSize: 15, color: theme.text, fontFamily: 'Nunito_400Regular',
              }}
              value={text}
              onChangeText={setText}
              placeholder={t('chat.messagePlaceholder')}
              placeholderTextColor={theme.textMuted}
              multiline
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!text.trim()}
              style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: text.trim() ? theme.primary : theme.border, alignItems: 'center', justifyContent: 'center' }}
            >
              <MaterialIcons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface }}>
            <MaterialIcons name="lock-outline" size={18} color={theme.textMuted} />
            <Text style={{ flex: 1, fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular', lineHeight: 18 }}>
              {t('chat.lockedNotice')}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/konto/subscription')}>
              <Text style={{ fontSize: 13, color: theme.primary, fontFamily: 'Nunito_700Bold' }}>{t('chat.lockedCta')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
