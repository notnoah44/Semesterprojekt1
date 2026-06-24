import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { RoleToggle } from '@/components/role/RoleToggle';
import { NotificationBell } from '@/components/home/NotificationBell';
import { useRole } from '@/lib/hooks/useRole';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useAppTheme } from '@/lib/contexts/ThemeContext';

export default function TabLayout() {
  const { isSitter } = useRole();
  const theme = useAppTheme();
  useNotifications();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSubtle,
        tabBarStyle: {
          borderTopWidth: 0,
          backgroundColor: theme.surfaceVariant,
          paddingBottom: 6,
          paddingTop: 6,
          height: 64,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontFamily: 'Nunito_600SemiBold',
          fontSize: 11,
          marginTop: 2,
        },
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 4,
        },
        tabBarActiveBackgroundColor: theme.primaryContainer,
        headerStyle: { backgroundColor: theme.surfaceVariant, elevation: 0, shadowOpacity: 0 },
        headerTitleStyle: { fontFamily: 'Nunito_700Bold', fontSize: 18, color: theme.text },
        headerShadowVisible: false,
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 16 }}>
            <NotificationBell />
            <RoleToggle />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: isSitter ? 'Search' : 'Bookings',
          tabBarIcon: ({ color, size }) =>
            isSitter
              ? <MaterialIcons name="search" size={size} color={color} />
              : <MaterialIcons name="event" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="chat" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="konto"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
