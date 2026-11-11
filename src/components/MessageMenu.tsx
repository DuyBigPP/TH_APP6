import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ActionSheet, { SheetOption } from './ActionSheet';
import { colors } from '../theme/colors';
import { Message, REACTIONS } from '../utils/chat';

interface Props {
  msg: Message | null;
  myId: string;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onCopy: () => void;
  onRecall: () => void;
}

// Nhấn giữ tin: thả cảm xúc + Trả lời / Sao chép / Thu hồi (chỉ tin của mình)
const MessageMenu: React.FC<Props> = ({
  msg,
  myId,
  onClose,
  onReact,
  onReply,
  onCopy,
  onRecall,
}) => {
  const options: SheetOption[] = [{ label: 'Trả lời', onPress: onReply }];
  if (msg?.type === 'text')
    options.push({ label: 'Sao chép', onPress: onCopy });
  if (msg?.senderId === myId)
    options.push({ label: 'Thu hồi', onPress: onRecall, destructive: true });
  const mine = msg?.reactions?.[myId];

  return (
    <ActionSheet visible={!!msg} options={options} onClose={onClose}>
      <View style={styles.emojiRow}>
        {REACTIONS.map(e => (
          <TouchableOpacity
            key={e}
            style={[styles.emojiBtn, mine === e && styles.emojiActive]}
            onPress={() => {
              onClose();
              onReact(e);
            }}
          >
            <Text style={styles.emoji}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ActionSheet>
  );
};

const styles = StyleSheet.create({
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  emojiBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiActive: { backgroundColor: colors.primaryLight },
  emoji: { fontSize: 28 },
});

export default MessageMenu;
