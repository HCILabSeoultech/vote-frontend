import React, { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  SafeAreaView,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { fetchComments, postComment } from '../api/comment';
import { toggleCommentLike } from '../api/commentLike';
import { Comment } from '../types/Comment';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface JwtPayload {
  sub: string;
}

const IMAGE_BASE_URL = 'http://localhost:8080';

const CommentScreen = () => {
  const route = useRoute();
  const { voteId } = route.params as { voteId: number };

  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState('');
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  useEffect(() => {
    loadComments();

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

    fetchUsername();
  }, []);

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
      await postComment(voteId, input.trim(), undefined, token || '');
      setInput('');
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
            ? {
                ...comment,
                isLiked: result.isLiked,
                likeCount: result.likeCount,
              }
            : comment
        )
      );
    } catch (err) {
      console.error('좋아요 토글 실패:', err);
    }
  };

  const renderComment = ({ item }: { item: Comment }) => {
    const isDefault = item.profileImage === 'default.jpg';
    const imageUrl = isDefault
      ? `${IMAGE_BASE_URL}/images/default.jpg`
      : `${IMAGE_BASE_URL}${item.profileImage}`;

    return (
      <View style={styles.commentItem}>
        <Image source={{ uri: imageUrl }} style={styles.avatar} />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.username}>{item.username || '익명'}</Text>
            <Text style={styles.timestamp}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          </View>

          <Text style={styles.commentText}>{item.content}</Text>

          <View style={styles.likeRow}>
            <View style={styles.likeLeft}>
              <TouchableOpacity onPress={() => handleToggleLike(item.id)}>
                <Text style={[styles.heart, item.isLiked && styles.liked]}>♥</Text>
              </TouchableOpacity>
              <Text style={styles.likeCount}>{item.likeCount}</Text>
            </View>

            {item.username === currentUsername && (
              <View style={styles.commentActions}>
                <TouchableOpacity onPress={() => alert('댓글 수정 예정')}>
                  <Text style={styles.editText}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => alert('댓글 삭제 예정')}>
                  <Text style={styles.deleteText}>삭제</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderComment}
          contentContainerStyle={styles.commentList}
        />

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