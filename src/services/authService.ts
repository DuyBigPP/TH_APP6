import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  ref,
  set,
  update,
  onValue,
  onDisconnect,
  serverTimestamp,
} from 'firebase/database';
import { auth, db } from './firebase';

export async function register(name: string, email: string, password: string) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName: name });
  await set(ref(db, `users/${user.uid}`), {
    name,
    email,
    online: true,
    lastSeen: serverTimestamp(),
  });
}

export function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  const uid = auth.currentUser?.uid;
  if (uid) {
    await update(ref(db, `users/${uid}`), {
      online: false,
      lastSeen: serverTimestamp(),
    });
  }
  await signOut(auth);
}

export function subscribeAuth(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

// Online khi còn kết nối, server tự set offline khi app mất kết nối
export function setupPresence(uid: string) {
  const userRef = ref(db, `users/${uid}`);
  return onValue(ref(db, '.info/connected'), snap => {
    if (snap.val() !== true) return;
    onDisconnect(userRef)
      .update({ online: false, lastSeen: serverTimestamp() })
      .then(() => update(userRef, { online: true }));
  });
}

export function friendlyAuthError(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Sai email hoặc mật khẩu';
    case 'auth/invalid-email':
      return 'Email không hợp lệ';
    case 'auth/email-already-in-use':
      return 'Email đã được sử dụng';
    case 'auth/weak-password':
      return 'Mật khẩu tối thiểu 6 ký tự';
    case 'auth/network-request-failed':
      return 'Lỗi mạng, vui lòng thử lại';
    default:
      return 'Có lỗi xảy ra: ' + code;
  }
}

// Phần C: đổi họ tên / ảnh đại diện -> Danh bạ, Home, Chat đọc users/{uid} nên tự cập nhật
export async function updateMyProfile(p: {
  name?: string;
  avatarUrl?: string;
}) {
  const user = auth.currentUser!;
  if (p.name) await updateProfile(user, { displayName: p.name });
  await update(ref(db, `users/${user.uid}`), p);
}
