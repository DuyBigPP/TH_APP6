import React from 'react';
import { Modal, View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';

interface Props {
  url: string | null;
  onClose: () => void;
}

// Xem ảnh toàn màn hình; chạm bất kỳ đâu để đóng
const ImageViewer: React.FC<Props> = ({ url, onClose }) => (
  <Modal
    visible={!!url}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <TouchableOpacity
      style={styles.backdrop}
      activeOpacity={1}
      onPress={onClose}
    >
      {url && (
        <Image
          source={{ uri: url }}
          style={styles.image}
          resizeMode="contain"
        />
      )}
      <View style={styles.close}>
        <X size={26} color="#fff" />
      </View>
    </TouchableOpacity>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: { width: '100%', height: '100%' },
  close: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ImageViewer;
