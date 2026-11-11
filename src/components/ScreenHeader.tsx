import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

// Thanh tiêu đề xanh có nút quay lại (cùng kiểu với màn hình Chat)
const ScreenHeader: React.FC<{
  title: string;
  subtitle?: string;
  onBack: () => void;
}> = ({ title, subtitle, onBack }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <TouchableOpacity onPress={onBack} style={styles.back}>
        <ArrowLeft size={22} color="#fff" />
      </TouchableOpacity>
      <View>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  back: { padding: 6 },
  title: { fontSize: 18, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
});

export default ScreenHeader;
