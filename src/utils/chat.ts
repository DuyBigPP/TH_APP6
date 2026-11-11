// Logic thuần (không gọi Firebase) -> kiểm thử được bằng jest: __tests__/chat.test.ts
import { increment, serverTimestamp } from 'firebase/database';

export type MsgType = 'text' | 'image' | 'location' | 'system';
export type ConvType = 'direct' | 'group';

export interface Message {
  id: string;
  senderId: string;
  type: MsgType;
  text?: string;
  imageUrl?: string;
  lat?: number;
  lng?: number;
  createdAt: number;
  recalled?: boolean;
  reactions?: Record<string, string>;
  replyTo?: { id: string; senderName: string; preview: string };
}

export interface UserChat {
  convId: string;
  type: ConvType;
  otherId?: string;
  name?: string;
  lastMessage: string;
  lastSenderId: string;
  lastMsgId: string;
  updatedAt: number;
  unread: number;
}

export interface AppNotif {
  id: string;
  type: 'message' | 'group_added' | 'reaction';
  convId: string;
  fromUid: string;
  text: string;
  createdAt: number;
  read: boolean;
}

export const REACTIONS = ['👍', '❤️', '😂', '😮', '😢'];
export const RECALLED_TEXT = 'Tin nhắn đã được thu hồi';

export function formatTime(ts?: number) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

// Dòng xem trước ở Home / thông báo
export function previewOf(
  m: Pick<Message, 'type' | 'text' | 'recalled'>,
): string {
  if (m.recalled) return RECALLED_TEXT;
  if (m.type === 'image') return '📷 Hình ảnh';
  if (m.type === 'location') return '📍 Vị trí';
  return m.text ?? '';
}

export function lastSeenLabel(
  online: boolean,
  lastSeen: number | undefined,
  now: number,
): string {
  if (online) return 'Đang hoạt động';
  if (!lastSeen) return 'Không hoạt động';
  const min = Math.floor((now - lastSeen) / 60_000);
  if (min < 1) return 'Hoạt động vừa xong';
  if (min < 60) return `Hoạt động ${min} phút trước`;
  if (min < 1440) return `Hoạt động ${Math.floor(min / 60)} giờ trước`;
  return `Hoạt động ${Math.floor(min / 1440)} ngày trước`;
}

// Trạng thái tin cuối của mình: chỉ tính người KHÁC đã đọc sau thời điểm gửi
export function seenLabel(
  lastMine: { createdAt: number },
  read: Record<string, number>,
  myUid: string,
  type: ConvType,
): string {
  const readers = Object.entries(read).filter(
    ([uid, t]) => uid !== myUid && t >= lastMine.createdAt,
  );
  if (!readers.length) return 'Đã gửi';
  if (type === 'group') return `Đã xem bởi ${readers.length} người`;
  return `Đã xem ${formatTime(readers[0][1])}`;
}

export function groupReactions(
  r?: Record<string, string>,
): { emoji: string; count: number }[] {
  const values = Object.values(r ?? {});
  return REACTIONS.map(emoji => ({
    emoji,
    count: values.filter(v => v === emoji).length,
  })).filter(x => x.count > 0);
}

// Thu nhỏ để cạnh dài <= max, giữ tỉ lệ
export function fitWithin(
  w: number,
  h: number,
  max = 1024,
): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(w, h));
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

// Bỏ dấu tiếng Việt + chữ thường để tìm kiếm
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

export function searchMessages(msgs: Message[], q: string): Message[] {
  const key = normalize(q.trim());
  if (!key) return [];
  return msgs.filter(
    m =>
      m.type === 'text' && !m.recalled && normalize(m.text ?? '').includes(key),
  );
}

export function typingLabel(
  uids: string[],
  names: Record<string, string>,
  type: ConvType,
): string | null {
  if (!uids.length) return null;
  if (type === 'direct') return 'đang soạn tin…';
  return `${uids.map(u => names[u] ?? 'Ai đó').join(', ')} đang soạn tin…`;
}

// ---------- Multi-path update: mọi thay đổi của 1 thao tác gom vào MỘT update(ref(db), ...) ----------
type Updates = Record<string, unknown>;

// Gửi tin: ghi tin + lastMessage + unread (increment, không đọc rồi cộng) của mọi thành viên
// + thông báo cho thành viên không đang mở cuộc trò chuyện này
export function buildSendUpdates(a: {
  convId: string;
  convType: ConvType;
  convName?: string;
  msgId: string;
  msg: Omit<Message, 'id' | 'createdAt'>;
  memberIds: string[];
  me: string;
  senderName: string;
  activeConvOf: Record<string, string | undefined>;
  newNotifId: () => string;
}): Updates {
  const { convId, msgId, me } = a;
  const preview = previewOf(a.msg);
  const u: Updates = {
    [`messages/${convId}/${msgId}`]: { ...a.msg, createdAt: serverTimestamp() },
  };
  for (const uid of a.memberIds) {
    const p = `userChats/${uid}/${convId}`;
    u[`${p}/type`] = a.convType;
    u[`${p}/lastMessage`] = preview;
    u[`${p}/lastSenderId`] = me;
    u[`${p}/lastMsgId`] = msgId;
    u[`${p}/updatedAt`] = serverTimestamp();
    u[`${p}/unread`] = uid === me ? 0 : increment(1);
    if (a.convType === 'direct')
      u[`${p}/otherId`] = a.memberIds.find(x => x !== uid);
    else u[`${p}/name`] = a.convName;
    if (
      uid !== me &&
      a.msg.type !== 'system' &&
      a.activeConvOf[uid] !== convId
    ) {
      u[`notifications/${uid}/${a.newNotifId()}`] = {
        type: 'message',
        convId,
        fromUid: me,
        text: `${a.senderName}: ${preview}`,
        createdAt: serverTimestamp(),
        read: false,
      };
    }
  }
  return u;
}

// Thu hồi: chỉ đánh dấu recalled (không xoá node); nếu là tin cuối thì cập nhật dòng xem trước ở Home
export function buildRecallUpdates(a: {
  convId: string;
  msgId: string;
  memberIds: string[];
  isLast: boolean;
}): Updates {
  const u: Updates = { [`messages/${a.convId}/${a.msgId}/recalled`]: true };
  if (a.isLast) {
    for (const uid of a.memberIds)
      u[`userChats/${uid}/${a.convId}/lastMessage`] = RECALLED_TEXT;
  }
  return u;
}

// Thả cảm xúc: bấm lại đúng emoji đang chọn = gỡ; báo cho người gửi (trừ khi tự thả vào tin mình)
export function buildReactionUpdates(a: {
  convId: string;
  msg: Message;
  me: string;
  myName: string;
  emoji: string;
  newNotifId: () => string;
}): Updates {
  const removing = a.msg.reactions?.[a.me] === a.emoji;
  const u: Updates = {
    [`messages/${a.convId}/${a.msg.id}/reactions/${a.me}`]: removing
      ? null
      : a.emoji,
  };
  if (!removing && a.msg.senderId !== a.me) {
    u[`notifications/${a.msg.senderId}/${a.newNotifId()}`] = {
      type: 'reaction',
      convId: a.convId,
      fromUid: a.me,
      text: `${a.myName} đã thả ${a.emoji} vào tin nhắn của bạn`,
      createdAt: serverTimestamp(),
      read: false,
    };
  }
  return u;
}
