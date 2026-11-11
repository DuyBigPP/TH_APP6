import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Users } from 'lucide-react-native';
import { avatarColors, getInitials } from '../theme/colors';

interface AvatarProps {
  name: string;
  index?: number;
  size?: number;
  uri?: string; // ảnh đại diện (Cloudinary) nếu có
  group?: boolean; // nhóm chat -> biểu tượng nhóm
}

// không truyền index -> màu tính theo tên, cùng một người luôn cùng màu
const hashName = (name: string) =>
  [...name].reduce((h, c) => (h * 17 + c.charCodeAt(0)) | 0, 0) >>> 0;

const Avatar: React.FC<AvatarProps> = ({
  name,
  index,
  size = 52,
  uri,
  group,
}) => {
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={[styles.image, box]} />;
  const bgColor = avatarColors[(index ?? hashName(name)) % avatarColors.length];
  return (
    <View style={[styles.container, box, { backgroundColor: bgColor }]}>
      {group ? (
        <Users size={size * 0.46} color="#fff" />
      ) : (
        <Text style={[styles.text, { fontSize: size * 0.36 }]}>
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: { backgroundColor: '#E2E8F0' },
  text: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default Avatar;
