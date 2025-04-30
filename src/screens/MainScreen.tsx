import React, { useEffect, useState, useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  RefreshControl,
} from "react-native"
import { Feather } from '@expo/vector-icons'
import Animated, { FadeInLeft, FadeIn, useAnimatedStyle, withRepeat, withSequence, withTiming, useSharedValue } from "react-native-reanimated"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { selectVoteOption } from "../api/post"
import { toggleLike, toggleBookmark } from "../api/reaction"
import type { VoteResponse } from "../types/Vote"
import { useIsFocused, useNavigation } from "@react-navigation/native"
import type { StackNavigationProp } from "@react-navigation/stack"
import type { RootStackParamList } from "../navigation/AppNavigator"
import { jwtDecode } from "jwt-decode"
import { useVoteList } from "../hooks/useVoteList"
import CommentScreen from "../screens/CommentScreen"
import RegionStatistics from "../components/RegionStatistics"
import AgeStatistics from "../components/AgeStatistics"
import GenderStatistics from "../components/GenderStatistics"

import { SERVER_URL } from "../constant/config"

const IMAGE_BASE_URL = `${SERVER_URL}`
const { width } = Dimensions.get("window")

interface JwtPayload {
  sub: string
}

const SkeletonLoader = React.memo(() => {
  const opacity = useSharedValue(0.3)
  
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1,
      true
    )
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  return (
    <Animated.View style={[styles.skeletonItem, animatedStyle]}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonUserInfo}>
          <View style={styles.skeletonText} />
          <View style={[styles.skeletonText, { width: '60%' }]} />
        </View>
      </View>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonOptions}>
        <View style={styles.skeletonOption} />
        <View style={styles.skeletonOption} />
      </View>
    </Animated.View>
  )
})

const formatDate = (dateString: string) => {
  const finishDate = new Date(dateString)
  const now = new Date() 

  const diffTime = finishDate.getTime() - now.getTime()
  const diffMinutes = Math.floor(diffTime / (1000 * 60))
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffTime > 0) {
    if (diffMinutes < 60) {
      return `${diffMinutes}분 후 마감`
    } else if (diffHours < 24) {
      const remainingMinutes = diffMinutes % 60
      return `${diffHours}시간 ${remainingMinutes}분 후 마감`
    } else if (diffDays <= 7) {
      const remainingHours = diffHours % 24
      return `${diffDays}일 ${remainingHours}시간 후 마감`
    } else {
      return finishDate.toLocaleDateString("ko-KR")
    }
  } else {
    return ''
  }
}

const formatCreationTime = (dateString: string) => {
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

const isVoteClosed = (finishTime: string) => {
  const finish = new Date(finishTime)
  const now = new Date()
  return finish.getTime() < now.getTime()
}

const VoteItem = React.memo(({ 
  item, 
  currentUsername, 
  onVote, 
  onToggleLike, 
  onToggleBookmark,
  onCommentPress,
  onStatisticsPress,
  animatedWidths
}: {
  item: VoteResponse;
  currentUsername: string | null;
  onVote: (voteId: number, optionId: number) => void;
  onToggleLike: (voteId: number) => void;
  onToggleBookmark: (voteId: number) => void;
  onCommentPress: (voteId: number) => void;
  onStatisticsPress: (vote: VoteResponse) => void;
  animatedWidths: Record<string, number>;
}) => {
  const closed = isVoteClosed(item.finishTime)
  const selectedOptionId = item.selectedOptionId
  const hasVoted = !!selectedOptionId
  const showGauge = closed || hasVoted
  const totalCount = item.voteOptions.reduce((sum, opt) => sum + opt.voteCount, 0)
  const hasImageOptions = item.voteOptions.some(opt => opt.optionImage)
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()

  return (
    <Animated.View
      entering={FadeIn.duration(400).delay((item.voteId % 10) * 50)}
      style={[styles.voteItem, closed ? styles.closedVoteItem : styles.activeVoteItem]}
    >
      <View style={styles.userInfoRow}>
        <View style={styles.userInfoLeft}>
          <Image
            source={{
              uri:
                item.profileImage === "default.jpg"
                  ? `${IMAGE_BASE_URL}/images/default.jpg`
                  : `${IMAGE_BASE_URL}${item.profileImage}`,
            }}
            style={styles.profileImage}
          />
          <View>
            <TouchableOpacity
              onPress={() => navigation.navigate("UserPageScreen", { userId: item.userId })}
              activeOpacity={0.7}
            >
              <Text style={styles.nickname}>{item.username}</Text>
            </TouchableOpacity>
            <Text style={styles.creationTime}>{formatCreationTime(item.createdAt)}</Text>
          </View>
        </View>

        {closed && (
          <View style={styles.closedBadge}>
            <Text style={styles.closedBadgeText}>마감됨</Text>
          </View>
        )}
      </View>

      <Text style={styles.title}>{item.title}</Text>

      <View style={styles.metaContainer}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.categoryName}</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(item.finishTime)}</Text>
      </View>

      {item.content && (
        <Text numberOfLines={2} style={styles.content}>
          {item.content}
        </Text>
      )}

      {item.images.length > 0 && (
        <View style={styles.imageContainer}>
          {item.images.map((img) => (
            <Image
              key={img.id}
              source={{ uri: `${IMAGE_BASE_URL}${img.imageUrl}` }}
              style={styles.image}
              resizeMode="cover"
            />
          ))}
        </View>
      )}

      {item.voteOptions.length > 0 && (
        <View style={[styles.optionContainer, hasImageOptions && styles.imageOptionContainer]}>
          {item.voteOptions.map((opt) => {
            const isSelected = selectedOptionId === opt.id
            const percentage = totalCount > 0 ? Math.round((opt.voteCount / totalCount) * 100) : 0
            const animationKey = `${item.voteId}-${opt.id}`
            const animatedWidth = animatedWidths[animationKey] || percentage

            return (
              <View key={opt.id} style={[styles.optionWrapper, opt.optionImage && styles.imageOptionWrapper]}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    closed && styles.closedOptionButton,
                    isSelected && styles.selectedOptionButton,
                    opt.optionImage && styles.optionButtonWithImage,
                  ]}
                  onPress={() => onVote(item.voteId, opt.id)}
                  disabled={closed || isSelected}
                  activeOpacity={0.7}
                >
                  {showGauge && (
                    <View style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${animatedWidth * (opt.optionImage ? 1.25 : 1.11)}%`,
                      backgroundColor: isSelected ? "#4299E1" : "#E2E8F0",
                      opacity: 0.3,
                      borderRadius: 12,
                    }} />
                  )}
                  {opt.optionImage ? (
                    <View style={styles.optionContentWithImage}>
                      <Image
                        source={{ uri: `${IMAGE_BASE_URL}${opt.optionImage}` }}
                        style={styles.largeOptionImage}
                        resizeMode="cover"
                      />
                      <View style={styles.optionTextContainer}>
                        <Text style={[
                          styles.optionButtonText,
                          isSelected && styles.selectedOptionText,
                          showGauge && { color: isSelected ? "#2C5282" : "#4A5568" }
                        ]}>
                          {opt.content}
                        </Text>
                        {showGauge && (
                          <Text style={[
                            styles.percentageText,
                            isSelected && styles.selectedPercentageText
                          ]}>
                            {percentage}%
                          </Text>
                        )}
                      </View>
                    </View>
                  ) : (
                    <View style={styles.optionTextContainer}>
                      <Text style={[
                        styles.optionButtonText,
                        isSelected && styles.selectedOptionText,
                        showGauge && { color: isSelected ? "#2C5282" : "#4A5568" }
                      ]}>
                        {opt.content}
                      </Text>
                      {showGauge && (
                        <Text style={[
                          styles.percentageText,
                          isSelected && styles.selectedPercentageText
                        ]}>
                          {percentage}%
                        </Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )
          })}
          {showGauge && totalCount > 0 && <Text style={styles.responseCountText}>{totalCount}명 참여</Text>}
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.reactionRow}>
        <TouchableOpacity
          style={styles.reactionItem}
          onPress={() => onToggleLike(item.voteId)}
          activeOpacity={0.7}
        >
          <Feather 
            name={item.isLiked ? "heart" : "heart"} 
            size={22} 
            color={item.isLiked ? "#FF4B6E" : "#718096"} 
          />
          <Text style={[
            styles.reactionText,
            item.isLiked && styles.activeReactionText
          ]}>
            {item.likeCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reactionItem}
          onPress={() => onCommentPress(item.voteId)}
          activeOpacity={0.7}
        >
          <Feather name="message-circle" size={22} color="#718096" />
          <Text style={styles.reactionText}>{item.commentCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reactionItem}
          onPress={() => onToggleBookmark(item.voteId)}
          activeOpacity={0.7}
        >
          <Feather 
            name={item.isBookmarked ? "bookmark" : "bookmark"} 
            size={22} 
            color={item.isBookmarked ? "#1499D9" : "#718096"} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reactionItem}
          onPress={() => onStatisticsPress(item)}
          activeOpacity={0.7}
        >
          <Feather name="bar-chart-2" size={20} color="#718096" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
})

const CommentModal = React.memo(({ 
  visible, 
  voteId, 
  onClose 
}: { 
  visible: boolean; 
  voteId: number; 
  onClose: () => void;
}) => {
  if (!visible) return null;
  
  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable 
          style={styles.modalBackground}
          onPress={onClose}
        >
          <View style={styles.modalBackdrop} />
        </Pressable>
        <View style={styles.modalContainer}>
          <CommentScreen
            route={{
              params: {
                voteId
              }
            }}
          />
        </View>
      </View>
    </Modal>
  );
});

const StatisticsModal = React.memo(({ 
  visible, 
  voteId, 
  activeTab,
  onClose,
  onTabChange
}: { 
  visible: boolean; 
  voteId: number | null;
  activeTab: 'region' | 'age' | 'gender';
  onClose: () => void;
  onTabChange: (tab: 'region' | 'age' | 'gender') => void;
}) => {
  if (!visible || !voteId) return null;

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable 
          style={styles.modalBackground}
          onPress={onClose}
        >
          <View style={styles.modalBackdrop} />
        </Pressable>
        <View style={[styles.modalContainer, styles.statisticsModalContainer]}>
          <View style={styles.statisticsHeader}>
            <Text style={styles.statisticsTitle}>투표 통계</Text>
            <TouchableOpacity 
              onPress={onClose}
              style={styles.closeButton}
            >
              <Feather name="x" size={24} color="#4A5568" />
            </TouchableOpacity>
          </View>
          <View style={styles.statisticsTabContainer}>
            <TouchableOpacity
              style={[
                styles.statisticsTabButton,
                activeTab === 'region' && styles.activeStatisticsTab
              ]}
              onPress={() => onTabChange('region')}
            >
              <Text style={[
                styles.statisticsTabText,
                activeTab === 'region' && styles.activeStatisticsTabText
              ]}>지역별</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statisticsTabButton,
                activeTab === 'age' && styles.activeStatisticsTab
              ]}
              onPress={() => onTabChange('age')}
            >
              <Text style={[
                styles.statisticsTabText,
                activeTab === 'age' && styles.activeStatisticsTabText
              ]}>연령별</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statisticsTabButton,
                activeTab === 'gender' && styles.activeStatisticsTab
              ]}
              onPress={() => onTabChange('gender')}
            >
              <Text style={[
                styles.statisticsTabText,
                activeTab === 'gender' && styles.activeStatisticsTabText
              ]}>성별</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statisticsContent}>
            {activeTab === 'region' && <RegionStatistics voteId={voteId} />}
            {activeTab === 'age' && <AgeStatistics voteId={voteId} />}
            {activeTab === 'gender' && <GenderStatistics voteId={voteId} />}
          </View>
        </View>
      </View>
    </Modal>
  );
});

const MainScreen: React.FC = () => {
  const {
    votes,
    isLoading,
    isLoadingMore,
    refreshing,
    hasMore,
    fetchInitialVotes,
    fetchNextPage,
    refreshVotes,
    updateVoteById
  } = useVoteList()
  
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({})
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)
  const [selectedVoteId, setSelectedVoteId] = useState<number | null>(null)
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [showStatisticsModal, setShowStatisticsModal] = useState(false)
  const [selectedVoteForStats, setSelectedVoteForStats] = useState<number | null>(null)
  const [activeStatTab, setActiveStatTab] = useState<'region' | 'age' | 'gender'>('region')
  const [animatedWidths, setAnimatedWidths] = useState<Record<string, number>>({})
  const [isRefreshing, setIsRefreshing] = useState(false)

  const isFocused = useIsFocused()

  useEffect(() => {
    const fetchUserFromToken = async () => {
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

    fetchUserFromToken()
  }, [])

  useEffect(() => {
    if (isFocused) {
      fetchInitialVotes()
    }
  }, [isFocused, fetchInitialVotes])

  const handleVote = useCallback(async (voteId: number, optionId: number) => {
    try {
      const token = await AsyncStorage.getItem("token")
      if (!token) {
        Alert.alert("인증 오류", "로그인이 필요합니다.")
        return
      }

      setSelectedOptions((prev) => ({
        ...prev,
        [voteId]: optionId,
      }))
      
      await selectVoteOption(voteId, optionId)
      await updateVoteById(voteId)
      
    } catch (error) {
      console.error("투표 실패:", error)
      Alert.alert("에러", "투표 중 오류가 발생했습니다.")
      setSelectedOptions((prev) => {
        const newState = { ...prev }
        delete newState[voteId]
        return newState
      })
    }
  }, [updateVoteById])

  const handleToggleLike = useCallback(async (voteId: number) => {
    try {
      const token = await AsyncStorage.getItem("token")
      if (!token) {
        Alert.alert("인증 오류", "로그인이 필요합니다.")
        return
      }

      await toggleLike(voteId)
      await updateVoteById(voteId)
    } catch (err) {
      console.error("좋아요 실패:", err)
      Alert.alert("에러", "좋아요 처리 중 오류가 발생했습니다.")
    }
  }, [updateVoteById])

  const handleToggleBookmark = useCallback(async (voteId: number) => {
    try {
      const token = await AsyncStorage.getItem("token")
      if (!token) {
        Alert.alert("인증 오류", "로그인이 필요합니다.")
        return
      }

      await toggleBookmark(voteId)
      await updateVoteById(voteId)
    } catch (err) {
      console.error("북마크 실패:", err)
      Alert.alert("에러", "북마크 처리 중 오류가 발생했습니다.")
    }
  }, [updateVoteById])

  const handleCommentPress = useCallback((voteId: number) => {
    setSelectedVoteId(voteId)
    setShowCommentModal(true)
  }, [])

  const handleStatisticsPress = useCallback((vote: VoteResponse) => {
    const totalVotes = vote.voteOptions.reduce((sum, opt) => sum + opt.voteCount, 0)
    if (totalVotes === 0) {
      Alert.alert('알림', '아직 투표 데이터가 없습니다.')
      return
    }
    setSelectedVoteForStats(vote.voteId)
    setShowStatisticsModal(true)
  }, [])

  const renderHeader = useCallback(() => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>VOTY</Text>
      <TouchableOpacity onPress={() => Alert.alert("알림", "알림 기능 준비 중입니다.")}>
        <Feather name="bell" size={24} color="#2D3748" />
      </TouchableOpacity>
    </View>
  ), [])

  const renderItem = useCallback(({ item }: { item: VoteResponse }) => (
    <VoteItem
      item={item}
      currentUsername={currentUsername}
      onVote={handleVote}
      onToggleLike={handleToggleLike}
      onToggleBookmark={handleToggleBookmark}
      onCommentPress={handleCommentPress}
      onStatisticsPress={handleStatisticsPress}
      animatedWidths={animatedWidths}
    />
  ), [currentUsername, handleVote, handleToggleLike, handleToggleBookmark, handleCommentPress, handleStatisticsPress, animatedWidths])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    
    try {
      await refreshVotes();
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  }, [refreshVotes]);

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchNextPage()
    }
  }, [isLoadingMore, hasMore, fetchNextPage])

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={votes}
        keyExtractor={(item, index) => item.voteId?.toString() || `skeleton-${index}`}
        renderItem={renderItem}
        contentContainerStyle={styles.container}
        ListHeaderComponent={renderHeader}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#1499D9"]}
            tintColor="#1499D9"
            progressViewOffset={10}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              {Array(5).fill(null).map((_, index) => (
                <SkeletonLoader key={index} />
              ))}
            </View>
          ) : null
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoadingContainer}>
              <ActivityIndicator size="small" color="#1499D9" />
              <Text style={styles.footerLoadingText}>
                더 많은 투표 불러오는 중...
              </Text>
            </View>
          ) : !hasMore && votes.length > 0 ? (
            <View style={styles.noMoreContainer}>
              <Text style={styles.noMoreText}>모든 투표를 불러왔습니다</Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={5}
      />

      <CommentModal
        visible={showCommentModal}
        voteId={selectedVoteId!}
        onClose={() => {
          setShowCommentModal(false);
          setSelectedVoteId(null);
        }}
      />

      <StatisticsModal
        visible={showStatisticsModal}
        voteId={selectedVoteForStats}
        activeTab={activeStatTab}
        onClose={() => {
          setShowStatisticsModal(false);
          setSelectedVoteForStats(null);
        }}
        onTabChange={setActiveStatTab}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7FAFC",
  },
  container: {
    padding: 12,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#3182CE",
  },
  headerIcon: {
    fontSize: 24,
  },
  voteItem: {
    position: "relative",
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  activeVoteItem: {
    backgroundColor: "#FFFFFF",
  },
  closedVoteItem: {
    backgroundColor: "#F9FAFB",
  },
  userInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: "#E2E8F0",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  nickname: {
    fontSize: 15,
    color: "#1A202C",
    fontWeight: "600",
  },
  creationTime: {
    fontSize: 12,
    color: "#718096",
    marginTop: 2,
  },
  closedBadge: {
    backgroundColor: "#CBD5E0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  closedBadgeText: {
    color: "#4A5568",
    fontSize: 12,
    fontWeight: "500",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2D3748",
    marginBottom: 8,
    lineHeight: 24,
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  categoryBadge: {
    backgroundColor: "#EBF4FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  categoryText: {
    color: "#3182CE",
    fontSize: 12,
    fontWeight: "500",
  },
  dateText: {
    fontSize: 12,
    color: "#718096",
    fontWeight: "500",
  },
  content: {
    fontSize: 15,
    marginBottom: 12,
    color: "#4A5568",
    lineHeight: 22,
  },
  imageContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: width * 0.6,
    borderRadius: 12,
  },
  optionContainer: {
    marginBottom: 16,
  },
  imageOptionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionWrapper: {
    position: "relative",
    marginVertical: 6,
    borderRadius: 12,
    width: '100%',
  },
  imageOptionWrapper: {
    width: '48%',
  },
  gaugeBar: {
    position: "absolute",
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: 12,
    zIndex: -1,
  },
  optionButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 54,
    width: '100%',
    position: 'relative',
  },
  optionButtonWithImage: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 120,
  },
  optionContentWithImage: {
    width: '100%',
    alignItems: 'center',
  },
  largeOptionImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  optionTextContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  closedOptionButton: {
    backgroundColor: "#F7FAFC",
    borderColor: "#E2E8F0",
  },
  selectedOptionButton: {
    borderColor: "#4299E1",
    borderWidth: 1.5,
    backgroundColor: '#EBF8FF',
  },
  optionButtonText: {
    fontSize: 15,
    color: "#2D3748",
    fontWeight: "500",
    flex: 1,
  },
  selectedOptionText: {
    color: "#2C5282",
    fontWeight: "600",
  },
  percentageText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4A5568",
    marginLeft: 8,
  },
  selectedPercentageText: {
    color: "#2C5282",
  },
  responseCountText: {
    marginTop: 12,
    fontSize: 13,
    color: "#718096",
    textAlign: "right",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginBottom: 12,
  },
  reactionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  reactionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  reactionText: {
    fontSize: 14,
    color: "#4A5568",
    fontWeight: "500",
    marginLeft: 6,
  },
  activeReactionText: {
    color: "#FF4B6E",
  },
  loaderContainer: {
    padding: 16,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    color: "#1499D9",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalContainer: {
    height: '75%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  statisticsModalContainer: {
    height: '85%',
  },
  statisticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  statisticsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
  },
  closeButton: {
    padding: 4,
  },
  statisticsTabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  statisticsTabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeStatisticsTab: {
    borderBottomColor: '#1499D9',
  },
  statisticsTabText: {
    fontSize: 15,
    color: '#718096',
    fontWeight: '500',
  },
  activeStatisticsTabText: {
    color: '#1499D9',
    fontWeight: '600',
  },
  statisticsContent: {
    flex: 1,
  },
  skeletonItem: {
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  skeletonAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    marginRight: 10,
  },
  skeletonUserInfo: {
    flex: 1,
  },
  skeletonText: {
    height: 14,
    backgroundColor: '#E2E8F0',
    borderRadius: 7,
    marginBottom: 4,
    width: '80%',
  },
  skeletonTitle: {
    height: 24,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 16,
    width: '90%',
  },
  skeletonOptions: {
    gap: 8,
  },
  skeletonOption: {
    height: 54,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
  },
  footerLoadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  footerLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  noMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noMoreText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
})

export default MainScreen
