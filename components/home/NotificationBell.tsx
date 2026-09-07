import { readNotification, openNotification } from '@/lib/api/notifications';
import { useRef, useState } from 'react';
import { TouchableOpacity, View, Text, Modal, Pressable, FlatList, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAppTheme } from '@/lib/contexts/ThemeContext';
import { formatDate } from '@/lib/utils/formatDate';

export function NotificationBell() {
  const buttonRef = useRef<View>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, right: 16 });
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { notifications, unreadCount, markRead } = useNotificationStore();

  const openDropdown = () => {
    buttonRef.current?.measureInWindow((x, y, width, height) => {
      const screenWidth = Dimensions.get('window').width;
      setAnchor({ top: y + height + 8, right: Math.max(16, screenWidth - x - width) });
      setIsOpen(true);
    });
  };

  return (
    <>
      <TouchableOpacity ref={buttonRef} onPress={openDropdown} style={{ position: 'relative', padding: 4 }}>
        <MaterialIcons name="notifications" size={26} color={theme.text} />
        {unreadCount > 0 && (
          <View style={{
            position: 'absolute',
            top: 0,
            right: 0,
            backgroundColor: theme.error,
            borderRadius: 99,
            width: 18,
            height: 18,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text style={{ color: '#fff', fontSize: 10, fontFamily: 'Nunito_700Bold' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setIsOpen(false)}>
          <View
            style={{
              position: 'absolute',
              top: anchor.top,
              right: anchor.right,
              width: 280,
              maxHeight: 360,
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
            <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <Text style={{ fontSize: 15, fontFamily: 'Nunito_700Bold', color: theme.text }}>
                {t('notifications.title')}
              </Text>
            </View>

            {notifications.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'Nunito_400Regular' }}>
                  {t('notifications.noNew')}
                </Text>
              </View>
            ) : (
              <FlatList
                data={notifications.slice(0, 6)}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => { void readNotification(item.id).catch(() => {}); setIsOpen(false); openNotification(item); }}
                    style={{
                      padding: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                      backgroundColor: item.read ? 'transparent' : theme.primaryContainer,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontFamily: item.read ? 'Nunito_400Regular' : 'Nunito_700Bold', color: theme.text }}>
                      {item.type.replace(/_/g, ' ')}
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'Nunito_400Regular', marginTop: 2 }}>
                      {formatDate(item.created_at)}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
