import React from 'react';
import { ScrollView, View, ActivityIndicator, StyleSheet } from 'react-native';
import { CommentItem } from './CommentItem';
import type { Comment } from '../types/Comment';

interface CommentListProps {
  comments: Comment[];
  loading: boolean;
  onLike: (commentId: number) => void;
  onReply: (commentId: number, username: string) => void;
  scrollViewRef?: React.RefObject<ScrollView>;
}

export const CommentList: React.FC<CommentListProps> = ({
  comments,
  loading,
  onLike,
  onReply,
  scrollViewRef,
}) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0095F6" />
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.scrollView}
      keyboardDismissMode="interactive"
    >
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          onLike={onLike}
          onReply={onReply}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 