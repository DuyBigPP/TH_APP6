import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from 'react-native';
import { MapPin, RotateCw } from 'lucide-react-native';
import { colors } from '../theme/colors';
import {
  formatTime,
  groupReactions,
  Message,
  RECALLED_TEXT,
} from '../utils/chat';
import Avatar from './Avatar';

// Tin đang tải ảnh lên (chưa có trên server) dùng chung kiểu Message + 2 trường tạm
export type ListItem = Message & {
  pending?: 'uploading' | 'error';
  localUri?: string;
};

interface Props {
  msg: ListItem;
  isMe: boolean;
  senderName: string;
  senderAvatar?: string;
  showSender: boolean; // nhóm: hiện tên người gửi phía trên bong bóng
  status?: string; // "Đã gửi" / "Đã xem ..." dưới tin cuối của mình
  onLongPress: () => void;
  onPressImage: (url: string) => void;
  onPressQuote: (id: string) => void;
  onRetry?: () => void;
}

const openMap = (lat: number, lng: number) =>
  Linking.openURL(
    `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  );

const MessageBubble: React.FC<Props> = ({
  msg,
  isMe,
  senderName,
  senderAvatar,
  showSender,
  status,
  onLongPress,
  onPressImage,
  onPressQuote,
  onRetry,
}) => {
  if (msg.type === 'system') {
    return (
      <View style={styles.systemWrap}>
        <Text style={styles.systemText}>{msg.text}</Text>
      </View>
    );
  }

  const recalled = !!msg.recalled;
  const isLocation = msg.type === 'location' && !recalled;
  const isImage = msg.type === 'image' && !recalled;
  const reactions = recalled ? [] : groupReactions(msg.reactions);

  const onPress = () => {
    if (isLocation) openMap(msg.lat!, msg.lng!);
    else if (isImage && msg.imageUrl) onPressImage(msg.imageUrl);
  };

  const renderContent = () => {
    if (recalled) {
      return (
        <Text
          style={[
            styles.recalled,
            isMe ? styles.recalledMe : styles.recalledOther,
          ]}
        >
          {RECALLED_TEXT}
        </Text>
      );
    }
    if (isImage) {
      return (
        <View>
          <Image
            source={{ uri: msg.imageUrl ?? msg.localUri }}
            style={styles.image}
          />
          {msg.pending === 'uploading' && (
            <View style={styles.imageOverlay}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}
          {msg.pending === 'error' && (
            <View style={styles.imageOverlay}>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={onRetry}
                activeOpacity={0.8}
              >
                <RotateCw size={16} color={colors.primary} />
                <Text style={styles.retryText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }
    if (isLocation) {
      return (
        <>
          <View style={styles.locationRow}>
            <MapPin size={18} color={colors.danger} />
            <Text style={styles.locationTitle}>Vị trí hiện tại</Text>
          </View>
          <Text style={styles.locationCoords}>
            {msg.lat!.toFixed(5)}, {msg.lng!.toFixed(5)}
          </Text>
          <Text style={styles.locationLink}>Nhấn để mở Google Maps</Text>
        </>
      );
    }
    return (
      <Text
        style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextOther]}
      >
        {msg.text}
      </Text>
    );
  };

  const darkTime = isMe && !isLocation && !isImage && !recalled;

  return (
    <View
      style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}
    >
      {!isMe && <Avatar name={senderName} size={32} uri={senderAvatar} />}
      <View
        style={[styles.column, isMe ? styles.columnRight : styles.columnLeft]}
      >
        {showSender && <Text style={styles.senderName}>{senderName}</Text>}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPress}
          onLongPress={msg.pending ? undefined : onLongPress}
          delayLongPress={350}
          style={[
            styles.bubble,
            isMe ? styles.bubbleMe : styles.bubbleOther,
            isLocation && styles.bubbleLocation,
            isImage && styles.bubbleImage,
            recalled && styles.bubbleRecalled,
          ]}
        >
          {msg.replyTo && !recalled && (
            <TouchableOpacity
              onPress={() => onPressQuote(msg.replyTo!.id)}
              style={[styles.quote, isMe ? styles.quoteMe : styles.quoteOther]}
            >
              <Text
                style={[styles.quoteName, isMe && styles.quoteTextMe]}
                numberOfLines={1}
              >
                {msg.replyTo.senderName}
              </Text>
              <Text
                style={[styles.quoteText, isMe && styles.quoteTextMe]}
                numberOfLines={1}
              >
                {msg.replyTo.preview}
              </Text>
            </TouchableOpacity>
          )}
          {renderContent()}
          {!msg.pending && (
            <Text
              style={[
                styles.msgTime,
                darkTime ? styles.msgTimeMe : styles.msgTimeOther,
                isImage && styles.msgTimeImage,
              ]}
            >
              {formatTime(msg.createdAt)}
            </Text>
          )}
        </TouchableOpacity>
        {reactions.length > 0 && (
          <View
            style={[
              styles.reactions,
              isMe ? styles.reactionsRight : styles.reactionsLeft,
            ]}
          >
            {reactions.map(r => (
              <Text key={r.emoji} style={styles.reactionText}>
                {r.emoji}
                {r.count > 1 ? ` ${r.count}` : ''}
              </Text>
            ))}
          </View>
        )}
        {status && <Text style={styles.status}>{status}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  systemWrap: { alignItems: 'center', marginVertical: 8 },
  systemText: {
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
    gap: 8,
  },
  msgRowRight: { justifyContent: 'flex-end' },
  msgRowLeft: { justifyContent: 'flex-start' },
  column: { maxWidth: '75%' },
  columnRight: { alignItems: 'flex-end' },
  columnLeft: { alignItems: 'flex-start' },
  senderName: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 3,
    marginLeft: 6,
  },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleOther: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleLocation: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  bubbleImage: {
    padding: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleRecalled: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retryText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  recalled: { fontSize: 14, fontStyle: 'italic' },
  recalledMe: { color: colors.textSecondary },
  recalledOther: { color: colors.textMuted },
  quote: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 2,
    marginBottom: 6,
    borderRadius: 4,
  },
  quoteMe: {
    borderLeftColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  quoteOther: {
    borderLeftColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  quoteName: { fontSize: 12, fontWeight: '700', color: colors.primary },
  quoteText: { fontSize: 13, color: colors.textSecondary },
  quoteTextMe: { color: 'rgba(255,255,255,0.9)' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  locationCoords: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  locationLink: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  msgText: { fontSize: 15, lineHeight: 21 },
  msgTextMe: { color: '#fff' },
  msgTextOther: { color: colors.text },
  msgTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  msgTimeMe: { color: 'rgba(255,255,255,0.7)' },
  msgTimeOther: { color: colors.textMuted },
  msgTimeImage: { marginRight: 6, marginBottom: 2 },
  reactions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: -6,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reactionsRight: { marginRight: 8 },
  reactionsLeft: { marginLeft: 8 },
  reactionText: { fontSize: 13, color: colors.text },
  status: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
    marginRight: 4,
  },
});

export default MessageBubble;
