import { increment, serverTimestamp } from 'firebase/database';
import {
  buildSendUpdates,
  buildRecallUpdates,
  buildReactionUpdates,
  previewOf,
  lastSeenLabel,
  seenLabel,
  groupReactions,
  fitWithin,
  searchMessages,
  typingLabel,
  Message,
} from '../src/utils/chat';

const NOW = new Date(2026, 10, 11, 14, 30).getTime();
const MIN = 60_000;

test('previewOf', () => {
  expect(previewOf({ type: 'text', text: 'hi' })).toBe('hi');
  expect(previewOf({ type: 'image' })).toBe('📷 Hình ảnh');
  expect(previewOf({ type: 'location' })).toBe('📍 Vị trí');
  expect(previewOf({ type: 'text', text: 'x', recalled: true })).toBe(
    'Tin nhắn đã được thu hồi',
  );
});

test('lastSeenLabel', () => {
  expect(lastSeenLabel(true, 0, NOW)).toBe('Đang hoạt động');
  expect(lastSeenLabel(false, NOW - 30_000, NOW)).toBe('Hoạt động vừa xong');
  expect(lastSeenLabel(false, NOW - 5 * MIN, NOW)).toBe(
    'Hoạt động 5 phút trước',
  );
  expect(lastSeenLabel(false, NOW - 3 * 60 * MIN, NOW)).toBe(
    'Hoạt động 3 giờ trước',
  );
  expect(lastSeenLabel(false, NOW - 2 * 1440 * MIN, NOW)).toBe(
    'Hoạt động 2 ngày trước',
  );
  expect(lastSeenLabel(false, undefined, NOW)).toBe('Không hoạt động');
});

test('seenLabel', () => {
  const mine = { createdAt: NOW - MIN };
  expect(seenLabel(mine, { me: NOW, b: NOW - 2 * MIN }, 'me', 'direct')).toBe(
    'Đã gửi',
  );
  expect(seenLabel(mine, { b: NOW }, 'me', 'direct')).toBe('Đã xem 14:30');
  expect(seenLabel(mine, { b: NOW, c: NOW, d: 0 }, 'me', 'group')).toBe(
    'Đã xem bởi 2 người',
  );
});

test('groupReactions keeps REACTIONS order + counts', () => {
  expect(groupReactions({ a: '❤️', b: '👍', c: '❤️' })).toEqual([
    { emoji: '👍', count: 1 },
    { emoji: '❤️', count: 2 },
  ]);
  expect(groupReactions(undefined)).toEqual([]);
});

test('fitWithin', () => {
  expect(fitWithin(4000, 3000)).toEqual({ width: 1024, height: 768 });
  expect(fitWithin(1000, 3000)).toEqual({ width: 341, height: 1024 });
  expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
});

test('searchMessages: diacritic/case-insensitive, text only, skips recalled', () => {
  const ms = [
    { id: '1', type: 'text', text: 'Đi ăn phở' },
    { id: '2', type: 'text', text: 'pho bo', recalled: true },
    { id: '3', type: 'image' },
  ] as Message[];
  expect(searchMessages(ms, 'PHO').map(m => m.id)).toEqual(['1']);
  expect(searchMessages(ms, 'di an').map(m => m.id)).toEqual(['1']);
  expect(searchMessages(ms, '  ')).toEqual([]);
});

test('typingLabel', () => {
  expect(typingLabel([], {}, 'direct')).toBeNull();
  expect(typingLabel(['b'], { b: 'Bình' }, 'direct')).toBe('đang soạn tin…');
  expect(typingLabel(['b'], { b: 'Bình' }, 'group')).toBe(
    'Bình đang soạn tin…',
  );
});

// ---------- multi-path update builders ----------

const base = {
  convId: 'a_b',
  convType: 'direct' as const,
  msgId: 'm1',
  msg: { senderId: 'a', type: 'image' as const, imageUrl: 'u' },
  memberIds: ['a', 'b'],
  me: 'a',
  senderName: 'An',
  activeConvOf: {},
  newNotifId: () => 'n1',
};

test('send: one object, increment for others, 0 for me, preview', () => {
  const u = buildSendUpdates(base);
  expect(u['messages/a_b/m1']).toEqual({
    senderId: 'a',
    type: 'image',
    imageUrl: 'u',
    createdAt: serverTimestamp(),
  });
  expect(u['userChats/b/a_b/unread']).toEqual(increment(1));
  expect(u['userChats/a/a_b/unread']).toBe(0);
  expect(u['userChats/b/a_b/lastMessage']).toBe('📷 Hình ảnh');
  expect(u['userChats/b/a_b/otherId']).toBe('a');
  expect(u['userChats/a/a_b/otherId']).toBe('b');
  expect(u['userChats/b/a_b/lastMsgId']).toBe('m1');
  expect(u['notifications/b/n1']).toMatchObject({
    type: 'message',
    convId: 'a_b',
    fromUid: 'a',
    read: false,
  });
  expect(u['notifications/a/n1']).toBeUndefined();
});

test('send: no notification for member currently in the conv; group writes name', () => {
  const u = buildSendUpdates({
    ...base,
    convType: 'group',
    convName: 'Nhóm',
    convId: 'g',
    memberIds: ['a', 'b', 'c'],
    activeConvOf: { b: 'g' },
  });
  expect(u['notifications/b/n1']).toBeUndefined();
  expect(u['notifications/c/n1']).toBeDefined();
  expect(u['userChats/c/g/name']).toBe('Nhóm');
});

test('recall: flag only, Home preview only when last', () => {
  expect(
    buildRecallUpdates({
      convId: 'g',
      msgId: 'm',
      memberIds: ['a', 'b'],
      isLast: false,
    }),
  ).toEqual({
    'messages/g/m/recalled': true,
  });
  expect(
    buildRecallUpdates({
      convId: 'g',
      msgId: 'm',
      memberIds: ['a', 'b'],
      isLast: true,
    })['userChats/b/g/lastMessage'],
  ).toBe('Tin nhắn đã được thu hồi');
});

test('reaction: toggle off, no self-notification', () => {
  const msg = {
    id: 'm',
    senderId: 'b',
    type: 'text',
    text: 'hi',
    createdAt: 1,
    reactions: { a: '❤️' },
  } as Message;
  const args = {
    convId: 'g',
    msg,
    me: 'a',
    myName: 'An',
    newNotifId: () => 'n',
  };
  expect(buildReactionUpdates({ ...args, emoji: '❤️' })).toEqual({
    'messages/g/m/reactions/a': null,
  });
  const add = buildReactionUpdates({ ...args, emoji: '😂' });
  expect(add['messages/g/m/reactions/a']).toBe('😂');
  expect(add['notifications/b/n']).toMatchObject({
    type: 'reaction',
    fromUid: 'a',
  });
  expect(
    Object.keys(
      buildReactionUpdates({
        ...args,
        msg: { ...msg, senderId: 'a' },
        emoji: '😂',
      }),
    ),
  ).toEqual(['messages/g/m/reactions/a']);
});

test('send: system message creates no "message" notification', () => {
  const u = buildSendUpdates({
    ...base,
    msg: { senderId: 'a', type: 'system', text: 'An đã tạo nhóm' },
  });
  expect(u['notifications/b/n1']).toBeUndefined();
  expect(u['userChats/b/a_b/lastMessage']).toBe('An đã tạo nhóm');
});
