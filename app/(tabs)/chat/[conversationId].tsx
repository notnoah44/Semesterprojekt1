import { useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Platform, Alert, AppState } from 'react-native';
import { KeyboardAvoidingView, useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ReportModal } from '@/components/chat/ReportModal';
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
  const insets = useSafeAreaInsets();
  const { progress } = useReanimatedKeyboardAnimation();
  const composerInsets = useAnimatedStyle(() => ({
    paddingBottom: insets.bottom * (1 - Math.max(0, Math.min(1, progress.value))),
  }), [insets.bottom]);
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
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [listingRef, setListingRef] = useState<{ id: string; title: string; sitter: boolean } | null>(null);
  const newestFirst = useMemo(() => [...messages].reverse(), [messages]);
  const focused = useRef(false);
  const listRef = useRef<FlatList>(null);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    if (!conversationId || !user) return;
    let active = true;
    setLoadError(false);
    const reload = () => getMessages(conversationId).then((msgs) => {
      if (!active || AppState.currentState !== 'active') return;
      setMessages(prev => [...new Map([...prev.filter(m => m.conversation_id === conversationId), ...msgs].map(m => [m.id, m])).values()].sort((a, b) => a.created_at.localeCompare(b.created_at)));
      void markMessagesRead(conversationId, user.id).catch(() => {});
    }).catch(() => { if (active) setLoadError(true); });
    void reload();
    const appListener = AppState.addEventListener('change', state => { if (state === 'active') void reload(); });
    getConversation(conversationId).then((conv) => {
      if (!active) return;
      const other = conv.participant1 === user.id
        ? conv.participant2_profile
        : conv.participant1_profile;
      setOtherUser(other);
      setListingRef(conv.listing ? { ...conv.listing, sitter: false } : conv.sitter_listing ? { ...conv.sitter_listing, sitter: true } : null);
      setIsUnlocked(conv.is_unlocked ?? true);
      if (other?.id) isConnected(user.id, other.id).then(setConnected).catch(() => {});

      if (conv.listing?.owner_id) {
        setViewMode(conv.listing.owner_id === user.id ? 'sitter' : 'host');
      } else if (conv.sitter_listing?.sitter_id) {
        setViewMode(conv.sitter_listing.sitter_id === user.id ? 'host' : 'sitter');
      }
    }).catch(() => { if (active) setLoadError(true); });
    return () => { active = false; focused.current = false; appListener.remove(); };
  }, [conversationId, user?.id, retry]));

  const handleNewMessage = useCallback((msg: Message) => {
    setMessages((prev) => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    if (focused.current && AppState.currentState === 'active' && user && msg.sender_id !== user.id) void markMessagesRead(msg.conversation_id, user.id).catch(() => {});
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [user?.id]);

  useRealTimeChat(conversationId ?? null, handleNewMessage);

  const canReply = isUnlocked ? canContinueUnlockedThread : canSendFirstMessage;

  const handleSend = async () => {
    if (!canReply || !text.trim() || !user || !conversationId) return;
    const content = text.trim();
    setText('');
    try {
      const message = await sendMessage({ conversation_id: conversationId, sender_id: user.id, content });
      handleNewMessage(message);
    } catch { setText(content); Alert.alert(t('errors.title'), t('errors.auth.generic')); }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior="padding"
      // This scene fills the window: its own header and safe areas are inside.
      keyboardVerticalOffset={0}
    >
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.surface, gap: 12 }}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/chat'))}>
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

      {listingRef && <TouchableOpacity onPress={() => router.push(listingRef.sitter ? `/(tabs)/search/sitters/${listingRef.id}` : `/(tabs)/search/listings/${listingRef.id}`)} style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.surface }}>
        <Text numberOfLines={1} style={{ color: theme.primary }}>{listingRef.title} ›</Text>
      </TouchableOpacity>}
      {showReport && otherUser?.id && <ReportModal userId={otherUser.id} conversationId={conversationId} onClose={() => setShowReport(false)} />}
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
            <TouchableOpacity onPress={() => { setShowHelp(false); setShowReport(true); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, backgroundColor: '#FEE2E2', borderRadius: 14 }}>
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
      {loadError && <View style={{ padding: 16, gap: 8 }}>
        <Text accessibilityRole="alert" style={{ color: theme.error }}>{t('fixes.chatLoadFailed')}</Text>
        <TouchableOpacity onPress={() => setRetry(value => value + 1)}><Text style={{ color: theme.primary }}>{t('fixes.retry')}</Text></TouchableOpacity>
      </View>}
      <FlatList
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        ref={listRef}
        inverted
        data={newestFirst}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 6 }}
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
      <Animated.View style={[{ backgroundColor: theme.surface }, composerInsets]}>
        {canReply ? (
          <View style={{
            flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 10,
            borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface,
          }}>
            <TextInput
              style={{
                flex: 1, minHeight: 42, maxHeight: 120, textAlignVertical: 'top',
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
      </Animated.View>
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
