import React, { useEffect, useState } from 'react';
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
import { Comment } from '../types/Comment';
import AsyncStorage from '@react-native-async-storage/async-storage';

const IMAGE_BASE_URL = 'http://localhost:8080';

const CommentScreen = () => {
  const route = useRoute();
  const { voteId } = route.params as { voteId: number };

  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    loadComments();
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

  const renderComment = ({ item }: { item: Comment }) => {
    const isDefault = item.profileImage === 'default.jpg';
    const imageUrl = isDefault
      ? `${IMAGE_BASE_URL}/images/default.jpg`
      : `${IMAGE_BASE_URL}${item.profileImage}`;

    console.log(imageUrl);

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
          <TouchableOpacity
            onPress={handlePostComment}
            style={styles.postButton}
          >
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
});

export default CommentScreen;
