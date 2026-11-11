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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { subscribeUsers, AppUser } from '../services/chatService';
import { createGroup } from '../services/groupService';
import ScreenHeader from '../components/ScreenHeader';
import UserPicker from '../components/UserPicker';

const MIN_MEMBERS = 2; // tối thiểu 2 người ngoài bản thân

const CreateGroupScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeUsers(setUsers), []);

  const toggle = (uid: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });

  const canCreate =
    name.trim().length > 0 && selected.size >= MIN_MEMBERS && !saving;

  const onCreate = async () => {
    setSaving(true);
    try {
      const convId = await createGroup(name, [...selected]);
      navigation.replace('Chat', { convId, type: 'group', name: name.trim() });
    } catch (e: any) {
      setSaving(false);
      Alert.alert('Không tạo được nhóm', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Tạo nhóm" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Tên nhóm</Text>
        <TextInput
          style={styles.input}
          placeholder="Ví dụ: Nhóm bài tập 6"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />
        <Text style={styles.label}>
          Thành viên ({selected.size} đã chọn · tối thiểu {MIN_MEMBERS})
        </Text>
        <UserPicker users={users} selected={selected} onToggle={toggle} />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <TouchableOpacity
          style={[styles.button, !canCreate && styles.buttonDisabled]}
          disabled={!canCreate}
          onPress={onCreate}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Đang tạo...' : 'Tạo nhóm'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default CreateGroupScreen;
