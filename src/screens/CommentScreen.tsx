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
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { fetchComments, postComment, editComment, deleteComment } from '../api/comment';
import { toggleCommentLike } from '../api/commentLike';
import { Comment } from '../types/Comment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL } from '../constant/config';

const IMAGE_BASE_URL = `${SERVER_URL}`

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
    try {
      const token = await AsyncStorage.getItem('token');
      const data = await fetchComments(voteId, token || '');
      setComments(data);
    } catch (err) {
      console.error('댓글 불러오기 실패:', err);
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

  const renderCommentItem = (item: Comment, indent = 0) => {
    const isDefault = item.profileImage === 'default.jpg';
    const imageUrl = isDefault
      ? `${IMAGE_BASE_URL}/images/default.jpg`
      : `${IMAGE_BASE_URL}${item.profileImage}`;

    return (
      <View key={item.id} style={[styles.commentItem, { marginLeft: indent }]}>
        <Image source={{ uri: imageUrl }} style={styles.avatar} />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.username}>{item.username || '익명'}</Text>
            <Text style={styles.timestamp}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          </View>

          {editingCommentId === item.id ? (
            <TextInput
              value={editedContent}
              onChangeText={setEditedContent}
              style={{
                backgroundColor: '#fff',
                borderRadius: 6,
                padding: 8,
                fontSize: 14,
              }}
              multiline
            />
          ) : (
            <Text style={styles.commentText}>{item.content}</Text>
          )}

          <View style={styles.likeRow}>
            <View style={styles.likeLeft}>
              <TouchableOpacity onPress={() => handleToggleLike(item.id)}>
                <Text style={[styles.heart, item.isLiked && styles.liked]}>♥</Text>
              </TouchableOpacity>
              <Text style={styles.likeCount}>{item.likeCount}</Text>
            </View>

            {item.parentId === null && (
              <TouchableOpacity onPress={() => setReplyTo(item.id)}>
                <Text style={{ fontSize: 13, color: '#007bff' }}>답글 달기</Text>
              </TouchableOpacity>
            )}

            {item.username === currentUsername && (
              <View style={styles.commentActions}>
                {editingCommentId === item.id ? (
                  <>
                    <TouchableOpacity onPress={() => handleEditComment(item.id)}>
                      <Text style={styles.editText}>저장</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingCommentId(null);
                        setEditedContent('');
                      }}
                    >
                      <Text style={styles.deleteText}>취소</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingCommentId(item.id);
                        setEditedContent(item.content);
                      }}
                    >
                      <Text style={styles.editText}>수정</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteComment(item.id)}>
                      <Text style={styles.deleteText}>삭제</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const parentComments = comments.filter((c) => c.parentId === null);
  const childComments = comments.filter((c) => c.parentId !== null);
  const getReplies = (parentId: number) =>
    childComments.filter((c) => c.parentId === parentId);

  const renderAllComments = () => {
    return parentComments.map((parent) => (
      <View key={parent.id}>
        {renderCommentItem(parent)}
        {getReplies(parent.id).map((child) => renderCommentItem(child, 40))}
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView contentContainerStyle={styles.commentList}>
          {renderAllComments()}
        </ScrollView>

        {replyTo && (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
            <Text style={{ fontSize: 13, color: '#555' }}>
              {comments.find(c => c.id === replyTo)?.username}님에게 답글 중
            </Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Text style={{ marginLeft: 8, color: 'red' }}>취소</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="댓글 달기..."
            style={styles.input}
            multiline
          />
          <TouchableOpacity onPress={handlePostComment} style={styles.postButton}>
            <Text style={{ color: input.trim() ? 'blue' : '#ccc' }}>게시</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  commentList: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
    backgroundColor: '#ccc',
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#f3f3f3',
    padding: 12,
    borderRadius: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  username: {
    fontWeight: 'bold',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#eee',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  postButton: {
    justifyContent: 'center',
    marginLeft: 10,
  },
  heart: {
    fontSize: 16,
    color: '#aaa',
    marginRight: 6,
  },
  liked: {
    color: 'red',
  },
  likeCount: {
    fontSize: 13,
    color: '#555',
  },
  likeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  likeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  editText: {
    fontSize: 13,
    color: '#007bff',
    fontWeight: '500',
    marginRight: 10,
  },
  deleteText: {
    fontSize: 13,
    color: 'red',
    fontWeight: '500',
  },
});

export default CommentScreen;
