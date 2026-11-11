import { ref, update, onValue } from 'firebase/database';
import { auth, db } from './firebase';
import { AppNotif } from '../utils/chat';

export type { AppNotif } from '../utils/chat';

const myUid = () => auth.currentUser!.uid;

// Thông báo được ghi kèm khi gửi tin / thêm vào nhóm / thả cảm xúc (xem utils/chat.ts)
export function subscribeNotifications(cb: (list: AppNotif[]) => void) {
  return onValue(ref(db, `notifications/${myUid()}`), snap => {
    const list: AppNotif[] = [];
    snap.forEach(child => {
      list.push({ id: child.key!, ...child.val() });
    });
    list.sort((a, b) => b.createdAt - a.createdAt);
    cb(list);
  });
}

export function markNotifRead(id: string) {
  return update(ref(db, `notifications/${myUid()}/${id}`), { read: true });
}

export function markAllNotifsRead(ids: string[]) {
  const u: Record<string, boolean> = {};
  for (const id of ids) u[`notifications/${myUid()}/${id}/read`] = true;
  return update(ref(db), u);
}
