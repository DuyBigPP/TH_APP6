import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { X, UserPlus, LogOut } from 'lucide-react-native';
import { colors } from '../theme/colors';
import {
  subscribeConversation,
  subscribeUsersMap,
  myUid,
  AppUser,
  Conversation,
  ConvRef,
} from '../services/chatService';
import {
  renameGroup,
  addMembers,
  removeMember,
  leaveGroup,
} from '../services/groupService';
import { lastSeenLabel } from '../utils/chat';
import ScreenHeader from '../components/ScreenHeader';
import UserPicker from '../components/UserPicker';
import Avatar from '../components/Avatar';

// Phần C: quản trị nhóm - đổi tên, thêm/xóa thành viên, rời nhóm
const GroupInfoScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { convId } = route.params;
  const me = myUid();
  const [conv, setConv] = useState<Conversation | null>(null);
  const [users, setUsers] = useState<Record<string, AppUser>>({});
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [toAdd, setToAdd] = useState<Set<string>>(new Set());

  useEffect(() => subscribeConversation(convId, setConv), [convId]);
  useEffect(() => subscribeUsersMap(setUsers), []);
  useEffect(() => setNewName(conv?.name ?? ''), [conv?.name]);

  const memberIds = Object.keys(conv?.members ?? {});
  const ref: ConvRef = {
    id: convId,
    type: 'group',
    name: conv?.name,
    memberIds,
  };
  const nameOf = (uid: string) => users[uid]?.name ?? 'Người dùng';
  const fail = (e: any) => Alert.alert('Lỗi', e.message);
  const now = Date.now();

  const saveName = () => {
    if (newName.trim() && newName.trim() !== conv?.name)
      renameGroup(ref, newName).catch(fail);
  };

  const confirmAdd = () => {
    const uids = [...toAdd];
    addMembers(ref, uids, uids.map(nameOf))
      .then(() => {
        setAdding(false);
        setToAdd(new Set());
      })
      .catch(fail);
  };

  const confirmRemove = (uid: string) =>
    Alert.alert('Xóa thành viên', `Xóa ${nameOf(uid)} khỏi nhóm?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => removeMember(ref, uid, nameOf(uid)).catch(fail),
      },
    ]);

  const confirmLeave = () =>
    Alert.alert('Rời nhóm', 'Bạn sẽ không nhận tin nhắn của nhóm này nữa.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Rời nhóm',
        style: 'destructive',
        onPress: () =>
          leaveGroup(ref)
            .then(() => navigation.popToTop())
            .catch(fail),
      },
    ]);

  const candidates = Object.values(users).filter(u => !conv?.members?.[u.id]);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={conv?.name ?? 'Nhóm'}
        subtitle={`${memberIds.length} thành viên`}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Tên nhóm</Text>
        <View style={styles.renameRow}>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="Tên nhóm"
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={saveName}
            activeOpacity={0.8}
          >
            <Text style={styles.saveText}>Lưu</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.label}>Thành viên</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setAdding(a => !a)}
          >
            <UserPlus size={16} color={colors.primary} />
            <Text style={styles.addText}>
              {adding ? 'Đóng' : 'Thêm thành viên'}
            </Text>
          </TouchableOpacity>
        </View>

        {adding && (
          <View style={styles.addBox}>
            {candidates.length ? (
              <>
                <UserPicker
                  users={candidates}
                  selected={toAdd}
                  onToggle={uid =>
                    setToAdd(prev => {
                      const next = new Set(prev);
                      if (next.has(uid)) next.delete(uid);
                      else next.add(uid);
                      return next;
                    })
                  }
                />
                <TouchableOpacity
                  style={[styles.primaryBtn, !toAdd.size && styles.disabled]}
                  disabled={!toAdd.size}
                  onPress={confirmAdd}
                >
                  <Text style={styles.primaryText}>Thêm ({toAdd.size})</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.empty}>
                Mọi người trong danh bạ đã ở trong nhóm.
              </Text>
            )}
          </View>
        )}

        {memberIds.map(uid => (
          <View key={uid} style={styles.member}>
            <Avatar name={nameOf(uid)} size={42} uri={users[uid]?.avatarUrl} />
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>
                {nameOf(uid)}
                {uid === me ? ' (bạn)' : ''}
                {uid === conv?.createdBy ? ' · Trưởng nhóm' : ''}
              </Text>
              <Text style={styles.memberStatus}>
                {lastSeenLabel(!!users[uid]?.online, users[uid]?.lastSeen, now)}
              </Text>
            </View>
            {uid !== me && (
              <TouchableOpacity
                onPress={() => confirmRemove(uid)}
                style={styles.removeBtn}
              >
                <X size={18} color={colors.danger} />
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity
          style={styles.leaveBtn}
          onPress={confirmLeave}
          activeOpacity={0.8}
        >
          <LogOut size={18} color="#fff" />
          <Text style={styles.leaveText}>Rời nhóm</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  renameRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  addText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  addBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  empty: { color: colors.textMuted, textAlign: 'center', padding: 8 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.5 },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '700', color: colors.text },
  memberStatus: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  removeBtn: { padding: 6 },
  leaveBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.danger,
    borderRadius: 14,
    height: 50,
    marginTop: 16,
  },
  leaveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default GroupInfoScreen;
