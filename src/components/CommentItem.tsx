import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import type { Comment } from '../types/Comment';

interface CommentItemProps {
  comment: Comment;
  onLike: (commentId: number) => void;
  onReply: (commentId: number, username: string) => void;
}

const formatTimestamp = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onLike,
  onReply,
}) => {
  return (
    <View style={styles.commentItem}>
      <Image source={{ uri: comment.profileImage }} style={styles.avatar} />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.username}>{comment.username}</Text>
          <Text style={styles.timestamp}>
            {formatTimestamp(comment.createdAt)}
          </Text>
        </View>
        <Text style={styles.commentText}>{comment.content}</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => onLike(comment.id)}
            style={styles.likeButton}
          >
            <Text style={[styles.heart, comment.isLiked && styles.liked]}>♥</Text>
            {comment.likeCount > 0 && (
              <Text style={styles.likeCount}>{comment.likeCount}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onReply(comment.id, comment.username)}
            style={styles.replyButton}
          >
            <Text style={styles.replyText}>답글</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  commentItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontWeight: '600',
    marginRight: 8,
  },
  timestamp: {
    color: '#8E8E8E',
    fontSize: 12,
  },
  commentText: {
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  heart: {
    fontSize: 16,
    color: '#8E8E8E',
    marginRight: 4,
  },
  liked: {
    color: '#ED4956',
  },
  likeCount: {
    fontSize: 14,
    color: '#8E8E8E',
  },
  replyButton: {
    padding: 4,
  },
  replyText: {
    color: '#8E8E8E',
    fontSize: 14,
  },
}); 