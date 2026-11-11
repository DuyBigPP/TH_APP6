import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import { ArrowLeft, Send, Search, X, Camera, Reply } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';
import Clipboard from '@react-native-clipboard/clipboard';
import { Asset } from 'react-native-image-picker';
import {
  ensureDirect,
  subscribeConversation,
  subscribeMessages,
  subscribeUsersMap,
  subscribeTyping,
  subscribeReadStatus,
  sendMessage,
  recallMessage,
  toggleReaction,
  setTyping,
  setActiveConv,
  markRead,
  fetchAllMessages,
  myUid,
  PAGE_SIZE,
  AppUser,
  Conversation,
  ConvRef,
  Message,
} from '../services/chatService';
import { uploadImage } from '../services/uploadService';
import { pickImage } from '../utils/pickImage';
import {
  formatTime,
  lastSeenLabel,
  previewOf,
  searchMessages,
  seenLabel,
  typingLabel,
  ConvType,
} from '../utils/chat';
import { colors } from '../theme/colors';
import Avatar from '../components/Avatar';
import MessageBubble, { ListItem } from '../components/MessageBubble';
import MessageMenu from '../components/MessageMenu';
import ActionSheet from '../components/ActionSheet';
import ImageViewer from '../components/ImageViewer';

interface Props {
  route: any;
  navigation: any;
}

interface Pending {
  id: string;
  asset: Asset;
  status: 'uploading' | 'error';
}

const TYPING_TIMEOUT = 3000;

async function requestLocationPermission() {
  if (Platform.OS !== 'android') return true;
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

const ChatScreen: React.FC<Props> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { convId, otherId, name } = route.params as {
    convId: string;
    type: ConvType;
    otherId?: string;
    name: string;
  };
  const type: ConvType = route.params.type ?? 'direct';
  const isGroup = type === 'group';
  const myId = myUid();
  const listRef = useRef<FlatList<ListItem>>(null);

  const [ready, setReady] = useState(isGroup);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [users, setUsers] = useState<Record<string, AppUser>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [pages, setPages] = useState(1);
  const [typingUids, setTypingUids] = useState<string[]>([]);
  const [readStatus, setReadStatus] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now());
  const [focused, setFocused] = useState(true);

  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [menuMsg, setMenuMsg] = useState<Message | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [photoSheet, setPhotoSheet] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const [sendingLocation, setSendingLocation] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [allMsgs, setAllMsgs] = useState<Message[]>([]);

  // ---- Lắng nghe dữ liệu (mọi listener được hủy trong cleanup) ----
  useEffect(() => {
    if (isGroup || !otherId) return;
    let alive = true;
    ensureDirect(otherId)
      .then(() => alive && setReady(true))
      .catch(e => Alert.alert('Lỗi', e.message));
    return () => {
      alive = false;
    };
  }, [isGroup, otherId]);

  useEffect(() => subscribeUsersMap(setUsers), []);
  useEffect(
    () => (ready ? subscribeConversation(convId, setConv) : undefined),
    [ready, convId],
  );
  useEffect(
    () => (ready ? subscribeMessages(convId, pages, setMessages) : undefined),
    [ready, convId, pages],
  );
  useEffect(
    () => (ready ? subscribeTyping(convId, setTypingUids) : undefined),
    [ready, convId],
  );
  useEffect(
    () => (ready ? subscribeReadStatus(convId, setReadStatus) : undefined),
    [ready, convId],
  );

  // "Hoạt động X phút trước" tự cập nhật
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Đang mở màn hình -> không nhận thông báo tin mới của cuộc trò chuyện này
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      setActiveConv(convId).catch(() => {});
      return () => {
        setFocused(false);
        setActiveConv(null).catch(() => {});
      };
    }, [convId]),
  );

  // Có tin mới khi đang xem -> đánh dấu đã đọc (readStatus + unread = 0).
  // Theo id tin cuối (không theo số lượng: cửa sổ 20 tin đầy thì length không đổi nữa)
  const lastMsgId = messages[messages.length - 1]?.id;
  useEffect(() => {
    if (ready && focused) markRead(convId).catch(() => {});
  }, [ready, focused, convId, lastMsgId]);

  // ---- Đang soạn tin: bật khi gõ, tự tắt sau 3s, khi gửi hoặc rời màn hình ----
  const typingOn = useRef(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const stopTyping = useCallback(() => {
    clearTimeout(typingTimer.current);
    if (typingOn.current) {
      typingOn.current = false;
      setTyping(convId, false).catch(() => {});
    }
  }, [convId]);
  useEffect(() => stopTyping, [stopTyping]);

  const onChangeText = (text: string) => {
    setInput(text);
    if (!ready) return;
    if (!text) return stopTyping();
    if (!typingOn.current) {
      typingOn.current = true;
      setTyping(convId, true).catch(() => {});
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, TYPING_TIMEOUT);
  };

  // ---- Dữ liệu suy ra ----
  const memberIds = useMemo(
    () =>
      conv
        ? Object.keys(conv.members ?? {})
        : otherId
        ? [myId, otherId]
        : [myId],
    [conv, otherId, myId],
  );
  const title = isGroup
    ? conv?.name ?? name
    : users[otherId ?? '']?.name ?? name;
  const convRef: ConvRef = {
    id: convId,
    type,
    name: conv?.name ?? name,
    memberIds,
  };
  const activeConvOf = Object.fromEntries(
    memberIds.map(u => [u, users[u]?.activeConv]),
  );
  const nameOf = (uid: string) => users[uid]?.name ?? 'Người dùng';
  const other = otherId ? users[otherId] : undefined;
  const onlineCount = memberIds.filter(u => users[u]?.online).length;

  const statusLine =
    typingLabel(
      typingUids,
      Object.fromEntries(memberIds.map(u => [u, nameOf(u)])),
      type,
    ) ??
    (isGroup
      ? `${memberIds.length} thành viên · ${onlineCount} đang online`
      : lastSeenLabel(!!other?.online, other?.lastSeen, now));

  const lastMine = [...messages]
    .reverse()
    .find(m => m.senderId === myId && m.type !== 'system');
  const lastMineStatus = lastMine
    ? seenLabel(lastMine, readStatus, myId, type)
    : undefined;

  // FlatList đảo ngược: phần tử 0 nằm dưới cùng -> thêm tin cũ vào cuối mảng không làm nhảy danh sách
  const listData: ListItem[] = useMemo(
    () => [
      ...[...pending].reverse().map(p => ({
        id: p.id,
        senderId: myId,
        type: 'image' as const,
        createdAt: Date.now(),
        localUri: p.asset.uri,
        pending: p.status,
      })),
      ...[...messages].reverse(),
    ],
    [pending, messages, myId],
  );

  const loadOlder = () => {
    if (messages.length >= PAGE_SIZE * pages) setPages(p => p + 1);
  };

  // ---- Gửi ----
  const send = (msg: Omit<Message, 'id' | 'createdAt' | 'senderId'>) =>
    sendMessage(convRef, msg, activeConvOf).catch(e =>
      Alert.alert('Lỗi gửi tin', e.message),
    );

  const sendText = () => {
    const text = input.trim();
    if (!text || !ready) return;
    setInput('');
    stopTyping();
    const reply = replyTo
      ? {
          replyTo: {
            id: replyTo.id,
            senderName: nameOf(replyTo.senderId),
            preview: previewOf(replyTo),
          },
        }
      : {};
    setReplyTo(null);
    send({ type: 'text', text, ...reply });
  };

  const shareLocation = async () => {
    if (!(await requestLocationPermission())) {
      Alert.alert(
        'Không có quyền vị trí',
        'Hãy cho phép ứng dụng truy cập vị trí để gửi vị trí.',
      );
      return;
    }
    setSendingLocation(true);
    Geolocation.getCurrentPosition(
      pos => {
        send({
          type: 'location',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }).finally(() => setSendingLocation(false));
      },
      err => {
        setSendingLocation(false);
        Alert.alert('Không lấy được vị trí', err.message);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 },
    );
  };

  // ---- Ảnh: chọn (đã thu nhỏ <= 1024px) -> bong bóng tạm -> Cloudinary -> lưu URL ----
  const upload = async (asset: Asset, id: string) => {
    setPending(list => {
      const rest = list.filter(p => p.id !== id);
      return [...rest, { id, asset, status: 'uploading' }];
    });
    try {
      const imageUrl = await uploadImage({
        uri: asset.uri!,
        type: asset.type,
        fileName: asset.fileName,
      });
      await sendMessage(convRef, { type: 'image', imageUrl }, activeConvOf);
      setPending(list => list.filter(p => p.id !== id));
    } catch {
      setPending(list =>
        list.map(p => (p.id === id ? { ...p, status: 'error' } : p)),
      );
    }
  };

  const sendPhoto = async (source: 'camera' | 'library') => {
    const asset = await pickImage(source);
    if (asset) upload(asset, `local-${Date.now()}`);
  };

  // ---- Menu nhấn giữ ----
  const recall = (m: Message) =>
    recallMessage(
      convRef,
      m.id,
      m.id === messages[messages.length - 1]?.id,
    ).catch(e => Alert.alert('Không thu hồi được', e.message));

  const scrollToMessage = (id: string) => {
    const index = listData.findIndex(m => m.id === id);
    if (index >= 0)
      listRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
  };

  // ---- Tìm kiếm trong cuộc trò chuyện (Phần C) ----
  const openSearch = () => {
    setSearchOpen(true);
    fetchAllMessages(convId)
      .then(setAllMsgs)
      .catch(() => {});
  };
  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQ('');
  };
  const results = searchOpen ? searchMessages(allMsgs, searchQ).reverse() : [];

  const renderItem = ({ item }: { item: ListItem }) => {
    const isMe = item.senderId === myId;
    return (
      <MessageBubble
        msg={item}
        isMe={isMe}
        senderName={nameOf(item.senderId)}
        senderAvatar={users[item.senderId]?.avatarUrl}
        showSender={isGroup && !isMe}
        status={item.id === lastMine?.id ? lastMineStatus : undefined}
        onLongPress={() => !item.recalled && setMenuMsg(item)}
        onPressImage={setViewerUrl}
        onPressQuote={scrollToMessage}
        onRetry={() => {
          const p = pending.find(x => x.id === item.id);
          if (p) upload(p.asset, p.id);
        }}
      />
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
        >
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerMain}
          activeOpacity={isGroup ? 0.7 : 1}
          onPress={() =>
            isGroup && navigation.navigate('GroupInfo', { convId })
          }
        >
          <View>
            <Avatar
              name={title}
              size={40}
              uri={other?.avatarUrl}
              group={isGroup}
            />
            {!isGroup && (
              <View
                style={[
                  styles.onlineDot,
                  {
                    backgroundColor: other?.online
                      ? colors.success
                      : colors.textMuted,
                  },
                ]}
              />
            )}
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.headerStatus} numberOfLines={1}>
              {statusLine}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={searchOpen ? closeSearch : openSearch}
          style={styles.iconBtn}
        >
          {searchOpen ? (
            <X size={22} color="#fff" />
          ) : (
            <Search size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {searchOpen && (
        <View style={styles.searchBox}>
          <View style={styles.searchWrap}>
            <Search size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm trong cuộc trò chuyện..."
              placeholderTextColor={colors.textMuted}
              value={searchQ}
              onChangeText={setSearchQ}
              autoFocus
            />
          </View>
          {searchQ.trim() !== '' && (
            <View style={styles.results}>
              <Text style={styles.resultsCount}>{results.length} kết quả</Text>
              {results.slice(0, 8).map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={styles.resultItem}
                  onPress={() => {
                    closeSearch();
                    scrollToMessage(m.id);
                  }}
                >
                  <Text style={styles.resultName}>
                    {nameOf(m.senderId)} · {formatTime(m.createdAt)}
                  </Text>
                  <Text style={styles.resultText} numberOfLines={1}>
                    {m.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      <FlatList
        ref={listRef}
        inverted
        data={listData}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onEndReached={loadOlder}
        onEndReachedThreshold={0.2}
        onScrollToIndexFailed={() => {}}
      />

      {replyTo && (
        <View style={styles.replyBar}>
          <Reply size={18} color={colors.primary} />
          <View style={styles.replyInfo}>
            <Text style={styles.replyName}>
              Trả lời {nameOf(replyTo.senderId)}
            </Text>
            <Text style={styles.replyText} numberOfLines={1}>
              {previewOf(replyTo)}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <X size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.roundBtn}
          onPress={() => setPhotoSheet(true)}
          accessibilityLabel="Gửi ảnh"
          activeOpacity={0.8}
        >
          <Camera size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roundBtn, sendingLocation && styles.sendBtnDisabled]}
          onPress={shareLocation}
          disabled={sendingLocation}
          accessibilityLabel="Gửi vị trí"
          activeOpacity={0.8}
        >
          <Text style={styles.locationBtnText}>📍</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={onChangeText}
          onSubmitEditing={sendText}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={sendText}
          disabled={!input.trim()}
          activeOpacity={0.8}
        >
          <Send size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <MessageMenu
        msg={menuMsg}
        myId={myId}
        onClose={() => setMenuMsg(null)}
        onReact={emoji =>
          menuMsg && toggleReaction(convId, menuMsg, emoji).catch(() => {})
        }
        onReply={() => setReplyTo(menuMsg)}
        onCopy={() => menuMsg?.text && Clipboard.setString(menuMsg.text)}
        onRecall={() => menuMsg && recall(menuMsg)}
      />
      <ActionSheet
        visible={photoSheet}
        title="Gửi ảnh"
        onClose={() => setPhotoSheet(false)}
        options={[
          { label: 'Chụp ảnh', onPress: () => sendPhoto('camera') },
          { label: 'Chọn từ thư viện', onPress: () => sendPhoto('library') },
        ]}
      />
      <ImageViewer url={viewerUrl} onClose={() => setViewerUrl(null)} />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
  },
  iconBtn: { padding: 6 },
  headerMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 17, fontWeight: '800', color: '#fff' },
  headerStatus: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  searchBox: {
    backgroundColor: '#fff',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  results: { marginTop: 8 },
  resultsCount: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  resultItem: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resultName: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  resultText: { fontSize: 14, color: colors.text, marginTop: 2 },
  list: { padding: 16, paddingBottom: 8 },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  replyInfo: {
    flex: 1,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: 8,
  },
  replyName: { fontSize: 12, fontWeight: '700', color: colors.primary },
  replyText: { fontSize: 13, color: colors.textSecondary },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationBtnText: { fontSize: 19 },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 46,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});

export default ChatScreen;
