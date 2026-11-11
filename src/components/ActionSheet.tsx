import React from 'react';
import { Modal, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

export interface SheetOption {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface Props {
  visible: boolean;
  title?: string;
  options: SheetOption[];
  onClose: () => void;
  children?: React.ReactNode; // nội dung thêm phía trên (vd hàng emoji)
}

// Bảng chọn dưới đáy màn hình (thay Alert nhiều nút để giao diện giống nhau mọi nền tảng)
const ActionSheet: React.FC<Props> = ({
  visible,
  title,
  options,
  onClose,
  children,
}) => {
  const insets = useSafeAreaInsets(); // chừa chỗ thanh điều hướng Android (edge-to-edge)
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}
          activeOpacity={1}
        >
          {title && <Text style={styles.title}>{title}</Text>}
          {children}
          {options.map(o => (
            <TouchableOpacity
              key={o.label}
              style={styles.option}
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                o.onPress();
              }}
            >
              <Text
                style={[styles.optionText, o.destructive && styles.destructive]}
              >
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.option, styles.cancel]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Hủy</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  option: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  destructive: { color: colors.danger },
  cancel: { borderBottomWidth: 0, marginTop: 4 },
  cancelText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '700',
  },
});

export default ActionSheet;
