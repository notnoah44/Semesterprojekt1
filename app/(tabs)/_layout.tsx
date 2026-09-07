import { useUnreadChatCount } from '@/lib/hooks/useUnreadChatCount';
import { usePushRegistration } from '@/lib/hooks/usePushRegistration';
import { Tabs } from 'expo-router';
import { PlatformPressable } from '@react-navigation/elements';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StackActions, type EventArg } from '@react-navigation/native';
import { RoleToggle } from '@/components/role/RoleToggle';
import { NotificationBell } from '@/components/home/NotificationBell';
import { HelpButton } from '@/components/home/HelpButton';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useAppTheme } from '@/lib/contexts/ThemeContext';

function RoundedTabButton({ style, ...props }: BottomTabBarButtonProps) {
  return <PlatformPressable {...props} style={[style, {
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingVertical: 4,
  }]} />;
}

/**
 * Ein Tap auf einen Tab soll immer zur Root des jeweiligen Stacks führen,
 * unabhängig davon, welcher Unterpunkt dort zuletzt offen war (auch wenn der
 * Tab durch eine bereichsfremde Navigation, z. B. aus "Hilfe", nie aktiv
 * verlassen wurde). Reset-Pattern aus den React-Navigation-Docs.
 */
function resetTabOnPress({ navigation, route }: { navigation: any; route: { name: string } }) {
  return {
    tabPress: (_e: EventArg<'tabPress', true>) => {
      const state = navigation.getState();
      const tabRoute = state.routes.find((r: any) => r.name === route.name);
      const nestedState = tabRoute?.state;
      if (nestedState && nestedState.index > 0) {
        navigation.dispatch({ ...StackActions.popToTop(), target: nestedState.key });
      }
    },
  };
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { t } = useTranslation();
  useNotifications();
  usePushRegistration();
  const unreadChat = useUnreadChatCount();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSubtle,
        tabBarButton: RoundedTabButton,
        tabBarStyle: {
          borderTopWidth: 0,
          backgroundColor: theme.surfaceVariant,
          paddingBottom: 6 + insets.bottom,
          paddingTop: 6,
          height: 64 + insets.bottom,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontFamily: 'Nunito_600SemiBold',
          fontSize: 11,
          lineHeight: 14,
          includeFontPadding: false,
          marginTop: 2,
        },
        tabBarItemStyle: {
          borderRadius: 16,
          overflow: 'hidden',
          marginHorizontal: 4,
        },
        tabBarActiveBackgroundColor: theme.primaryContainer,
        headerStyle: { backgroundColor: theme.surfaceVariant, elevation: 0, shadowOpacity: 0 },
        headerTitleAlign: 'left',
        headerTitleStyle: { fontFamily: 'Nunito_700Bold', fontSize: 18, color: theme.text },
        headerShadowVisible: false,
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 16 }}>
            <RoleToggle />
            <NotificationBell />
            <HelpButton />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} />,
        }}
        listeners={resetTabOnPress}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('tabs.search'),
          tabBarIcon: ({ color, size }) => <MaterialIcons name="search" size={size} color={color} />,
        }}
        listeners={resetTabOnPress}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t('tabs.chat'),
          // Free the bottom of the conversation screen while typing.
          tabBarHideOnKeyboard: true,
          tabBarIcon: ({ color, size }) => <View><MaterialIcons name="chat" size={size} color={color} />{unreadChat > 0 && <View style={{ position: 'absolute', top: -2, right: -4, width: 9, height: 9, borderRadius: 5, backgroundColor: theme.error }} />}</View>,
        }}
        listeners={resetTabOnPress}
      />
      <Tabs.Screen
        name="konto"
        options={{
          title: t('tabs.account'),
          tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size} color={color} />,
        }}
        listeners={resetTabOnPress}
      />
    </Tabs>
  );
}
