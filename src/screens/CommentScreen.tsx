import React, { useEffect, useState, useRef, useCallback } from "react"
import { Alert, Platform, Keyboard } from "react-native"
import { useNavigation, RouteProp } from "@react-navigation/native"
import type { StackNavigationProp } from "@react-navigation/stack"
import type { RootStackParamList } from "../navigation/AppNavigator"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from "react-native"
import { fetchComments, postComment } from "../api/comment"
import { toggleCommentLike } from "../api/commentLike"
import type { Comment } from "../types/Comment"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { CommentList } from '../components/CommentList'
import { CommentInput } from '../components/CommentInput'

type CommentScreenProps = {
  route: RouteProp<RootStackParamList, 'CommentScreen'>;
};

interface CommentState {
  comments: Comment[];
  input: string;
  loading: boolean;
  replyTo: { id: number; username: string } | null;
}

const CommentScreen: React.FC<CommentScreenProps> = ({ route }) => {
  const { voteId } = route.params;
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  const [state, setState] = useState<CommentState>({
    comments: [],
    input: "",
    loading: true,
    replyTo: null
  });

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // 댓글 로딩
  const loadComments = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const data = await fetchComments(voteId, 0, token);
      setState((prev) => ({ ...prev, comments: data, loading: false }));
    } catch (error) {
      console.error("댓글 로딩 실패:", error);
      Alert.alert("오류", "댓글을 불러오는 중 문제가 발생했습니다.");
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [voteId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // 댓글 작성
  const handlePostComment = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("오류", "로그인이 필요합니다.");
        return;
      }

      await postComment(
        voteId, 
        state.input.trim(), 
        state.replyTo?.id ?? undefined, 
        token
      );
      
      setState(prev => ({ ...prev, input: "", replyTo: null }));
      await loadComments();
    } catch (error) {
      console.error("댓글 작성 실패:", error);
      Alert.alert("오류", "댓글 작성 중 문제가 발생했습니다.");
    }
  }, [voteId, state.input, state.replyTo, loadComments]);

  // 좋아요 토글
  const handleToggleLike = useCallback(async (commentId: number) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("오류", "로그인이 필요합니다.");
        return;
      }

      const result = await toggleCommentLike(commentId, token);
      setState(prev => ({
        ...prev,
        comments: prev.comments.map(comment => 
          comment.id === commentId 
            ? { ...comment, isLiked: result.isLiked, likeCount: result.likeCount }
            : comment
        )
      }));
    } catch (err) {
      console.error("좋아요 토글 실패:", err);
      Alert.alert("오류", "좋아요 처리 중 문제가 발생했습니다.");
    }
  }, []);

  // 답글 작성 모드
  const handleReply = useCallback((commentId: number, username: string) => {
    setState(prev => ({ ...prev, replyTo: { id: commentId, username } }));
    inputRef.current?.focus();
  }, []);

  const handleCancelReply = useCallback(() => {
    setState(prev => ({ ...prev, replyTo: null }));
  }, []);

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / (60 * 1000));
    const diffHour = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDay = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHour < 24) return `${diffHour}시간 전`;
    if (diffDay < 7) return `${diffDay}일 전`;
    return date.toLocaleDateString();
  };

  if (state.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0095F6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CommentList
        comments={state.comments}
        loading={state.loading}
        onLike={handleToggleLike}
        onReply={handleReply}
        scrollViewRef={scrollViewRef}
      />
      <CommentInput
        value={state.input}
        onChangeText={(text) => setState((prev) => ({ ...prev, input: text }))}
        onSubmit={handlePostComment}
        replyTo={state.replyTo}
        onCancelReply={handleCancelReply}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  commentItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontSize: 14,
    marginRight: 8,
  },
  timestamp: {
    color: '#8E8E8E',
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
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

export default CommentScreen;