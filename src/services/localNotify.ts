import { AppState } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';

// Phần C: thông báo cục bộ (notifee) khi app đang chạy nền
let channelId: Promise<string> | null = null;

export function initLocalNotify() {
  channelId ??= notifee
    .requestPermission()
    .then(() =>
      notifee.createChannel({
        id: 'messages',
        name: 'Tin nhắn',
        importance: AndroidImportance.HIGH,
      }),
    );
  return channelId;
}

export async function showLocalNotification(title: string, body: string) {
  if (AppState.currentState === 'active') return; // đang mở app thì đã có badge
  await notifee.displayNotification({
    title,
    body,
    android: {
      channelId: await initLocalNotify(),
      pressAction: { id: 'default' },
    },
  });
}
