import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LogOut, Bell, Volume2, Pencil, Camera } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../services/firebase';
import { logout, updateMyProfile } from '../services/authService';
import { uploadImage } from '../services/uploadService';
import { pickImage } from '../utils/pickImage';
import ActionSheet from '../components/ActionSheet';
import { subscribeUser, AppUser } from '../services/chatService';
import { colors } from '../theme/colors';
import Avatar from '../components/Avatar';

interface Props {
  navigation: any;
}

const SettingsScreen: React.FC<Props> = () => {
  const insets = useSafeAreaInsets();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [me, setMe] = useState<AppUser | null>(null);

  useEffect(() => subscribeUser(auth.currentUser!.uid, setMe), []);
  const myName = me?.name ?? auth.currentUser?.displayName ?? '';
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [photoSheet, setPhotoSheet] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Phần C: đổi họ tên / ảnh đại diện -> Danh bạ, Home, Chat tự cập nhật theo users/{uid}
  const saveName = () => {
    const name = nameInput.trim();
    if (name && name !== myName)
      updateMyProfile({ name }).catch(e => Alert.alert('Lỗi', e.message));
    setEditing(false);
  };

  const changeAvatar = async (source: 'camera' | 'library') => {
    const asset = await pickImage(source);
    if (!asset) return;
    setUploading(true);
    try {
      const avatarUrl = await uploadImage({
        uri: asset.uri!,
        type: asset.type,
        fileName: asset.fileName,
      });
      await updateMyProfile({ avatarUrl });
    } catch (e: any) {
      Alert.alert('Không đổi được ảnh', e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.headerTitle}>Cài đặt</Text>

      <View style={styles.profileCard}>
        <TouchableOpacity
          onPress={() => setPhotoSheet(true)}
          activeOpacity={0.8}
        >
          <Avatar name={myName || '?'} size={64} uri={me?.avatarUrl} />
          <View style={styles.cameraBadge}>
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Camera size={13} color="#fff" />
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.profileInfo}>
          {editing ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.nameInput}
                value={nameInput}
                onChangeText={setNameInput}
                onSubmitEditing={saveName}
                autoFocus
              />
              <TouchableOpacity style={styles.saveBtn} onPress={saveName}>
                <Text style={styles.saveText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.editRow}
              onPress={() => {
                setNameInput(myName);
                setEditing(true);
              }}
            >
              <Text style={styles.name}>{myName}</Text>
              <Pencil size={15} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          <Text style={styles.email}>{auth.currentUser?.email}</Text>
          <View style={styles.statusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.statusText}>Đang hoạt động</Text>
          </View>
        </View>
      </View>
      <ActionSheet
        visible={photoSheet}
        title="Đổi ảnh đại diện"
        onClose={() => setPhotoSheet(false)}
        options={[
          { label: 'Chụp ảnh', onPress: () => changeAvatar('camera') },
          { label: 'Chọn từ thư viện', onPress: () => changeAvatar('library') },
        ]}
      />

      <Text style={styles.sectionTitle}>Tùy chọn</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={styles.rowIcon}>
              <Bell size={18} color={colors.primary} />
            </View>
            <Text style={styles.label}>Thông báo đẩy</Text>
          </View>
          <Switch value={pushEnabled} onValueChange={setPushEnabled} />
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={styles.rowIcon}>
              <Volume2 size={18} color={colors.primary} />
            </View>
            <Text style={styles.label}>Âm thanh</Text>
          </View>
          <Switch value={soundEnabled} onValueChange={setSoundEnabled} />
        </View>
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.85}
      >
        <LogOut size={18} color="#fff" />
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginLeft: 4,
    marginBottom: 14,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileInfo: { flex: 1, marginLeft: 14 },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
    justifyContent: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '800', color: colors.text },
  email: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  statusText: { fontSize: 12, color: colors.success, fontWeight: '600' },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 24,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: { fontSize: 15, fontWeight: '600', color: colors.text },
  divider: { height: 1, backgroundColor: colors.border },
  logoutButton: {
    flexDirection: 'row',
    marginTop: 24,
    backgroundColor: colors.danger,
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default SettingsScreen;
