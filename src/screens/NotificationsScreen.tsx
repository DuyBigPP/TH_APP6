import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { MessageCircle, UsersRound, Heart } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  subscribeNotifications,
  markNotifRead,
  markAllNotifsRead,
  AppNotif,
} from '../services/notificationService';
import {
  subscribeUserChats,
  subscribeUsersMap,
  AppUser,
  UserChat,
} from '../services/chatService';
import { formatTime } from '../utils/chat';
import { colors } from '../theme/colors';

const ICONS = {
  message: MessageCircle,
  group_added: UsersRound,
  reaction: Heart,
};
const TITLES = {
  message: 'Tin nhắn mới',
  group_added: 'Được thêm vào nhóm',
  reaction: 'Cảm xúc mới',
};

// Ngày + giờ ngắn gọn: hôm nay chỉ hiện giờ
const timeLabel = (ts: number) => {
  const d = new Date(ts);
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? formatTime(ts)
    : `${d.getDate()}/${d.getMonth() + 1} ${formatTime(ts)}`;
};

const NotificationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<AppNotif[]>([]);
  const [chats, setChats] = useState<UserChat[]>([]);
  const [users, setUsers] = useState<Record<string, AppUser>>({});

  useEffect(() => subscribeNotifications(setData), []);
  useEffect(() => subscribeUserChats(setChats), []);
  useEffect(() => subscribeUsersMap(setUsers), []);

  const unread = data.filter(n => !n.read);

  // Nhấn -> đánh dấu đã đọc + mở đúng cuộc trò chuyện
  const open = (n: AppNotif) => {
    if (!n.read) markNotifRead(n.id).catch(() => {});
    const chat = chats.find(c => c.convId === n.convId);
    if (!chat) return; // đã rời nhóm / cuộc trò chuyện không còn
    const name =
      chat.type === 'group' ? chat.name : users[chat.otherId ?? '']?.name;
    navigation.navigate('Chat', {
      convId: chat.convId,
      type: chat.type,
      otherId: chat.otherId,
      name,
    });
  };

  const renderItem = ({ item }: { item: AppNotif }) => {
    const Icon = ICONS[item.type] ?? MessageCircle;
    return (
      <TouchableOpacity
        style={[styles.item, !item.read && styles.itemUnread]}
        activeOpacity={0.7}
        onPress={() => open(item)}
      >
        <View style={[styles.iconWrap, !item.read && styles.iconWrapUnread]}>
          <Icon
            size={20}
            color={!item.read ? colors.primary : colors.textMuted}
          />
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, !item.read && styles.titleUnread]}>
            {TITLES[item.type]}
          </Text>
          <Text style={styles.text} numberOfLines={2}>
            {item.text}
          </Text>
          <Text style={styles.time}>{timeLabel(item.createdAt)}</Text>
        </View>
        {!item.read && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.headerTitle}>Thông báo</Text>
          <Text style={styles.headerCount}>
            {unread.length > 0 ? `${unread.length} chưa đọc` : 'Đã đọc tất cả'}
          </Text>
        </View>
        {unread.length > 0 && (
          <TouchableOpacity
            onPress={() =>
              markAllNotifsRead(unread.map(n => n.id)).catch(() => {})
            }
          >
            <Text style={styles.markAll}>Đánh dấu tất cả đã đọc</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.empty}>Chưa có thông báo nào.</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.text },
  headerCount: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  markAll: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemUnread: {
    backgroundColor: colors.unreadBg,
    borderColor: '#BFDBFE',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapUnread: { backgroundColor: '#DBEAFE' },
  content: { flex: 1, marginLeft: 12 },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  titleUnread: { fontWeight: '800' },
  text: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 20,
  },
  time: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 6,
    marginLeft: 8,
  },
});

export default NotificationsScreen;
