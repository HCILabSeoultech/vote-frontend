import React, { useEffect, useState, useCallback, useRef, useMemo } from "react"
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
import { useIsFocused, useNavigation, useFocusEffect, useRoute, RouteProp } from "@react-navigation/native"
import type { StackNavigationProp } from "@react-navigation/stack"
import type { RootStackParamList } from "../navigation/AppNavigator"
import { jwtDecode } from "jwt-decode"
import { useVoteList } from "../hooks/useVoteList"
import CommentScreen from "../screens/CommentScreen"
import RegionStatistics from "../components/RegionStatistics"
import AgeStatistics from "../components/AgeStatistics"
import GenderStatistics from "../components/GenderStatistics"

import { SERVER_URL, IMAGE_BASE_URL } from "../constant/config"

const { width } = Dimensions.get("window")

interface JwtPayload {
  sub: string
}

const SkeletonLoader = React.memo(() => {
  const opacity = useSharedValue(0.3);
  
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View entering={FadeIn.duration(400)}>
      <Animated.View style={[styles.skeletonItem, animatedStyle]}>
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonUserInfo}>
            <View style={styles.skeletonText} />
            <View style={[styles.skeletonText, { width: '60%' }]} />
          </View>
        </View>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonContent} />
        <View style={styles.skeletonOptions}>
          <View style={styles.skeletonOption} />
          <View style={styles.skeletonOption} />
        </View>
        <View style={styles.skeletonReactions} />
      </Animated.View>
    </Animated.View>
  );
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
  const widthAnim = useRef(new RNAnimated.Value(percentage)).current;

  useEffect(() => {
    RNAnimated.timing(widthAnim, {
      toValue: percentage,
      duration: 300,
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
  renderImage,
}: {
  item: VoteResponse;
  currentUsername: string | null;
  onVote: (voteId: number, optionId: number) => void;
  onToggleLike: (voteId: number) => void;
  onToggleBookmark: (voteId: number) => void;
  onCommentPress: (voteId: number) => void;
  onStatisticsPress: (vote: VoteResponse) => void;
  animatedWidths: Record<string, number>;
  renderImage: (imageUrl: string, style: any) => React.ReactNode;
}) => {
  const closed = isVoteClosed(item.finishTime)
  const selectedOptionId = item.selectedOptionId
  const hasVoted = !!selectedOptionId
  const showGauge = closed || hasVoted
  const totalCount = useMemo(() => 
    item.voteOptions.reduce((sum, opt) => sum + opt.voteCount, 0),
    [item.voteOptions]
  )
  const hasImageOptions = useMemo(() => 
    item.voteOptions.some(opt => opt.optionImage),
    [item.voteOptions]
  )
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()

  const [optionWidth, setOptionWidth] = useState(0);
  const imageWidth = 100;

  const animatedWidthsRef = useRef<{ [key: number]: any }>({});
  
  useEffect(() => {
    item.voteOptions.forEach(opt => {
      if (opt.optionImage) {
        if (!animatedWidthsRef.current[opt.id]) {
          const percentage = totalCount > 0 ? Math.round((opt.voteCount / totalCount) * 100) : 0;
          const targetWidth = optionWidth > 0 ? (optionWidth - imageWidth) * (percentage / 100) : 0;
          animatedWidthsRef.current[opt.id] = new RNAnimated.Value(targetWidth);
          RNAnimated.timing(animatedWidthsRef.current[opt.id], {
            toValue: targetWidth,
            duration: 300,
            useNativeDriver: false,
          }).start();
        }
      }
    });
  }, [item.voteOptions, totalCount, optionWidth]);

  const handleVotePress = useCallback((optionId: number) => {
    if (!closed && selectedOptionId !== optionId) {
      onVote(item.voteId, optionId);
    }
  }, [closed, selectedOptionId, onVote, item.voteId]);

  const handleLikePress = useCallback(() => {
    onToggleLike(item.voteId);
  }, [onToggleLike, item.voteId]);

  const handleBookmarkPress = useCallback(() => {
    onToggleBookmark(item.voteId);
  }, [onToggleBookmark, item.voteId]);

  const handleCommentPress = useCallback(() => {
    onCommentPress(item.voteId);
  }, [onCommentPress, item.voteId]);

  const handleStatisticsPress = useCallback(() => {
    onStatisticsPress(item);
  }, [onStatisticsPress, item]);

  const handleUserPress = useCallback(() => {
    navigation.navigate("UserPageScreen", { userId: item.userId });
  }, [navigation, item.userId]);

  // 이미지 옵션 게이지 바 width 계산 함수
  const getGaugeWidth = (percentage: number) => {
    return optionWidth > 0 ? optionWidth * (percentage / 100) : 0;
  };

  // 이미지 옵션별 게이지 width Animated.Value 관리
  const gaugeWidthAnimRef = useRef<{ [key: number]: any }>({});
  useEffect(() => {
    item.voteOptions.forEach(opt => {
      if (opt.optionImage) {
        const optPercentage = totalCount > 0 ? Math.round((opt.voteCount / totalCount) * 100) : 0;
        if (!gaugeWidthAnimRef.current[opt.id]) {
          gaugeWidthAnimRef.current[opt.id] = new RNAnimated.Value(getGaugeWidth(optPercentage));
        }
        const targetWidth = getGaugeWidth(optPercentage);
        RNAnimated.timing(gaugeWidthAnimRef.current[opt.id], {
          toValue: targetWidth,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.voteOptions, totalCount, optionWidth]);

  return (
    <Animated.View
      entering={FadeIn.duration(400).delay((item.voteId % 10) * 50)}
      style={styles.voteItem}
    >
      <View style={styles.userInfoRow}>
        <Image
          source={{
            uri: !item.profileImage || item.profileImage === 'default.jpg'
              ? `${IMAGE_BASE_URL}/images/default.png`
              : item.profileImage.includes('votey-image.s3.ap-northeast-2.amazonaws.com')
                ? item.profileImage.replace('https://votey-image.s3.ap-northeast-2.amazonaws.com', IMAGE_BASE_URL)
                : item.profileImage.startsWith('http')
                  ? item.profileImage
                  : `${IMAGE_BASE_URL}${item.profileImage}`,
          }}
          style={styles.profileImage}
          progressiveRenderingEnabled={true}
          fadeDuration={0}
        />
        <View>
          <TouchableOpacity
            onPress={handleUserPress}
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
            <View key={img.id} style={styles.imageWrapper}>
              {renderImage(img.imageUrl, styles.image)}
            </View>
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
              return (
                <View key={opt.id} style={[styles.optionWrapper, styles.imageOptionWrapper]}>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      isSelected && styles.selectedOptionButton,
                    ]}
                    onPress={() => handleVotePress(opt.id)}
                    disabled={closed || isSelected}
                    activeOpacity={0.7}
                  >
                    {renderImage(opt.optionImage, styles.leftOptionImage)}
                    <View
                      style={styles.rightContent}
                      onLayout={e => setOptionWidth(e.nativeEvent.layout.width)}
                    >
                      {/* 게이지 바 */}
                      {showGauge && (
                        <RNAnimated.View
                          style={[
                            styles.gaugeBar,
                            {
                              left: 0,
                              width: gaugeWidthAnimRef.current[opt.id] || 0,
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
                      <View style={styles.textAndPercentRow}>
                        <Text style={[
                          styles.optionButtonText,
                          isSelected && styles.selectedOptionText,
                          showGauge && { color: isSelected ? "#2C5282" : "#4A5568" },
                          { marginLeft: 12 }
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
                  onPress={() => handleVotePress(opt.id)}
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
                      showGauge && { color: isSelected ? "#2C5282" : "#4A5568" },
                      { marginLeft: 12 }
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
          onPress={handleLikePress}
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
          onPress={handleCommentPress}
          activeOpacity={0.7}
        >
          <Feather name="message-circle" size={22} color="#718096" />
          <Text style={styles.reactionText}>{item.commentCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reactionItem}
          onPress={handleBookmarkPress}
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
          onPress={handleStatisticsPress}
          activeOpacity={0.7}
        >
          <Feather name="bar-chart-2" size={20} color="#718096" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.item.voteId === nextProps.item.voteId &&
    prevProps.item.selectedOptionId === nextProps.item.selectedOptionId &&
    prevProps.item.isLiked === nextProps.item.isLiked &&
    prevProps.item.isBookmarked === nextProps.item.isBookmarked &&
    prevProps.item.likeCount === nextProps.item.likeCount &&
    prevProps.item.commentCount === nextProps.item.commentCount &&
    prevProps.animatedWidths === nextProps.animatedWidths
  );
});

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
              key: 'comment-modal',
              name: 'CommentScreen',
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
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set())
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set())
  const [imageCache, setImageCache] = useState<Record<string, boolean>>({})

  const isFocused = useIsFocused()
  const isFirstLoad = useRef(true);
  const flatListRef = useRef<FlatList>(null);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Main'>>();

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
    fetchInitialVotes();
  }, [fetchInitialVotes]);

  const updateSelectedOptions = useCallback((voteId: number, optionId: number) => {
    setSelectedOptions(prev => {
      if (prev[voteId] === optionId) return prev;
      return { ...prev, [voteId]: optionId };
    });
  }, []);

  const updateImageCache = useCallback((imageUrl: string) => {
    setImageCache(prev => {
      if (prev[imageUrl]) return prev;
      return { ...prev, [imageUrl]: true };
    });
  }, []);

  const handleVote = useCallback(async (voteId: number, optionId: number) => {
    try {
      const token = await AsyncStorage.getItem("token")
      if (!token) {
        Alert.alert("인증 오류", "로그인이 필요합니다.")
        return
      }

      updateSelectedOptions(voteId, optionId)
      await selectVoteOption(voteId, optionId)
      await updateVoteById(voteId)
      
    } catch (error) {
      console.error("투표 실패:", error)
      Alert.alert("에러", "투표 중 오류가 발생했습니다.")
      setSelectedOptions(prev => {
        const newState = { ...prev }
        delete newState[voteId]
        return newState
      })
    }
  }, [updateVoteById, updateSelectedOptions])

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

  const preloadImages = useCallback((imageUrls: string[]) => {
    imageUrls.forEach(url => {
      if (!preloadedImages.has(url)) {
        Image.prefetch(url)
          .then(() => {
            setPreloadedImages(prev => new Set([...prev, url]));
          })
          .catch(() => {});
      }
    });
  }, [preloadedImages]);

  const handleImageLoadStart = useCallback((imageUrl: string) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.add(imageUrl);
      return newSet;
    });
  }, []);

  const handleImageLoadEnd = useCallback((imageUrl: string) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(imageUrl);
      return newSet;
    });
    setImageCache(prev => ({ ...prev, [imageUrl]: true }));
  }, []);

  const renderImage = useCallback((imageUrl: string, style: any) => {
    const isCached = imageCache[imageUrl];
    const isLoading = loadingImages.has(imageUrl);
    const isPreloaded = preloadedImages.has(imageUrl);

    return (
      <View style={[styles.imageWrapper, style]}>
        <Image
          source={{ 
            uri: imageUrl.includes('votey-image.s3.ap-northeast-2.amazonaws.com')
              ? imageUrl.replace('https://votey-image.s3.ap-northeast-2.amazonaws.com', IMAGE_BASE_URL)
              : imageUrl.startsWith('http')
                ? imageUrl
                : `${IMAGE_BASE_URL}${imageUrl}`
          }}
          style={[styles.image, isCached && styles.cachedImage]}
          resizeMode="cover"
          onLoadStart={() => handleImageLoadStart(imageUrl)}
          onLoadEnd={() => handleImageLoadEnd(imageUrl)}
          onError={() => handleImageLoadEnd(imageUrl)}
          progressiveRenderingEnabled={true}
          fadeDuration={0}
        />
        {isLoading && !isPreloaded && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#1499D9" />
          </View>
        )}
      </View>
    );
  }, [imageCache, loadingImages, preloadedImages, handleImageLoadStart, handleImageLoadEnd]);

  const renderItem = useCallback(({ item }: { item: VoteResponse }) => {
    return (
      <VoteItem
        item={item}
        currentUsername={currentUsername}
        onVote={handleVote}
        onToggleLike={handleToggleLike}
        onToggleBookmark={handleToggleBookmark}
        onCommentPress={handleCommentPress}
        onStatisticsPress={handleStatisticsPress}
        animatedWidths={animatedWidths}
        renderImage={renderImage}
      />
    );
  }, [currentUsername, handleVote, handleToggleLike, handleToggleBookmark, handleCommentPress, handleStatisticsPress, animatedWidths, renderImage]);

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

  useFocusEffect(
    useCallback(() => {
      if (route.params?.refresh) {
        handleRefresh();
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
        }, 100);
      }
    }, [route.params, handleRefresh])
  );

  const renderHeader = useCallback(() => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>VoteY</Text>
      <TouchableOpacity onPress={() => Alert.alert("알림", "알림 기능 준비 중입니다.")}>
        <Feather name="bell" size={24} color="#2D3748" />
      </TouchableOpacity>
    </View>
  ), []);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: any[] }) => {
    const imageUrls = viewableItems
      .filter(item => item.item !== null)
      .flatMap(item => [
        ...(item.item.images || []).map((img: any) => img.imageUrl),
        ...(item.item.voteOptions || [])
          .filter((opt: any) => opt.optionImage)
          .map((opt: any) => opt.optionImage)
      ])
      .filter(Boolean);
    
    preloadImages(imageUrls);
  }, [preloadImages]);

  const flatListProps = useMemo(() => ({
    onViewableItemsChanged,
    viewabilityConfig: {
      itemVisiblePercentThreshold: 50,
      minimumViewTime: 100,
    },
  }), [onViewableItemsChanged]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {refreshing && (
        <View style={styles.refreshIndicator}>
          <ActivityIndicator size="small" color="#1499D9" />
          <Text style={styles.refreshText}>새로고침 중...</Text>
        </View>
      )}
      <FlatList
        ref={flatListRef}
        data={isLoading ? Array(3).fill(null) : votes}
        keyExtractor={(item, index) => item?.voteId?.toString() || `skeleton-${index}`}
        renderItem={({ item, index }) => {
          if (isLoading || !item) {
            return <SkeletonLoader key={index} />;
          }
          return renderItem({ item });
        }}
        contentContainerStyle={styles.container}
        ListHeaderComponent={renderHeader}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.2}
        windowSize={3}
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        initialNumToRender={3}
        updateCellsBatchingPeriod={50}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10,
        }}
        scrollEventThrottle={16}
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
          !isLoading && votes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>아직 투표가 없습니다.</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoadingContainer}>
              <ActivityIndicator size="small" color="#1499D9" />
              <Text style={styles.footerLoadingText}>더 많은 투표 불러오는 중...</Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
        {...flatListProps}
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
    height: '85%',
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
    backgroundColor: '#FFFFFF',
    marginBottom: 0,
    borderRadius: 0,
    padding: 0,
    borderBottomWidth: 0,
    borderBottomColor: '#f0f0f0',
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CBD5E0',
  },
  skeletonUserInfo: {
    flex: 1,
  },
  skeletonText: {
    height: 14,
    backgroundColor: '#CBD5E0',
    borderRadius: 7,
    marginBottom: 8,
    width: '80%',
  },
  skeletonTitle: {
    height: 24,
    backgroundColor: '#CBD5E0',
    borderRadius: 12,
    marginBottom: 8,
    width: '90%',
    marginHorizontal: 12,
  },
  skeletonContent: {
    height: 20,
    backgroundColor: '#CBD5E0',
    borderRadius: 8,
    marginBottom: 8,
    width: '90%',
    marginHorizontal: 12,
  },
  skeletonOptions: {
    paddingHorizontal: 8,
    gap: 4,
  },
  skeletonOption: {
    height: 40,
    backgroundColor: '#CBD5E0',
    borderRadius: 8,
    width: '100%',
  },
  skeletonReactions: {
    height: 28,
    backgroundColor: '#CBD5E0',
    borderRadius: 8,
    marginTop: 6,
    marginHorizontal: 12,
    width: '90%',
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
    marginRight: 0,
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
  skeleton: {
    backgroundColor: '#E2E8F0',
  },
  skeletonReaction: {
    width: 24,
    height: 24,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#718096',
    fontWeight: '500',
  },
  refreshIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  refreshText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#1499D9',
    fontWeight: '500',
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  cachedImage: {
    opacity: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export default React.memo(MainScreen);