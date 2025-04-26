import React, { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { jwtDecode } from "jwt-decode"
import { Alert, Platform } from "react-native"
import { Feather } from "@expo/vector-icons"
import { useNavigation, useRoute } from "@react-navigation/native"
import type { StackNavigationProp } from "@react-navigation/stack"
import type { RootStackParamList } from "../navigation/AppNavigator"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  StyleSheet,
  Image,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Pressable,
  RefreshControl,
} from "react-native"
import { fetchComments, postComment, editComment, deleteComment } from "../api/comment"
import { toggleCommentLike } from "../api/commentLike"
import type { Comment } from "../types/Comment"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { SERVER_URL } from "../constant/config"
import Animated, { 
  FadeIn, 
  FadeOut,
  SlideInRight,
  SlideOutRight,
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate
} from "react-native-reanimated"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { RouteProp } from "@react-navigation/native"
import { Image as CachedImage } from 'react-native-expo-image-cache'
import { BlurView } from 'expo-blur'

const IMAGE_BASE_URL = `${SERVER_URL}`
const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.8

interface JwtPayload {
  sub: string
}

interface CommentPage {
  content: Comment[]
  pageable: {
    pageNumber: number
    pageSize: number
  }
  last: boolean
  totalElements: number
  totalPages: number
  size: number
  number: number
}

type CommentScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CommentScreen'>
type CommentScreenRouteProp = RouteProp<RootStackParamList, 'CommentScreen'>

type CommentScreenProps = {
  route: {
    params: {
      voteId: number;
    };
  };
};

const CommentScreen = ({ route }: CommentScreenProps) => {
  const { voteId } = route.params;
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [comments, setComments] = useState<Comment[]>([]);
  const [page, setPage] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: number; username: string } | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
  const [newComment, setNewComment] = useState<Comment | null>(null);

  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editedContent, setEditedContent] = useState("");

  const [expandedReplies, setExpandedReplies] = useState<Record<number, number>>({});
  const [replyPages, setReplyPages] = useState<Record<number, number>>({});

  const scrollViewRef = useRef<ScrollView>(null);
  const replyInputRefs = useRef<Record<number, View>>({});

  const [replyInputStates, setReplyInputStates] = useState<Record<number, boolean>>({});
  const [replyInputs, setReplyInputs] = useState<Record<number, string>>({});

  const translateY = useSharedValue(0);
  const context = useSharedValue({ y: 0 });
  const [isVisible, setIsVisible] = useState(true);

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value }
    })
    .onUpdate((event) => {
      translateY.value = event.translationY + context.value.y
    })
    .onEnd(() => {
      if (translateY.value > MODAL_HEIGHT * 0.3) {
        translateY.value = withSpring(MODAL_HEIGHT, {}, () => {
          runOnJS(setIsVisible)(false)
          runOnJS(handleClose)()
        })
      } else {
        translateY.value = withSpring(0)
      }
    })

  const rStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      borderTopLeftRadius: interpolate(
        translateY.value,
        [0, MODAL_HEIGHT],
        [20, 0],
        Extrapolate.CLAMP
      ),
      borderTopRightRadius: interpolate(
        translateY.value,
        [0, MODAL_HEIGHT],
        [20, 0],
        Extrapolate.CLAMP
      ),
    }
  })

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent
    const isBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50

    if (isBottom && hasMoreComments && !loadingMore && !loading) {
      loadComments(false)
    }
  }

  useEffect(() => {
    loadComments(true)
    fetchUsername()
  }, [])

  const fetchUsername = async () => {
    const token = await AsyncStorage.getItem("token")
    if (token) {
      try {
        const decoded: JwtPayload = jwtDecode(token)
        setCurrentUsername(decoded.sub)
      } catch (e) {
        console.error("JWT decode 실패:", e)
      }
    }
  }

  const loadComments = async (reset = false) => {
    if (reset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    
    const token = await AsyncStorage.getItem("token")
    if (!token) return
    const currentPage = reset ? 0 : page
    const response = await fetchComments(voteId, currentPage, token)
    const newComments = (response as any).content
    
    if (reset) {
      setComments(newComments)
      setPage(1)
    } else {
      setComments(prev => [...prev, ...newComments])
      setPage(currentPage + 1)
    }
    
    setHasMoreComments(!(response as any).last)
    setLoading(false)
    setLoadingMore(false)
  }

  const handlePostComment = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token")
      if (!token || !input.trim()) return

      const response = await postComment(
        voteId, 
        input.trim(), 
        replyTo?.id ?? undefined, 
        token
      );
      
      setInput("");
      setReplyTo(null);

      // 새 댓글 작성 후 목록 새로고침
      loadComments(true);
    } catch (error) {
      console.error("댓글 작성 실패:", error)
      Alert.alert("오류", "댓글 작성 중 문제가 발생했습니다.")
    }
  }, [voteId, input, replyTo]);

  const handleToggleLike = useCallback(async (commentId: number) => {
    try {
      const token = await AsyncStorage.getItem("token")
      if (!token) {
        Alert.alert("오류", "로그인이 필요합니다.")
        return
      }

      const result = await toggleCommentLike(commentId, token)

      setComments(prev => prev.map(comment => {
        if (comment.id === commentId) {
          return { ...comment, isLiked: result.isLiked, likeCount: result.likeCount }
        }
        if (comment.replies) {
          return {
            ...comment,
            replies: comment.replies.map(reply => 
              reply.id === commentId 
                ? { ...reply, isLiked: result.isLiked, likeCount: result.likeCount }
                : reply
            )
          }
        }
        return comment
      }))
    } catch (err) {
      console.error("좋아요 토글 실패:", err)
      Alert.alert("오류", "좋아요 처리 중 문제가 발생했습니다.")
    }
  }, [])

  const handleEditComment = async (commentId: number) => {
    try {
      const token = await AsyncStorage.getItem("token")
      if (!token) {
        Alert.alert("오류", "로그인이 필요합니다.")
        return
      }

      await editComment(commentId, editedContent.trim(), token)
      setEditingCommentId(null)
      setEditedContent("")
      loadComments(true) // Reset and reload comments
    } catch (err) {
      console.error("댓글 수정 실패:", err)
      Alert.alert("오류", "댓글 수정 중 문제가 발생했습니다.")
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    Alert.alert(
      "댓글 삭제",
      "댓글을 삭제하시겠습니까?",
      [
        {
          text: "취소",
          style: "cancel",
        },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("token")
              if (!token) {
                Alert.alert("오류", "로그인이 필요합니다.")
                return
              }

              await deleteComment(commentId, token)
              loadComments(true) // Reset and reload comments
            } catch (err) {
              console.error("댓글 삭제 실패:", err)
              Alert.alert("오류", "댓글 삭제 중 문제가 발생했습니다.")
            }
          },
        },
      ],
      { cancelable: true },
    )
  }

  const toggleRepliesVisibility = (commentId: number) => {
    setExpandedComments((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }))
  }

  // Format the timestamp to be more readable
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffSec < 60) {
      return "방금 전"
    } else if (diffMin < 60) {
      return `${diffMin}분 전`
    } else if (diffHour < 24) {
      return `${diffHour}시간 전`
    } else if (diffDay < 7) {
      return `${diffDay}일 전`
    } else {
      return date.toLocaleDateString()
    }
  }

  const findBestReply = (replies: Comment[] = []) => {
    if (replies.length === 0) return null
    const popularReplies = replies.filter(reply => reply.likeCount >= 10)
    if (popularReplies.length === 0) return null
    return [...popularReplies].sort((a, b) => b.likeCount - a.likeCount)[0]
  }

  const scrollToReplyInput = (commentId: number) => {
    if (replyInputRefs.current[commentId]) {
      replyInputRefs.current[commentId].measureLayout(
        scrollViewRef.current as any,
        (x: number, y: number) => {
          const screenHeight = Dimensions.get('window').height;
          const keyboardHeight = Platform.OS === 'ios' ? 320 : 280; // 예상 키보드 높이
          const targetY = Math.max(0, y - (screenHeight - keyboardHeight) / 2); // 댓글을 화면 중앙에 위치
          
          scrollViewRef.current?.scrollTo({ 
            y: targetY,
            animated: true 
          });
        },
        () => console.log('measurement failed')
      );
    }
  };

  const handleReplyClick = (commentId: number, username: string) => {
    setReplyTo({ id: commentId, username });
    setInput("");
    inputRef.current?.focus();
  };

  const handleCancelReply = (commentId: number) => {
    setReplyInputStates(prev => ({ ...prev, [commentId]: false }))
  }

  const handleReplyInputChange = (commentId: number, text: string) => {
    setReplyInputs(prev => ({ ...prev, [commentId]: text }))
  }

  const handlePostReply = async (commentId: number) => {
    try {
      const token = await AsyncStorage.getItem("token")
      const content = replyInputs[commentId]
      if (!token || !content?.trim()) return

      await postComment(voteId, content.trim(), commentId, token)
      setReplyInputs(prev => ({ ...prev, [commentId]: "" }))
      setReplyInputStates(prev => ({ ...prev, [commentId]: false }))
      
      // 답글 목록 업데이트
      const updatedComments = await fetchComments(voteId, 0, token)
      const updatedComment = updatedComments.content.find((c: Comment) => c.id === commentId)
      if (updatedComment) {
        setComments(prev => prev.map(comment => 
          comment.id === commentId ? updatedComment : comment
        ))
      }
    } catch (error) {
      console.error("답글 작성 실패:", error)
      Alert.alert("오류", "답글 작성 중 문제가 발생했습니다.")
    }
  }

  const loadReplies = (commentId: number, page: number) => {
    const comment = comments.find(c => c.id === commentId)
    if (!comment || !comment.replies) return []
    return comment.replies
  }

  const loadMoreReplies = async (commentId: number) => {
    try {
      const token = await AsyncStorage.getItem("token")
      if (!token) return

      const currentPage = replyPages[commentId] || 0
      const response = await fetchComments(voteId, currentPage, token)
      const updatedComment = response.content.find((c: Comment) => c.id === commentId)
      
      if (updatedComment) {
        setComments(prev => prev.map(comment => 
          comment.id === commentId ? updatedComment : comment
        ))
        setReplyPages(prev => ({ ...prev, [commentId]: currentPage + 1 }))
      }
    } catch (error) {
      console.error("답글 더보기 실패:", error)
    }
  }

  const handleUserPress = (userId: number) => {
    handleClose()
    navigation.navigate('UserPageScreen', { userId })
  }

  const renderCommentItem = (item: Comment, indent = 0, index = 0, isBestComment = false, isLast = false) => {
    const isDefault = item.profileImage === "default.jpg"
    const imageUrl = isDefault ? `${IMAGE_BASE_URL}/images/default.jpg` : `${IMAGE_BASE_URL}${item.profileImage}`

    const isMyComment = item.username === currentUsername
    const replies = item.replies || []
    const hasReplies = replies.length > 0

    const currentPage = replyPages[item.id] || 0
    const visibleReplies = loadReplies(item.id, currentPage)
    const bestReply = findBestReply(replies)
    const hasMoreReplies = false // 모든 답글이 보이므로 더보기 버튼 제거

    // 답글 정렬 (인기 답글이 먼저 오도록)
    const sortedReplies = [...visibleReplies].sort((a, b) => {
      if (bestReply && a.id === bestReply.id) return -1
      if (bestReply && b.id === bestReply.id) return 1
      return 0
    })

    return (
      <View key={item.id}>
        <Animated.View
          entering={FadeIn.duration(300).delay(index * 50)}
          exiting={FadeOut.duration(200)}
          style={[
            styles.commentItem, 
            { marginLeft: indent }, 
            isBestComment && styles.bestCommentItem,
            isLast && styles.lastCommentItem,
            indent > 0 && { borderBottomWidth: 0 } // 답글은 구분선 없음
          ]}
        >
          {isBestComment && (
            <View style={styles.bestCommentBadge}>
              <Text style={styles.bestCommentText}>인기 댓글</Text>
            </View>
          )}
          <Image source={{ uri: imageUrl }} style={styles.avatar} />
          <View style={[styles.commentContent, isBestComment && styles.bestCommentContent]}>
            <View style={styles.commentHeader}>
              <View style={styles.userInfo}>
                <TouchableOpacity
                  onPress={() => handleUserPress(item.userId)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.username}>{item.username}</Text>
                </TouchableOpacity>
                {isMyComment && (
                  <View style={styles.authorBadge}>
                    <Text style={styles.authorBadgeText}>작성자</Text>
                  </View>
                )}
              </View>
              <Text style={styles.timestamp}>{formatTimestamp(item.createdAt)}</Text>
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
                <TouchableOpacity onPress={() => handleToggleLike(item.id)} activeOpacity={0.7} style={styles.likeButton}>
                  <Text style={[styles.heart, item.isLiked && styles.liked]}>♥</Text>
                  <Text style={styles.likeCount}>{item.likeCount}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.actionButtons}>
                {item.parentId === null && (
                  <>
                    <TouchableOpacity 
                      onPress={() => handleReplyClick(item.id, item.username)} 
                      style={styles.actionButton} 
                      activeOpacity={0.7}
                    >
                      <Text style={styles.replyText}>답글</Text>
                    </TouchableOpacity>

                    {hasReplies && (
                      <TouchableOpacity
                        onPress={() => toggleRepliesVisibility(item.id)}
                        style={styles.actionButton}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.viewRepliesText}>
                          {expandedComments[item.id] ? "답글 숨기기" : `답글 ${replies.length}개 보기`}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
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
                            setEditingCommentId(null)
                            setEditedContent("")
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
                            setEditingCommentId(item.id)
                            setEditedContent(item.content)
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
        
        {(expandedComments[item.id] || replyInputStates[item.id]) && (
          <View style={styles.repliesContainer}>
            {sortedReplies.map((reply, replyIndex) => {
              const isBestReply = bestReply ? reply.id === bestReply.id : false
              return renderCommentItem(reply, 20, replyIndex, isBestReply, false)
            })}
            {replyInputStates[item.id] && (
              <View 
                ref={ref => {
                  if (ref) {
                    replyInputRefs.current[item.id] = ref
                  }
                }}
                style={styles.replyInputContainer}
              >
                <TextInput
                  style={styles.replyInput}
                  placeholder="답글을 입력하세요..."
                  multiline
                  autoFocus
                  value={replyInputs[item.id] || ""}
                  onChangeText={(text) => handleReplyInputChange(item.id, text)}
                />
                <View style={styles.replyInputButtons}>
                  <TouchableOpacity
                    style={styles.cancelReplyButton}
                    onPress={() => {
                      handleCancelReply(item.id)
                      if (!hasReplies) {
                        setExpandedComments(prev => ({ ...prev, [item.id]: false }))
                      }
                    }}
                  >
                    <Text style={styles.cancelReplyText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.postReplyButton, !replyInputs[item.id]?.trim() && styles.postButtonInactive]}
                    onPress={() => handlePostReply(item.id)}
                    disabled={!replyInputs[item.id]?.trim()}
                  >
                    <Text style={styles.postReplyText}>게시</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    )
  }

  const parentComments = comments

  const findBestComment = () => {
    if (parentComments.length === 0) return null

    const commentsWithLikes = parentComments.filter(comment => comment.likeCount >= 10)
    if (commentsWithLikes.length === 0) return null

    return [...commentsWithLikes].sort((a, b) => b.likeCount - a.likeCount)[0]
  }

  const bestComment = findBestComment()

  const renderAllComments = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5E72E4" />
          <Text style={styles.loadingText}>댓글을 불러오는 중...</Text>
        </View>
      )
    }

    if (comments.length === 0 && !newComment) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>아직 댓글이 없습니다.</Text>
          <Text style={styles.emptySubText}>첫 댓글을 남겨보세요!</Text>
        </View>
      )
    }

    const sortedParentComments = [...parentComments].sort((a, b) => {
      if (bestComment && a.id === bestComment.id) return -1
      if (bestComment && b.id === bestComment.id) return 1
      return 0
    })

    return (
      <>
        {newComment && renderCommentItem(newComment, 0, 0, false, false)}
        {sortedParentComments.map((parent, index) => {
          const isBestComment = bestComment ? parent.id === bestComment.id : false
          const isLast = index === sortedParentComments.length - 1
          return renderCommentItem(parent, 0, index + 1, isBestComment, isLast)
        })}
  
        {hasMoreComments && loadingMore && (
          <View style={styles.loadingMoreContainer}>
            <ActivityIndicator size="small" color="#5E72E4" />
            <Text style={styles.loadingMoreText}>댓글을 불러오는 중...</Text>
          </View>
        )}
      </>
    )
  }

  const replyingToUser = replyTo ? comments.find((c) => c.id === replyTo.id)?.username : null

  const handleClose = () => {
    navigation.goBack();
  };

  // 새로고침 기능 추가
  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadComments(true)
    setRefreshing(false)
  }, [])

  const inputRef = useRef<TextInput>(null);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>댓글</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.commentList}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4299E1"
            colors={['#4299E1']}
          />
        }
      >
        {renderAllComments()}
        <View style={{ height: 120 }} />
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {replyTo && (
          <View style={styles.replyingBadge}>
            <Text style={styles.replyingText}>
              {replyingToUser}님에게 답글 작성 중
            </Text>
            <TouchableOpacity 
              onPress={() => setReplyTo(null)}
              style={styles.cancelReplyButton}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelReplyText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <BlurView intensity={80} style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder={replyTo ? "답글을 입력하세요..." : "댓글을 입력하세요..."}
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
              <Text
                style={[
                  styles.postButtonText,
                  input.trim() ? styles.postButtonTextActive : styles.postButtonTextInactive,
                ]}
              >
                게시
              </Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
  },
  scrollView: {
    flex: 1,
  },
  commentList: {
    padding: 8,
    paddingBottom: 120,
  },
  keyboardView: {
    width: '100%',
    backgroundColor: 'transparent',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  inputContainer: {
    width: '100%',
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingTop: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(247, 250, 252, 0.8)',
    borderRadius: 20,
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    maxHeight: 60,
    color: "#2D3748",
    minHeight: 32,
  },
  postButton: {
    justifyContent: "center",
    marginLeft: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  postButtonActive: {
    backgroundColor: "#4299E1",
  },
  postButtonInactive: {
    backgroundColor: "#E2E8F0",
  },
  postButtonText: {
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
  },
  postButtonTextActive: {
    color: "#FFFFFF",
  },
  postButtonTextInactive: {
    color: "#A0AEC0",
  },
  replyingContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#EDF2F7",
    marginBottom: 8,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  replyingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EBF8FF',
    padding: 8,
    borderRadius: 12,
    marginBottom: 8,
  },
  replyingText: {
    fontSize: 12,
    color: '#2B6CB0',
    fontWeight: '500',
  },
  cancelReplyButton: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F7FAFC",
    borderRadius: 8,
  },
  cancelReplyText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '600',
  },
  commentItem: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-start",
    position: "relative",
    paddingHorizontal: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  lastCommentItem: {
    borderBottomWidth: 0,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 6,
    backgroundColor: "#E2E8F0",
  },
  commentContent: {
    flex: 1,
    backgroundColor: "transparent",
    padding: 0,
    paddingRight: 4,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  username: {
    fontWeight: "600",
    color: "#1A202C",
    fontSize: 13,
  },
  authorBadge: {
    backgroundColor: "#EBF8FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  authorBadgeText: {
    color: "#3182CE",
    fontSize: 11,
    fontWeight: "500",
  },
  timestamp: {
    fontSize: 12,
    color: "#718096",
    fontWeight: "400",
  },
  commentText: {
    fontSize: 13,
    color: "#2D3748",
    lineHeight: 18,
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  likeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  heart: {
    fontSize: 14,
    color: "#A0AEC0",
    marginRight: 4,
  },
  liked: {
    color: "#F56565",
  },
  likeCount: {
    fontSize: 12,
    color: "#718096",
    fontWeight: "400",
  },
  actionButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  replyText: {
    fontSize: 11,
    color: "#718096",
    fontWeight: "500",
  },
  viewRepliesText: {
    fontSize: 11,
    color: "#718096",
    fontWeight: "500",
  },
  repliesContainer: {
    marginLeft: 34,
    marginTop: 4,
    marginBottom: 4,
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
    paddingLeft: 8,
  },
  replyInputContainer: {
    marginTop: 8,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    padding: 8,
  },
  replyInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    minHeight: 40,
    maxHeight: 100,
  },
  replyInputButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  postReplyButton: {
    backgroundColor: '#4299E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  postReplyText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  bestCommentItem: {
    marginTop: 8,
    marginBottom: 24,
  },
  bestCommentBadge: {
    position: "absolute",
    top: -8,
    left: 34,
    backgroundColor: "#4299E1",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 1,
  },
  bestCommentText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  bestCommentContent: {
    backgroundColor: "#EBF8FF",
    borderWidth: 1,
    borderColor: "#4299E1",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#718096",
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4A5568",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#718096",
  },
  loadingMoreContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingMoreText: {
    marginTop: 12,
    color: "#718096",
    fontSize: 14,
  },
  loadMoreRepliesButton: {
    marginLeft: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#EDF2F7',
    borderRadius: 8,
    marginTop: 8,
  },
  loadMoreRepliesText: {
    color: '#4A5568',
    fontSize: 13,
    fontWeight: '500',
  },
  cancelText: {
    fontSize: 13,
    color: "#718096",
    fontWeight: "500",
  },
  editInput: {
    backgroundColor: "#EDF2F7",
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: "#2D3748",
    minHeight: 80,
    textAlignVertical: "top",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  saveText: {
    fontSize: 13,
    color: "#38B2AC",
    fontWeight: "500",
  },
  editText: {
    fontSize: 13,
    color: "#1499D9",
    fontWeight: "500",
  },
  deleteText: {
    fontSize: 13,
    color: "#F56565",
    fontWeight: "500",
  },
})

export default React.memo(CommentScreen)
