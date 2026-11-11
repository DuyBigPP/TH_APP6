import { ref, push, update, serverTimestamp } from 'firebase/database';
import { db } from './firebase';
import { buildSendUpdates } from '../utils/chat';
import { ConvRef, myUid, myName, newNotifId } from './chatService';

type Updates = Record<string, unknown>;

// Tin hệ thống ("A đã rời nhóm"...) đi chung lệnh update với thay đổi thành viên
function systemMessage(
  conv: ConvRef,
  text: string,
  memberIds: string[],
): Updates {
  return buildSendUpdates({
    convId: conv.id,
    convType: 'group',
    convName: conv.name,
    msgId: push(ref(db, `messages/${conv.id}`)).key!,
    msg: { senderId: myUid(), type: 'system', text },
    memberIds,
    me: myUid(),
    senderName: myName(),
    activeConvOf: {},
    newNotifId,
  });
}

function addedNotifications(
  gid: string,
  groupName: string,
  uids: string[],
): Updates {
  const u: Updates = {};
  for (const uid of uids) {
    u[`notifications/${uid}/${newNotifId()}`] = {
      type: 'group_added',
      convId: gid,
      fromUid: myUid(),
      text: `${myName()} đã thêm bạn vào nhóm "${groupName}"`,
      createdAt: serverTimestamp(),
      read: false,
    };
  }
  return u;
}

export async function createGroup(
  name: string,
  memberIds: string[],
): Promise<string> {
  const me = myUid();
  if (!name.trim() || memberIds.filter(u => u !== me).length < 2) {
    throw new Error('Nhóm cần tên và tối thiểu 2 thành viên ngoài bạn');
  }
  const gid = push(ref(db, 'conversations')).key!;
  const all = [me, ...memberIds.filter(u => u !== me)];
  const conv: ConvRef = {
    id: gid,
    type: 'group',
    name: name.trim(),
    memberIds: all,
  };
  await update(ref(db), {
    [`conversations/${gid}`]: {
      type: 'group',
      name: conv.name,
      members: Object.fromEntries(all.map(u => [u, true])),
      createdBy: me,
      createdAt: serverTimestamp(),
    },
    ...systemMessage(conv, `${myName()} đã tạo nhóm "${conv.name}"`, all),
    ...addedNotifications(
      gid,
      conv.name!,
      all.filter(u => u !== me),
    ),
  });
  return gid;
}

export function renameGroup(conv: ConvRef, name: string) {
  const renamed = { ...conv, name: name.trim() };
  return update(ref(db), {
    [`conversations/${conv.id}/name`]: renamed.name,
    ...systemMessage(
      renamed,
      `${myName()} đã đổi tên nhóm thành "${renamed.name}"`,
      conv.memberIds,
    ),
  });
}

export function addMembers(conv: ConvRef, uids: string[], names: string[]) {
  const u: Updates = {};
  for (const uid of uids) u[`conversations/${conv.id}/members/${uid}`] = true;
  return update(ref(db), {
    ...u,
    ...systemMessage(conv, `${myName()} đã thêm ${names.join(', ')}`, [
      ...conv.memberIds,
      ...uids,
    ]),
    ...addedNotifications(conv.id, conv.name ?? '', uids),
  });
}

export function removeMember(conv: ConvRef, uid: string, name: string) {
  const rest = conv.memberIds.filter(x => x !== uid);
  return update(ref(db), {
    [`conversations/${conv.id}/members/${uid}`]: null,
    [`userChats/${uid}/${conv.id}`]: null,
    ...systemMessage(conv, `${myName()} đã xóa ${name} khỏi nhóm`, rest),
  });
}

export function leaveGroup(conv: ConvRef) {
  const me = myUid();
  const rest = conv.memberIds.filter(x => x !== me);
  return update(ref(db), {
    [`conversations/${conv.id}/members/${me}`]: null,
    [`userChats/${me}/${conv.id}`]: null,
    [`typing/${conv.id}/${me}`]: null,
    ...systemMessage(conv, `${myName()} đã rời nhóm`, rest),
  });
}
