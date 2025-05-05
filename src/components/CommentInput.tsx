import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface CommentInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  replyTo?: { username: string } | null;
  onCancelReply?: () => void;
  placeholder?: string;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  value,
  onChangeText,
  onSubmit,
  replyTo,
  onCancelReply,
  placeholder = '댓글을 입력하세요...',
}) => {
  return (
    <View style={styles.inputContainer}>
      {replyTo && (
        <View style={styles.replyingBadge}>
          <Text style={styles.replyingText}>
            {replyTo.username}님에게 답글 작성 중
          </Text>
          {onCancelReply && (
            <TouchableOpacity onPress={onCancelReply}>
              <Text style={styles.cancelReplyText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <View style={styles.inputWrapper}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={replyTo ? '답글을 입력하세요...' : placeholder}
          style={styles.input}
          multiline
        />
        <TouchableOpacity
          onPress={onSubmit}
          style={[
            styles.postButton,
            value.trim() ? styles.postButtonActive : styles.postButtonInactive,
          ]}
          disabled={!value.trim()}
        >
          <Text style={styles.postButtonText}>게시</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
    padding: 12,
  },
  replyingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8F8',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyingText: {
    fontSize: 12,
    color: '#0095F6',
  },
  cancelReplyText: {
    color: '#8E8E8E',
    fontSize: 16,
    paddingHorizontal: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    backgroundColor: '#F8F8F8',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  postButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  postButtonActive: {
    backgroundColor: '#0095F6',
  },
  postButtonInactive: {
    backgroundColor: '#B2DFFC',
  },
  postButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
}); 