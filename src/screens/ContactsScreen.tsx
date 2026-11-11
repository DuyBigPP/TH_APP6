import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Search } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  subscribeUsers,
  chatId,
  myUid,
  AppUser,
} from '../services/chatService';
import { lastSeenLabel } from '../utils/chat';
import { colors } from '../theme/colors';
import Avatar from '../components/Avatar';

interface Props {
  navigation: any;
}

const ContactsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState<AppUser[]>([]);

  const [now, setNow] = useState(Date.now());

  useEffect(() => subscribeUsers(setUsers), []);
  // cập nhật "Hoạt động X phút trước" mỗi 30 giây
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  const openChat = (user: AppUser) => {
    navigation.navigate('Chat', {
      convId: chatId(myUid(), user.id),
      type: 'direct',
      otherId: user.id,
      name: user.name,
    });
  };

  const renderItem = ({ item }: { item: AppUser }) => (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.7}
      onPress={() => openChat(item)}
    >
      <View>
        <Avatar name={item.name} size={50} uri={item.avatarUrl} />
        <View
          style={[
            styles.onlineDot,
            {
              backgroundColor: item.online ? colors.success : colors.textMuted,
            },
          ]}
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text
          style={{
            fontSize: 13,
            color: item.online ? colors.success : colors.textMuted,
          }}
        >
          {lastSeenLabel(item.online, item.lastSeen, now)}
        </Text>
      </View>
      <View style={styles.chatButton}>
        <Text style={styles.chatButtonText}>Nhắn tin</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Danh bạ</Text>
        <Text style={styles.headerCount}>{filtered.length} người dùng</Text>
      </View>

      <View style={styles.searchWrap}>
        <Search size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm bạn bè..."
          placeholderTextColor={colors.textMuted}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.text },
  headerCount: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
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
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
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
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatButton: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  chatButtonText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
});

export default ContactsScreen;
