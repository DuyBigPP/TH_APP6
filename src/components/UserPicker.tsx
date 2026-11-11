import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { AppUser } from '../services/chatService';
import Avatar from './Avatar';

interface Props {
  users: AppUser[];
  selected: Set<string>;
  onToggle: (uid: string) => void;
}

// Danh sách chọn thành viên có checkbox (Tạo nhóm / Thêm thành viên)
const UserPicker: React.FC<Props> = ({ users, selected, onToggle }) => (
  <View>
    {users.map(u => {
      const on = selected.has(u.id);
      return (
        <TouchableOpacity
          key={u.id}
          style={[styles.row, on && styles.rowOn]}
          activeOpacity={0.7}
          onPress={() => onToggle(u.id)}
        >
          <Avatar name={u.name} size={42} uri={u.avatarUrl} />
          <Text style={styles.name}>{u.name}</Text>
          <View style={[styles.box, on && styles.boxOn]}>
            {on && <Check size={16} color="#fff" strokeWidth={3} />}
          </View>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  row: {
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
  rowOn: { borderColor: '#BFDBFE', backgroundColor: colors.unreadBg },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});

export default UserPicker;
