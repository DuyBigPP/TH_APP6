// Chứng minh luật bảo mật: đăng nhập 1 tài khoản rồi thử các thao tác KHÔNG được phép.
// Cách chạy: node scripts/rulesCheck.mjs <email> <mật khẩu> <convId> <msgId của người khác> <uid người khác>
// Kết quả mong đợi với người KHÔNG phải thành viên: mọi dòng BỊ TỪ CHỐI (PERMISSION_DENIED).
// Với thành viên (không phải người gửi): chỉ "Đọc tin nhắn" được phép, các dòng còn lại bị từ chối.
import { readFileSync } from 'node:fs';
import { initializeApp, setLogLevel } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, get, set } from 'firebase/database';

const [email, password, cid, msgId, otherUid] = process.argv.slice(2);
if (!otherUid) {
  console.log('Thiếu tham số. Xem hướng dẫn ở đầu file.');
  process.exit(1);
}

const config = JSON.parse(
  readFileSync(new URL('../src/services/firebaseConfig.json', import.meta.url)),
);
setLogLevel('silent'); // ẩn cảnh báo SDK, chỉ in kết quả
const app = initializeApp(config);
const db = getDatabase(app);
const { user } = await signInWithEmailAndPassword(
  getAuth(app),
  email,
  password,
);
console.log(`Đăng nhập: ${email} (uid ${user.uid})\n`);

const checks = [
  [`Đọc tin nhắn messages/${cid}`, () => get(ref(db, `messages/${cid}`))],
  [
    `Thu hồi tin của người khác messages/${cid}/${msgId}/recalled`,
    () => set(ref(db, `messages/${cid}/${msgId}/recalled`), true),
  ],
  [
    `Ghi trạng thái đang gõ của người khác typing/${cid}/${otherUid}`,
    () => set(ref(db, `typing/${cid}/${otherUid}`), true),
  ],
  [
    `Thả cảm xúc thay người khác messages/${cid}/${msgId}/reactions/${otherUid}`,
    () => set(ref(db, `messages/${cid}/${msgId}/reactions/${otherUid}`), '❤️'),
  ],
];

for (const [label, run] of checks) {
  try {
    await run();
    console.log(`ĐƯỢC PHÉP            ${label}`);
  } catch (e) {
    console.log(`BỊ TỪ CHỐI (${e.code ?? e.message})  ${label}`);
  }
}
process.exit(0);
