import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Search, UsersRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  subscribeUserChats,
  subscribeUsersMap,
  formatTime,
  AppUser,
  UserChat,
} from '../services/chatService';
import { colors } from '../theme/colors';
import Avatar from '../components/Avatar';

interface Props {
  navigation: any;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');
  const [conversations, setConversations] = useState<UserChat[]>([]);
  const [users, setUsers] = useState<Record<string, AppUser>>({});

  useEffect(() => subscribeUserChats(setConversations), []);
  useEffect(() => subscribeUsersMap(setUsers), []);

  // 1-1: tên + ảnh lấy từ users (luôn mới nhất); nhóm: tên nhóm lưu trong userChats
  const titleOf = (c: UserChat) =>
    c.type === 'group'
      ? c.name ?? 'Nhóm'
      : users[c.otherId ?? '']?.name ?? '...';

  const filtered = conversations.filter(c =>
    titleOf(c).toLowerCase().includes(searchText.toLowerCase()),
  );

  const renderItem = ({ item }: { item: UserChat }) => {
    const title = titleOf(item);
    const other = item.otherId ? users[item.otherId] : undefined;
    return (
      <TouchableOpacity
        style={styles.item}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('Chat', {
            convId: item.convId,
            type: item.type,
            otherId: item.otherId,
            name: title,
          })
        }
      >
        <View>
          <Avatar
            name={title}
            size={52}
            uri={other?.avatarUrl}
            group={item.type === 'group'}
          />
          {other?.online && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.info}>
          <View style={styles.topRow}>
            <Text style={styles.name} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.time}>{formatTime(item.updatedAt)}</Text>
          </View>
          <View style={styles.bottomRow}>
            <Text
              style={[
                styles.lastMessage,
                item.unread > 0 && styles.unreadMessage,
              ]}
              numberOfLines={1}
            >
              {item.lastMessage}
            </Text>
            {item.unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.headerTitle}>Đoạn chat</Text>
          <Text style={styles.headerCount}>
            {filtered.length} cuộc trò chuyện
          </Text>
        </View>
        <TouchableOpacity
          style={styles.newGroupBtn}
          onPress={() => navigation.navigate('CreateGroup')}
          accessibilityLabel="Tạo nhóm"
          activeOpacity={0.8}
        >
          <UsersRound size={18} color={colors.primary} />
          <Text style={styles.newGroupText}>Tạo nhóm</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Search size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm..."
          placeholderTextColor={colors.textMuted}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={item => item.convId}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Chưa có cuộc trò chuyện. Vào Danh bạ để bắt đầu.
          </Text>
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  headerCount: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  newGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newGroupText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: colors.success,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    height: 46,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  unreadMessage: {
    fontWeight: '600',
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 11,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 40,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default HomeScreen;
