import {
  ref,
  push,
  set,
  get,
  update,
  remove,
  onValue,
  onDisconnect,
  query,
  orderByKey,
  limitToLast,
  serverTimestamp,
} from 'firebase/database';
import { auth, db } from './firebase';
import {
  buildSendUpdates,
  buildRecallUpdates,
  buildReactionUpdates,
  ConvType,
  Message,
  UserChat,
} from '../utils/chat';

export { formatTime } from '../utils/chat';
export type { Message, UserChat } from '../utils/chat';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  online: boolean;
  lastSeen?: number;
  avatarUrl?: string;
  activeConv?: string;
}

export interface Conversation {
  id: string;
  type: ConvType;
  name?: string;
  members: Record<string, true>;
  createdBy?: string;
}

// Thông tin tối thiểu để ghi một tin vào cuộc trò chuyện
export interface ConvRef {
  id: string;
  type: ConvType;
  name?: string;
  memberIds: string[];
}

export const PAGE_SIZE = 20;

export const chatId = (a: string, b: string) => [a, b].sort().join('_');

export const myUid = () => auth.currentUser!.uid;
export const myName = () => auth.currentUser?.displayName ?? 'Người dùng';
export const newNotifId = () => push(ref(db, 'notifications')).key!;

// Mọi hàm subscribe* trả về hàm hủy lắng nghe, gọi trong cleanup của useEffect
export function subscribeUsers(cb: (users: AppUser[]) => void) {
  return onValue(ref(db, 'users'), snap => {
    const list: AppUser[] = [];
    snap.forEach(child => {
      if (child.key !== myUid()) list.push({ id: child.key!, ...child.val() });
    });
    cb(list);
  });
}

// Bản đồ uid -> user (gồm cả mình): tra tên/ảnh đại diện mới nhất ở Home, Chat
export function subscribeUsersMap(
  cb: (users: Record<string, AppUser>) => void,
) {
  return onValue(ref(db, 'users'), snap => {
    const map: Record<string, AppUser> = {};
    snap.forEach(child => {
      map[child.key!] = { id: child.key!, ...child.val() };
    });
    cb(map);
  });
}

export function subscribeUser(uid: string, cb: (user: AppUser | null) => void) {
  return onValue(ref(db, `users/${uid}`), snap =>
    cb(snap.exists() ? { id: uid, ...snap.val() } : null),
  );
}

// Tạo (nếu chưa có) cuộc trò chuyện 1-1. Phải xong trước khi lắng nghe messages/typing,
// vì luật bảo mật chỉ cho thành viên đọc -> chưa có node conversations thì bị từ chối.
export async function ensureDirect(otherId: string): Promise<string> {
  const me = myUid();
  const cid = chatId(me, otherId);
  await update(ref(db), {
    [`conversations/${cid}/type`]: 'direct',
    [`conversations/${cid}/members/${me}`]: true,
    [`conversations/${cid}/members/${otherId}`]: true,
  });
  return cid;
}

export function subscribeConversation(
  cid: string,
  cb: (conv: Conversation | null) => void,
) {
  return onValue(ref(db, `conversations/${cid}`), snap =>
    cb(snap.exists() ? { id: cid, ...snap.val() } : null),
  );
}

// Tải theo trang: lần đầu 20 tin mới nhất, mỗi lần kéo lên đầu thì pageCount + 1.
// ponytail: lắng nghe lại cửa sổ 20*pageCount tin (tải lại cả các trang cũ) để thu hồi/cảm xúc
// trên tin cũ vẫn cập nhật realtime; nếu cuộc trò chuyện rất dài thì chuyển sang get() + endBefore.
export function subscribeMessages(
  cid: string,
  pageCount: number,
  cb: (msgs: Message[]) => void,
) {
  const q = query(
    ref(db, `messages/${cid}`),
    orderByKey(),
    limitToLast(PAGE_SIZE * pageCount),
  );
  return onValue(q, snap => {
    const list: Message[] = [];
    snap.forEach(child => {
      list.push({ id: child.key!, ...child.val() });
    });
    cb(list);
  });
}

export async function fetchAllMessages(cid: string): Promise<Message[]> {
  const snap = await get(ref(db, `messages/${cid}`));
  const list: Message[] = [];
  snap.forEach(child => {
    list.push({ id: child.key!, ...child.val() });
  });
  return list;
}

export function subscribeUserChats(cb: (chats: UserChat[]) => void) {
  return onValue(ref(db, `userChats/${myUid()}`), snap => {
    const list: UserChat[] = [];
    snap.forEach(child => {
      // bỏ qua dữ liệu cũ của Bài 5 (có lastTime, không có updatedAt)
      if (child.val().updatedAt)
        list.push({ convId: child.key!, ...child.val() });
    });
    list.sort((a, b) => b.updatedAt - a.updatedAt);
    cb(list);
  });
}

// activeConvOf: uid -> cuộc trò chuyện người đó đang mở (để không gửi thông báo thừa)
export function sendMessage(
  conv: ConvRef,
  msg: Omit<Message, 'id' | 'createdAt' | 'senderId'>,
  activeConvOf: Record<string, string | undefined>,
) {
  const me = myUid();
  const msgId = push(ref(db, `messages/${conv.id}`)).key!;
  return update(
    ref(db),
    buildSendUpdates({
      convId: conv.id,
      convType: conv.type,
      convName: conv.name,
      msgId,
      msg: { ...msg, senderId: me },
      memberIds: conv.memberIds,
      me,
      senderName: myName(),
      activeConvOf,
      newNotifId,
    }),
  );
}

export function recallMessage(conv: ConvRef, msgId: string, isLast: boolean) {
  return update(
    ref(db),
    buildRecallUpdates({
      convId: conv.id,
      msgId,
      memberIds: conv.memberIds,
      isLast,
    }),
  );
}

export function toggleReaction(convId: string, msg: Message, emoji: string) {
  return update(
    ref(db),
    buildReactionUpdates({
      convId,
      msg,
      me: myUid(),
      myName: myName(),
      emoji,
      newNotifId,
    }),
  );
}

// Đang gõ: onDisconnect gỡ cờ nếu app bị tắt đột ngột -> không bị kẹt "đang soạn tin"
export function setTyping(cid: string, on: boolean) {
  const r = ref(db, `typing/${cid}/${myUid()}`);
  if (!on) return remove(r);
  // xếp hàng đồng bộ (không .then) để lệnh remove() ngay sau đó luôn chạy SAU set(true)
  onDisconnect(r).remove();
  return set(r, true);
}

export function subscribeTyping(cid: string, cb: (uids: string[]) => void) {
  return onValue(ref(db, `typing/${cid}`), snap => {
    const uids: string[] = [];
    snap.forEach(child => {
      if (child.key !== myUid() && child.val() === true) uids.push(child.key!);
    });
    cb(uids);
  });
}

export function markRead(cid: string) {
  const me = myUid();
  return update(ref(db), {
    [`readStatus/${cid}/${me}`]: serverTimestamp(),
    [`userChats/${me}/${cid}/unread`]: 0,
  });
}

export function subscribeReadStatus(
  cid: string,
  cb: (read: Record<string, number>) => void,
) {
  return onValue(ref(db, `readStatus/${cid}`), snap => cb(snap.val() ?? {}));
}

// Cuộc trò chuyện đang mở trên màn hình -> người gửi biết có cần tạo thông báo không
export function setActiveConv(cid: string | null) {
  const r = ref(db, `users/${myUid()}/activeConv`);
  if (!cid) return remove(r);
  onDisconnect(r).remove();
  return set(r, cid);
}
