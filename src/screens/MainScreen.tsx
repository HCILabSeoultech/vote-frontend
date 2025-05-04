import React, { useEffect, useState, useCallback, useRef } from "react"
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
  Animated as RNAnimated,
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
        withTiming(0.5, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1,
      true
    )
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  return (
    <Animated.View 
      style={[styles.skeletonItem, animatedStyle]}
      entering={FadeIn.duration(400)}
    >
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonUserInfo}>
          <View style={styles.skeletonText} />
          <View style={[styles.skeletonText, { width: '60%' }]} />
        </View>
      </View>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonMetaContainer}>
        <View style={styles.skeletonCategory} />
        <View style={styles.skeletonDate} />
      </View>
      <View style={styles.skeletonContent} />
      <View style={styles.skeletonOptions}>
        <View style={styles.skeletonOption} />
        <View style={styles.skeletonOption} />
      </View>
      <View style={styles.skeletonReactions} />
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

// 게이지 애니메이션 컴포넌트 분리
const VoteOptionGauge = ({ percentage, isSelected }: { percentage: number; isSelected: boolean }) => {
  const widthAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.timing(widthAnim, {
      toValue: percentage,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <RNAnimated.View
      style={[
        styles.gaugeBar,
        {
          width: animatedWidth,
          backgroundColor: isSelected ? "#4299E1" : "#E2E8F0",
          opacity: 0.3,
        },
      ]}
    />
  );
};

const VoteItem = React.memo(({ 
  item, 
  currentUsername, 
  onVote, 
  onToggleLike, 
  onToggleBookmark,
  onCommentPress,
  onStatisticsPress,
  animatedWidths,
  onImageLoad
}: {
  item: VoteResponse;
  currentUsername: string | null;
  onVote: (voteId: number, optionId: number) => void;
  onToggleLike: (voteId: number) => void;
  onToggleBookmark: (voteId: number) => void;
  onCommentPress: (voteId: number) => void;
  onStatisticsPress: (vote: VoteResponse) => void;
  animatedWidths: Record<string, number>;
  onImageLoad: (voteId: number) => void;
}) => {
  const closed = isVoteClosed(item.finishTime)
  const selectedOptionId = item.selectedOptionId
  const hasVoted = !!selectedOptionId
  const showGauge = closed || hasVoted
  const totalCount = item.voteOptions.reduce((sum, opt) => sum + opt.voteCount, 0)
  const hasImageOptions = item.voteOptions.some(opt => opt.optionImage)
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()

  // optionButton 전체 width를 관리 (이미지 옵션 게이지 width 계산용)
  const [optionWidth, setOptionWidth] = useState(0);
  const imageWidth = 100;

  // 각 옵션별 게이지 애니메이션 값 관리
  const animatedWidthsRef = useRef<{ [key: number]: any }>({});
  useEffect(() => {
    item.voteOptions.forEach(opt => {
      if (opt.optionImage) {
        if (!animatedWidthsRef.current[opt.id]) {
          animatedWidthsRef.current[opt.id] = new RNAnimated.Value(0);
        }
        const percentage = totalCount > 0 ? Math.round((opt.voteCount / totalCount) * 100) : 0;
        const targetWidth = optionWidth > 0 ? (optionWidth - imageWidth) * (percentage / 100) : 0;
        RNAnimated.timing(animatedWidthsRef.current[opt.id], {
          toValue: targetWidth,
          duration: 600,
          useNativeDriver: false,
        }).start();
      }
    });
  }, [item.voteOptions, totalCount, optionWidth]);

  const handleImageLoad = useCallback(() => {
    onImageLoad(item.voteId);
  }, [item.voteId, onImageLoad]);

  return (
    <Animated.View
      entering={FadeIn.duration(400).delay((item.voteId % 10) * 50)}
      style={styles.voteItem}
    >
      <View style={styles.userInfoRow}>
        <Image
          source={{
            uri:
              item.profileImage === "default.jpg"
                ? "https://votey-image.s3.ap-northeast-2.amazonaws.com/images/default.png"
                : item.profileImage,
          }}
          style={styles.profileImage}
        />
        <View>
          <TouchableOpacity
            onPress={() => navigation.navigate("UserPageScreen", { userId: item.userId })}
            activeOpacity={0.7}
          >
            <Text style={styles.nickname}>{item.name}</Text>
          </TouchableOpacity>
          <Text style={styles.creationTime}>{formatCreationTime(item.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.categoryName}</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(item.finishTime)}</Text>
        {closed && (
          <View style={[styles.categoryBadge, { backgroundColor: '#CBD5E0', marginLeft: 0 }]}> 
            <Text style={[styles.categoryText, { color: '#4A5568' }]}>마감됨</Text>
          </View>
        )}
      </View>

      <Text style={styles.title}>{item.title}</Text>

      {item.content && (
        <Text style={styles.content}>{item.content}</Text>
      )}

      {item.images.length > 0 && (
        <View style={styles.imageContainer}>
          {item.images.map((img) => (
            <Image
              key={img.id}
              source={{ uri: img.imageUrl }}
              style={styles.image}
              resizeMode="cover"
              onLoad={handleImageLoad}
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

            if (opt.optionImage) {
              const gaugeWidthAnim = animatedWidthsRef.current[opt.id];
              return (
                <View key={opt.id} style={[styles.optionWrapper, styles.imageOptionWrapper]}>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      isSelected && styles.selectedOptionButton,
                    ]}
                    onPress={() => onVote(item.voteId, opt.id)}
                    disabled={closed || isSelected}
                    activeOpacity={0.7}
                    onLayout={e => setOptionWidth(e.nativeEvent.layout.width)}
                  >
                    <Image
                      source={{ uri: opt.optionImage }}
                      style={styles.leftOptionImage}
                      resizeMode="cover"
                      onLoad={handleImageLoad}
                    />
                    {showGauge && gaugeWidthAnim && (
                      <RNAnimated.View
                        style={[
                          styles.gaugeBar,
                          {
                            left: imageWidth,
                            width: gaugeWidthAnim,
                            backgroundColor: isSelected ? "#4299E1" : "#E2E8F0",
                            opacity: 0.3,
                            position: 'absolute',
                            top: 0,
                            height: '100%',
                            zIndex: 1,
                          },
                        ]}
                      />
                    )}
                    <View style={styles.rightContent}>
                      <View style={styles.textAndPercentRow}>
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
                  </TouchableOpacity>
                </View>
              );
            }
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
                    <VoteOptionGauge percentage={percentage} isSelected={isSelected} />
                  )}
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
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set())
  const [isAllImagesLoaded, setIsAllImagesLoaded] = useState(false)

  const isFocused = useIsFocused()
  const isFirstLoad = useRef(true);

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
    if (isFirstLoad.current) {
      fetchInitialVotes();
      isFirstLoad.current = false;
    }
  }, []);

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

  const handleImageLoad = useCallback((voteId: number) => {
    setLoadedImages(prev => {
      const newSet = new Set(prev);
      newSet.add(voteId);
      return newSet;
    });
  }, []);

  useEffect(() => {
    if (votes.length > 0) {
      const totalImages = votes.reduce((count, vote) => {
        return count + vote.images.length + vote.voteOptions.filter(opt => opt.optionImage).length;
      }, 0);
      
      setIsAllImagesLoaded(loadedImages.size === totalImages);
    }
  }, [votes, loadedImages]);

  const renderHeader = useCallback(() => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>VoteY</Text>
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
      onImageLoad={handleImageLoad}
    />
  ), [currentUsername, handleVote, handleToggleLike, handleToggleBookmark, handleCommentPress, handleStatisticsPress, animatedWidths, handleImageLoad])

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
          isLoading || !isAllImagesLoaded ? (
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
    backgroundColor: '#fff',
  },
  container: {
    padding: 0,
    paddingBottom: 0,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3182CE',
    letterSpacing: 1,
  },
  voteItem: {
    backgroundColor: '#fff',
    marginBottom: 0,
    borderRadius: 0,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#E2E8F0',
    borderWidth: 0,
  },
  nickname: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#222',
  },
  creationTime: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 12,
    marginBottom: 2,
  },
  categoryBadge: {
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 4,
  },
  categoryText: {
    color: '#3182CE',
    fontSize: 12,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 0,
    lineHeight: 22,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  content: {
    fontSize: 15,
    color: '#222',
    lineHeight: 22,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 0,
  },
  imageContainer: {
    marginBottom: 0,
    borderRadius: 0,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#eee',
    borderRadius: 0,
  },
  optionContainer: {
    marginBottom: 0,
    paddingHorizontal: 12,
    paddingTop: 4,
    width: '100%',
    alignItems: 'stretch',
  },
  imageOptionContainer: {
    // flexDirection: 'row',
    // flexWrap: 'wrap',
    // justifyContent: 'space-between',
    // 한 줄에 하나씩만 나오도록 모두 삭제
  },
  optionWrapper: {
    position: 'relative',
    marginVertical: 2,
    borderRadius: 0,
    width: '100%',
  },
  imageOptionWrapper: {
    width: '100%',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    backgroundColor: '#F7F7F7',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 6,
    width: '100%',
    padding: 0,
    position: 'relative',
  },
  optionButtonWithImage: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 90,
    zIndex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  optionContentWithImage: {
    width: '100%',
    alignItems: 'center',
    position: 'relative',
    zIndex: 2,
  },
  largeOptionImage: {
    width: '100%',
    height: 90,
    borderRadius: 8,
    marginBottom: 6,
    position: 'relative',
    zIndex: 2,
  },
  optionTextContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    zIndex: 2,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  closedOptionButton: {
    backgroundColor: '#F7FAFC',
    borderColor: '#E2E8F0',
  },
  selectedOptionButton: {
    borderColor: '#3182CE',
    borderWidth: 2,
    backgroundColor: '#E6F0FF',
    borderRadius: 8,
  },
  optionButtonText: {
    fontSize: 15,
    color: '#222',
    fontWeight: '500',
    flex: 1,
  },
  selectedOptionText: {
    color: '#3182CE',
    fontWeight: '600',
  },
  percentageText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888',
    marginLeft: 8,
  },
  selectedPercentageText: {
    color: '#3182CE',
  },
  responseCountText: {
    marginTop: 8,
    fontSize: 13,
    color: '#888',
    textAlign: 'right',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
    marginHorizontal: 12,
  },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 10,
    gap: 40,
    borderTopWidth: 0,
    borderTopColor: 'transparent',
  },
  reactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 52,
  },
  reactionText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
    marginLeft: 4,
  },
  activeReactionText: {
    color: '#FF4B6E',
  },
  loaderContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#3182CE',
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
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
  },
  statisticsTabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeStatisticsTab: {
    borderBottomColor: '#3182CE',
  },
  statisticsTabText: {
    fontSize: 15,
    color: '#888',
    fontWeight: '500',
  },
  activeStatisticsTabText: {
    color: '#3182CE',
    fontWeight: '600',
  },
  statisticsContent: {
    flex: 1,
  },
  skeletonItem: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    padding: 0,
    marginTop: 10,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
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
    height: 20,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    marginBottom: 8,
    width: '90%',
    marginHorizontal: 12,
  },
  skeletonMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  skeletonCategory: {
    width: 60,
    height: 20,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    marginRight: 8,
  },
  skeletonDate: {
    width: 80,
    height: 14,
    backgroundColor: '#E2E8F0',
    borderRadius: 7,
  },
  skeletonContent: {
    height: 32,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    marginBottom: 8,
    width: '100%',
    paddingHorizontal: 12,
  },
  skeletonOptions: {
    gap: 8,
    paddingHorizontal: 12,
  },
  skeletonOption: {
    height: 44,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    width: '100%',
    marginBottom: 4,
  },
  skeletonReactions: {
    height: 28,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    marginTop: 8,
    width: '100%',
    paddingHorizontal: 12,
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
    color: '#888',
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
    color: '#888',
    fontWeight: '500',
  },
  gaugeBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: 0,
    zIndex: 1,
  },
  leftOptionImage: {
    width: 100,
    height: 100,
    borderRadius: 0,
    backgroundColor: '#111',
    marginRight: 12,
  },
  rightContent: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    minHeight: 100,
    paddingRight: 16,
  },
  textAndPercentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    zIndex: 2,
  },
})

export default React.memo(MainScreen);
