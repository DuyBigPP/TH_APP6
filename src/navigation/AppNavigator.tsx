import React, { useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MessageCircle, Users, Bell, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ContactsScreen from '../screens/ContactsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ChatScreen from '../screens/ChatScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import GroupInfoScreen from '../screens/GroupInfoScreen';
import { colors } from '../theme/colors';
import { subscribeAuth, setupPresence } from '../services/authService';
import {
  subscribeNotifications,
  AppNotif,
} from '../services/notificationService';
import {
  initLocalNotify,
  showLocalNotification,
} from '../services/localNotify';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 12);
  const [notifs, setNotifs] = useState<AppNotif[]>([]);
  const mountedAt = useRef(Date.now());
  const shown = useRef(new Set<string>());

  // Badge tab Thông báo + thông báo cục bộ cho thông báo mới (khi app chạy nền)
  useEffect(() => {
    initLocalNotify().catch(() => {});
    return subscribeNotifications(list => {
      setNotifs(list);
      for (const n of list) {
        if (
          !n.read &&
          n.createdAt > mountedAt.current &&
          !shown.current.has(n.id)
        ) {
          shown.current.add(n.id);
          showLocalNotification('ChatApp', n.text).catch(() => {});
        }
      }
    });
  }, []);
  const unread = notifs.filter(n => !n.read).length;
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPad,
          height: 60 + bottomPad,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Tin nhắn',
          tabBarIcon: ({ color }) => <MessageCircle size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{
          title: 'Danh bạ',
          tabBarIcon: ({ color }) => <Users size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Thông báo',
          tabBarBadge: unread || undefined,
          tabBarIcon: ({ color }) => <Bell size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Cài đặt',
          tabBarIcon: ({ color }) => <Settings size={22} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(
    () =>
      subscribeAuth(u => {
        setUser(u);
        setReady(true);
      }),
    [],
  );

  useEffect(() => {
    if (!user) return;
    return setupPresence(user.uid);
  }, [user]);

  if (!ready) return null;

  // Đăng nhập/đăng xuất đổi user -> stack tự đổi, không cần navigate thủ công
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
            <Stack.Screen name="GroupInfo" component={GroupInfoScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
