# ChatApp – Bài thực hành 6 (React Native CLI + Firebase + Cloudinary)

Ứng dụng nhắn tin phát triển tiếp từ Bài 5: chat 1-1 và **chat nhóm**, **gửi ảnh** (Cloudinary),
trạng thái **"đang soạn tin…" / "Đã xem"**, **thu hồi** và **thả cảm xúc**, **thông báo thật** có badge.

## Tính năng

| Phần | Nội dung |
|------|----------|
| A1 | "đang soạn tin…" (tự tắt sau 3 giây / khi gửi / khi rời màn hình), "Đã gửi" / "Đã xem HH:mm" (nhóm: "Đã xem bởi N người"), "Hoạt động X phút trước", `onDisconnect()` cho online & đang gõ |
| A2 | Nhấn giữ tin: Sao chép, Thu hồi (chỉ tin của mình, đánh dấu `recalled: true`), thả cảm xúc 👍 ❤️ 😂 😮 😢 kèm số lượng; thu hồi tin cuối cập nhật dòng tin cuối ở Home |
| A3 | Nút 📷: chụp ảnh / chọn thư viện (`react-native-image-picker`, thu nhỏ cạnh dài ≤ 1024px), xin quyền camera, bong bóng tạm có vòng loading + nút "Thử lại", nhấn ảnh xem toàn màn hình; Home hiện "📷 Hình ảnh" / "📍 Vị trí" |
| A4 | Màn hình Tạo nhóm (checkbox, tối thiểu 2 người ngoài mình), tên người gửi trên bong bóng, tiêu đề hiện số thành viên online, Home gộp 1-1 + nhóm sắp xếp theo tin mới nhất, số chưa đọc riêng từng người |
| A5 | Thông báo ghi vào `notifications/{uid}` khi: có tin mới mà người nhận không mở cuộc trò chuyện đó, được thêm vào nhóm, có người thả cảm xúc. Badge tab Thông báo, nhấn để mở đúng cuộc trò chuyện, "Đánh dấu tất cả đã đọc" |
| C | Quản trị nhóm (đổi tên, thêm/xóa thành viên, rời nhóm + tin hệ thống), trả lời tin (nhấn trích dẫn để cuộn tới tin gốc), hồ sơ cá nhân (đổi tên + ảnh đại diện), thông báo cục bộ `@notifee/react-native` khi app chạy nền, tìm kiếm tin nhắn trong cuộc trò chuyện (không phân biệt dấu) |

## Yêu cầu kỹ thuật đã đáp ứng

- **Multi-path update**: gửi tin ghi tin nhắn + `lastMessage` + `unread` của mọi thành viên (+ thông báo) trong **một** lệnh `update(ref(db), {...})`; tăng chưa đọc bằng `increment(1)`. Xem `buildSendUpdates` trong `src/utils/chat.ts`.
- **Phân trang**: lần đầu `limitToLast(20)`, kéo lên đầu danh sách tải thêm 20 tin cũ hơn. Dùng `FlatList inverted` nên danh sách không bị nhảy.
- **Code Firebase/Cloudinary gom trong `src/services/`**: `chatService.ts`, `groupService.ts`, `uploadService.ts`, `notificationService.ts`, `authService.ts`, `localNotify.ts`.
- **Hủy mọi listener** trong cleanup của `useEffect` (mọi hàm `subscribe*` trả về hàm hủy).
- **Không có API secret** trong mã nguồn: chỉ dùng unsigned upload preset.
- **Luật bảo mật** tự viết: `database.rules.json`.

## Cấu trúc thư mục

```
src/
  services/   firebase.ts, authService.ts, chatService.ts, groupService.ts,
              uploadService.ts, notificationService.ts, localNotify.ts, cloudinaryConfig.ts
  utils/      chat.ts (logic thuần: nhãn trạng thái, multi-path update – có unit test), pickImage.ts
  screens/    Home, Contacts, Chat, CreateGroup, GroupInfo, Notifications, Settings, Login, Register
  components/ Avatar, MessageBubble, MessageMenu, ActionSheet, ImageViewer, UserPicker, ScreenHeader
__tests__/    chat.test.ts (13 test), App.test.tsx
scripts/      rulesCheck.mjs (chứng minh luật bảo mật từ chối thao tác trái phép)
```

## Cấu trúc dữ liệu (Realtime Database)

```
users/{uid}:                  { name, email, online, lastSeen, avatarUrl?, activeConv? }
conversations/{convId}:       { type: "direct" | "group", name, members: {uid: true}, createdBy, createdAt }
messages/{convId}/{msgId}:    { senderId, type: "text"|"image"|"location"|"system", text, imageUrl, lat, lng,
                                createdAt, recalled, reactions: {uid: "❤️"}, replyTo: {id, senderName, preview} }
userChats/{uid}/{convId}:     { type, name | otherId, lastMessage, lastSenderId, lastMsgId, updatedAt, unread }
readStatus/{convId}/{uid}:    thời điểm đọc cuối
typing/{convId}/{uid}:        true
notifications/{uid}/{id}:     { type: "message"|"group_added"|"reaction", convId, fromUid, text, createdAt, read }
```

Cuộc trò chuyện 1-1 có `convId` = hai uid sắp xếp rồi nối bằng `_`.

## 1. Cấu hình Firebase

1. Tạo project trên [Firebase Console](https://console.firebase.google.com), thêm một **Web app**.
2. **Authentication → Sign-in method**: bật **Email/Password**.
3. **Realtime Database**: tạo database (chọn vùng gần nhất).
4. Tạo file cấu hình cho app (Firebase JS SDK):
   ```sh
   npx firebase-tools login
   npx firebase-tools apps:sdkconfig WEB <appId> -o src/services/firebaseConfig.json
   ```
5. Triển khai luật bảo mật:
   ```sh
   npx firebase-tools deploy --only database --project <projectId>
   ```

## 2. Cấu hình Cloudinary (gửi ảnh, ảnh đại diện)

1. Đăng ký tài khoản miễn phí tại [cloudinary.com](https://cloudinary.com). Ghi lại **Cloud name** ở trang Dashboard.
2. **Settings → Upload → Upload presets → Add upload preset**:
   - Upload preset name: `chatapp_unsigned`
   - Signing mode: **Unsigned**
   - Folder: `chatapp` → **Save**
3. Sửa `src/services/cloudinaryConfig.ts`:
   ```ts
   export const CLOUDINARY = {cloudName: '<cloud name>', uploadPreset: 'chatapp_unsigned'};
   ```
4. **Không** đưa API Key / API Secret vào mã nguồn: app chỉ tải lên qua unsigned preset và chỉ lưu URL ảnh vào Realtime Database.

## 3. Chạy ứng dụng

```sh
npm install
npm start                 # Metro
npm run android           # build + cài lên máy ảo / điện thoại
```

Kiểm thử và kiểm tra mã:

```sh
npx jest                  # unit test logic (multi-path update, nhãn trạng thái, tìm kiếm...)
npx tsc --noEmit
npx eslint src __tests__
```

## 4. Chứng minh luật bảo mật

```sh
node scripts/rulesCheck.mjs <email> <mật khẩu> <convId> <msgId của người khác> <uid người khác>
```

Script đăng nhập rồi thử: đọc tin của cuộc trò chuyện mình không tham gia, thu hồi tin của người khác,
ghi trạng thái đang gõ / thả cảm xúc thay người khác. Mỗi thao tác đều nhận `PERMISSION_DENIED`.

Tóm tắt luật:

- `conversations`, `messages`, `typing`, `readStatus`: chỉ **thành viên** (`conversations/{id}/members/{uid}`) mới đọc được.
- Tin nhắn chỉ được **tạo mới** với `senderId == auth.uid`; không sửa được nội dung sau khi gửi.
- `recalled` chỉ **người gửi** được ghi, và chỉ ghi giá trị `true`.
- `reactions/{uid}`, `typing/{convId}/{uid}`, `readStatus/{convId}/{uid}`: mỗi người chỉ ghi được **của chính mình**.
- `userChats/{uid}`: chỉ chủ sở hữu đọc; thành viên cùng cuộc trò chuyện được ghi (để cập nhật tin cuối, số chưa đọc).
- `notifications/{uid}`: chỉ chủ sở hữu đọc / đánh dấu đã đọc; người khác chỉ được **tạo mới** với `fromUid == auth.uid`.
