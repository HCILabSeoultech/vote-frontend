import React, { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { Alert } from 'react-native';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { fetchComments, postComment, editComment, deleteComment } from '../api/comment';
import { toggleCommentLike } from '../api/commentLike';
import { Comment } from '../types/Comment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL } from '../constant/config';
import Animated, { FadeIn } from 'react-native-reanimated';

const IMAGE_BASE_URL = `${SERVER_URL}`;

interface JwtPayload {
  sub: string;
}

const CommentScreen = () => {
  const route = useRoute();
  const { voteId } = route.params as { voteId: number };

  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editedContent, setEditedContent] = useState('');

  useEffect(() => {
    loadComments();
    fetchUsername();
  }, []);

  const fetchUsername = async () => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      try {
        const decoded: JwtPayload = jwtDecode(token);
        setCurrentUsername(decoded.sub);
      } catch (e) {
        console.error('JWT decode 실패:', e);
      }
    }
  };

  const loadComments = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const data = await fetchComments(voteId, token || '');
      setComments(data);
    } catch (err) {
      console.error('댓글 불러오기 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!input.trim()) return;
    try {
      const token = await AsyncStorage.getItem('token');
      await postComment(voteId, input.trim(), replyTo || undefined, token || '');
      setInput('');
      setReplyTo(null);
      loadComments();
    } catch (err) {
      console.error('댓글 작성 실패:', err);
    }
  };

  const handleToggleLike = async (commentId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const result = await toggleCommentLike(commentId, token || '');

      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? { ...comment, isLiked: result.isLiked, likeCount: result.likeCount }
            : comment
        )
      );
    } catch (err) {
      console.error('좋아요 토글 실패:', err);
    }
  };

  const handleEditComment = async (commentId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await editComment(commentId, editedContent.trim(), token || '');
      setEditingCommentId(null);
      setEditedContent('');
      loadComments();
    } catch (err) {
      console.error('댓글 수정 실패:', err);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    Alert.alert(
      '댓글 삭제',
      '댓글을 삭제하시겠습니까?',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await deleteComment(commentId, token || '');
              loadComments();
            } catch (err) {
              console.error('댓글 삭제 실패:', err);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Format the timestamp to be more readable
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) {
      return '방금 전';
    } else if (diffMin < 60) {
      return `${diffMin}분 전`;
    } else if (diffHour < 24) {
      return `${diffHour}시간 전`;
    } else if (diffDay < 7) {
      return `${diffDay}일 전`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderCommentItem = (item: Comment, indent = 0, index = 0) => {
    const isDefault = item.profileImage === 'default.jpg';
    const imageUrl = isDefault
      ? `${IMAGE_BASE_URL}/images/default.jpg`
      : `${IMAGE_BASE_URL}${item.profileImage}`;

    const isMyComment = item.username === currentUsername;

    return (
      <Animated.View 
        key={item.id} 
        entering={FadeIn.duration(300).delay(index * 50)}
        style={[
          styles.commentItem, 
          { marginLeft: indent }
        ]}
      >
        <Image source={{ uri: imageUrl }} style={styles.avatar} />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <View style={styles.userInfo}>
              <Text style={styles.username}>{item.username || '익명'}</Text>
              {isMyComment && (
                <View style={styles.authorBadge}>
                  <Text style={styles.authorBadgeText}>작성자</Text>
                </View>
              )}
            </View>
            <Text style={styles.timestamp}>
              {formatTimestamp(item.createdAt)}
            </Text>
          </View>

          {editingCommentId === item.id ? (
            <TextInput
              value={editedContent}
              onChangeText={setEditedContent}
              style={styles.editInput}
              multiline
              autoFocus
              placeholder="댓글을 입력하세요..."
            />
          ) : (
            <Text style={styles.commentText}>{item.content}</Text>
          )}

          <View style={styles.actionRow}>
            <View style={styles.likeContainer}>
              <TouchableOpacity 
                onPress={() => handleToggleLike(item.id)}
                activeOpacity={0.7}
                style={styles.likeButton}
              >
                <Text style={[styles.heart, item.isLiked && styles.liked]}>♥</Text>
                <Text style={styles.likeCount}>{item.likeCount}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionButtons}>
              {item.parentId === null && (
                <TouchableOpacity 
                  onPress={() => setReplyTo(item.id)}
                  style={styles.actionButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.replyText}>답글</Text>
                </TouchableOpacity>
              )}

              {isMyComment && (
                <View style={styles.commentActions}>
                  {editingCommentId === item.id ? (
                    <>
                      <TouchableOpacity 
                        onPress={() => handleEditComment(item.id)}
                        style={styles.actionButton}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.saveText}>저장</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setEditingCommentId(null);
                          setEditedContent('');
                        }}
                        style={styles.actionButton}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.cancelText}>취소</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={() => {
                          setEditingCommentId(item.id);
                          setEditedContent(item.content);
                        }}
                        style={styles.actionButton}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.editText}>수정</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => handleDeleteComment(item.id)}
                        style={styles.actionButton}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.deleteText}>삭제</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  const parentComments = comments.filter((c) => c.parentId === null);
  const childComments = comments.filter((c) => c.parentId !== null);
  const getReplies = (parentId: number) =>
    childComments.filter((c) => c.parentId === parentId);

  const renderAllComments = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5E72E4" />
          <Text style={styles.loadingText}>댓글을 불러오는 중...</Text>
        </View>
      );
    }

    if (comments.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>아직 댓글이 없습니다.</Text>
          <Text style={styles.emptySubText}>첫 댓글을 남겨보세요!</Text>
        </View>
      );
    }

    return parentComments.map((parent, index) => (
      <View key={parent.id}>
        {renderCommentItem(parent, 0, index)}
        {getReplies(parent.id).map((child, childIndex) => 
          renderCommentItem(child, 40, parentComments.length + childIndex)
        )}
      </View>
    ));
  };

  const replyingToUser = replyTo ? comments.find(c => c.id === replyTo)?.username : null;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.commentList}
          showsVerticalScrollIndicator={false}
        >
          {renderAllComments()}
        </ScrollView>

        {replyTo && (
          <View style={styles.replyingContainer}>
            <View style={styles.replyingBadge}>
              <Text style={styles.replyingText}>
                {replyingToUser}님에게 답글 작성 중
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => setReplyTo(null)}
              style={styles.cancelReplyButton}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelReplyText}>취소</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={replyTo ? "답글 작성..." : "댓글 작성..."}
            style={styles.input}
            multiline
            placeholderTextColor="#A0AEC0"
          />
          <TouchableOpacity 
            onPress={handlePostComment} 
            style={[
              styles.postButton,
              input.trim() ? styles.postButtonActive : styles.postButtonInactive
            ]}
            disabled={!input.trim()}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.postButtonText,
              input.trim() ? styles.postButtonTextActive : styles.postButtonTextInactive
            ]}>
              게시
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F7FAFC' 
  },
  commentList: {
    padding: 16,
    paddingBottom: 100,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontWeight: '600',
    color: '#2D3748',
    fontSize: 15,
  },
  authorBadge: {
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  authorBadgeText: {
    color: '#3182CE',
    fontSize: 10,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  commentText: {
    fontSize: 15,
    color: '#4A5568',
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  likeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  heart: {
    fontSize: 16,
    color: '#A0AEC0',
    marginRight: 6,
  },
  liked: {
    color: '#F56565',
  },
  likeCount: {
    fontSize: 13,
    color: '#4A5568',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyText: {
    fontSize: 13,
    color: '#5E72E4',
    fontWeight: '500',
  },
  editText: {
    fontSize: 13,
    color: '#5E72E4',
    fontWeight: '500',
  },
  deleteText: {
    fontSize: 13,
    color: '#F56565',
    fontWeight: '500',
  },
  saveText: {
    fontSize: 13,
    color: '#38B2AC',
    fontWeight: '500',
  },
  cancelText: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '500',
  },
  editInput: {
    backgroundColor: '#EDF2F7',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#2D3748',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#EDF2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 120,
    color: '#2D3748',
  },
  postButton: {
    justifyContent: 'center',
    marginLeft: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  postButtonActive: {
    backgroundColor: '#5E72E4',
  },
  postButtonInactive: {
    backgroundColor: '#EDF2F7',
  },
  postButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  postButtonTextActive: {
    color: '#FFFFFF',
  },
  postButtonTextInactive: {
    color: '#A0AEC0',
  },
  replyingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EDF2F7',
  },
  replyingBadge: {
    backgroundColor: '#5E72E4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  replyingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  cancelReplyButton: {
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cancelReplyText: {
    color: '#F56565',
    fontSize: 13,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#718096',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#718096',
  },
});

export default CommentScreen;