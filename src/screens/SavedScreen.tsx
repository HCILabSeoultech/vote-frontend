import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
} from 'react-native';
import Animated, { SlideInDown, FadeIn, useAnimatedStyle, withRepeat, withTiming, withSequence, useSharedValue } from 'react-native-reanimated';
import { getStoragePosts } from '../api/storage';
import { toggleLike, toggleBookmark } from '../api/reaction';
import { getVoteById, selectVoteOption } from '../api/post';
import { VoteResponse } from '../types/Vote';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Feather } from '@expo/vector-icons'
import CommentScreen from '../screens/CommentScreen';
import RegionStatistics from '../components/RegionStatistics';
import AgeStatistics from '../components/AgeStatistics';
import GenderStatistics from '../components/GenderStatistics';

const STORAGE_TYPES = [
  { label: '참여한 투표', value: 'voted', count: 0 },
  { label: '좋아요한 투표', value: 'liked', count: 0 },
  { label: '북마크한 투표', value: 'bookmarked', count: 0 },
] as const;

type StorageType = 'voted' | 'liked' | 'bookmarked';
type NavigationProp = StackNavigationProp<RootStackParamList, 'CommentScreen'>;

import { SERVER_URL } from '../constant/config';
const IMAGE_BASE_URL = `${SERVER_URL}`;
const { width } = Dimensions.get('window');

// 스켈레톤 UI 컴포넌트
const SkeletonLoader = () => {
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
}

interface ApiError {
  response?: {
    status: number;
    data: any;
  };
}

// 탭 버튼 컴포넌트 분리
const TabButton = React.memo(({ 
  label, 
  count, 
  isActive, 
  onPress 
}: { 
  label: string;
  count: number;
  isActive: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.tabButton, isActive && styles.activeTab]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.tabText, isActive && styles.activeTabText]}>
      {label} ({count})
    </Text>
  </TouchableOpacity>
));

// 빈 상태 컴포넌트 분리
const EmptyState = React.memo(({ 
  storageType,
  loading 
}: { 
  storageType: StorageType;
  loading: boolean;
}) => {
  if (loading) {
    return (
      <View style={styles.container}>
        {Array(3).fill(0).map((_, index) => (
          <SkeletonLoader key={`skeleton-${index}`} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {storageType === 'voted' ? '아직 참여한 투표가 없습니다.' :
         storageType === 'liked' ? '아직 좋아요한 투표가 없습니다.' :
         '아직 북마크한 투표가 없습니다.'}
      </Text>
    </View>
  );
});

// 통계 탭 컴포넌트 분리
const StatisticsTab = React.memo(({ 
  label, 
  isActive, 
  onPress 
}: { 
  label: string;
  isActive: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[
      styles.statisticsTabButton,
      isActive && styles.activeStatisticsTab
    ]}
    onPress={onPress}
  >
    <Text style={[
      styles.statisticsTabText,
      isActive && styles.activeStatisticsTabText
    ]}>{label}</Text>
  </TouchableOpacity>
));

// 리액션 버튼 컴포넌트 분리
const ReactionButton = React.memo(({ 
  icon, 
  count, 
  isActive, 
  activeColor, 
  onPress 
}: { 
  icon: 'heart' | 'message-circle' | 'bookmark' | 'bar-chart-2';
  count?: number;
  isActive?: boolean;
  activeColor?: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={styles.reactionItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Feather 
      name={icon} 
      size={22} 
      color={isActive ? activeColor : "#718096"} 
    />
    {count !== undefined && (
      <Text style={[
        styles.reactionText,
        isActive && { color: activeColor }
      ]}>
        {count}
      </Text>
    )}
  </TouchableOpacity>
));

// voteId 기준 중복 제거 함수 추가
function uniqueVotes(arr: VoteResponse[]): VoteResponse[] {
  const seen = new Set<number>();
  return arr.filter(vote => {
    if (seen.has(vote.voteId)) return false;
    seen.add(vote.voteId);
    return true;
  });
}

const StorageScreen: React.FC = () => {
  const [storageType, setStorageType] = useState<StorageType>('voted');
  const [votes, setVotes] = useState<VoteResponse[]>([]);
  const [page, setPage] = useState(0);
  const [isLast, setIsLast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const [counts, setCounts] = useState({
    voted: 0,
    liked: 0,
    bookmarked: 0
  });
  const [selectedVoteId, setSelectedVoteId] = useState<number | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);
  const [selectedVoteForStats, setSelectedVoteForStats] = useState<number | null>(null);
  const [activeStatTab, setActiveStatTab] = useState<'region' | 'age' | 'gender'>('region');
  
  // 각 탭의 데이터를 저장할 상태 추가
  const [cachedData, setCachedData] = useState<{
    voted: VoteResponse[];
    liked: VoteResponse[];
    bookmarked: VoteResponse[];
  }>({
    voted: [],
    liked: [],
    bookmarked: []
  });

  // 각 탭의 페이지 정보를 저장할 상태 추가
  const [cachedPages, setCachedPages] = useState<{
    voted: number;
    liked: number;
    bookmarked: number;
  }>({
    voted: 0,
    liked: 0,
    bookmarked: 0
  });

  // 각 탭의 마지막 페이지 여부를 저장할 상태 추가
  const [cachedIsLast, setCachedIsLast] = useState<{
    voted: boolean;
    liked: boolean;
    bookmarked: boolean;
  }>({
    voted: false,
    liked: false,
    bookmarked: false
  });

  const [hasInitialLoad, setHasInitialLoad] = useState(false);

  // 모달 상태 통합
  const [commentModalVoteId, setCommentModalVoteId] = useState<number | null>(null);
  const [statisticsModalVoteId, setStatisticsModalVoteId] = useState<number | null>(null);

  const [imageSizes, setImageSizes] = useState<Record<number, { width: number; height: number }>>({});

  const handleTabChange = (value: StorageType) => {
    setStorageType(value);
    // 캐시된 데이터로 상태 업데이트
    setVotes(cachedData[value]);
    setPage(cachedPages[value]);
    setIsLast(cachedIsLast[value]);
  };

  // 화면이 처음 마운트될 때만 모든 데이터를 가져옴
  useFocusEffect(
    React.useCallback(() => {
      const loadAllData = async () => {
        if (hasInitialLoad) {
          return;
        }

        setLoading(true);
        
        try {
          const [votedRes, likedRes, bookmarkedRes] = await Promise.all([
            getStoragePosts('voted', 0),
            getStoragePosts('liked', 0),
            getStoragePosts('bookmarked', 0)
          ]);
          
          // 각 탭의 데이터 캐시
          setCachedData({
            voted: votedRes?.content || [],
            liked: likedRes?.content || [],
            bookmarked: bookmarkedRes?.content || []
          });
          
          // 각 탭의 페이지 정보 캐시
          setCachedPages({
            voted: votedRes?.number + 1 || 0,
            liked: likedRes?.number + 1 || 0,
            bookmarked: bookmarkedRes?.number + 1 || 0
          });
          
          // 각 탭의 마지막 페이지 여부 캐시
          setCachedIsLast({
            voted: votedRes?.last || false,
            liked: likedRes?.last || false,
            bookmarked: bookmarkedRes?.last || false
          });
          
          // 현재 선택된 탭의 데이터 설정
          setVotes(votedRes?.content || []);
          setPage(votedRes?.number + 1 || 0);
          setIsLast(votedRes?.last || false);
          
          // 카운트 정보 업데이트
          setCounts({
            voted: votedRes?.totalElements || 0,
            liked: likedRes?.totalElements || 0,
            bookmarked: bookmarkedRes?.totalElements || 0
          });

          setHasInitialLoad(true);
        } catch (err) {
          console.error('[초기 데이터 로드 에러]', err);
        } finally {
          setLoading(false);
        }
      };
      
      loadAllData();
      
      return () => {
        // cleanup
      };
    }, [hasInitialLoad])
  );

  const loadPosts = async (nextPage = 0) => {
    if (loading && nextPage !== 0) {
      return;
    }
    if (!hasInitialLoad && nextPage === 0) {
      return;
    }
    setLoading(true);
    try {
      const res = await getStoragePosts(storageType, nextPage);
      if (res && res.content) {
        const newVotes = nextPage === 0 ? res.content : [...cachedData[storageType], ...res.content];
        const uniqueNewVotes = uniqueVotes(newVotes);
        const pageNumber = typeof res.page === 'number' ? res.page : 0;
        setCachedData(prev => {
          const updated = { ...prev, [storageType]: uniqueNewVotes };
          return updated;
        });
        setCachedPages(prev => {
          const updated = { ...prev, [storageType]: pageNumber + 1 };
          return updated;
        });
        setCachedIsLast(prev => {
          const updated = { ...prev, [storageType]: res.last };
          return updated;
        });
        setVotes(uniqueNewVotes);
        setPage(pageNumber + 1);
        setIsLast(res.last);
      }
    } catch (err) {
      console.error('[API 에러]', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCounts = async () => {
    try {
      const votedRes = await getStoragePosts('voted', 0);
      const likedRes = await getStoragePosts('liked', 0);
      const bookmarkedRes = await getStoragePosts('bookmarked', 0);
      
      setCounts({
        voted: votedRes?.totalElements || 0,
        liked: likedRes?.totalElements || 0,
        bookmarked: bookmarkedRes?.totalElements || 0
      });
    } catch (err) {
      console.error('[카운트 조회 에러]', err);
    }
  };

  const onRefresh = async () => {
    if (refreshing) {
      return;
    }
    setRefreshing(true);
    try {
      const res = await getStoragePosts(storageType, 0);
      if (res && res.content) {
        const uniqueContent = uniqueVotes(res.content);
        const pageNumber = typeof res.page === 'number' ? res.page : 0;
        setCachedData(prev => {
          const updated = { ...prev, [storageType]: uniqueContent };
          return updated;
        });
        setCachedPages(prev => {
          const updated = { ...prev, [storageType]: pageNumber + 1 };
          return updated;
        });
        setCachedIsLast(prev => {
          const updated = { ...prev, [storageType]: res.last };
          return updated;
        });
        setVotes(uniqueContent);
        setPage(pageNumber + 1);
        setIsLast(res.last);
        await fetchAllCounts();
      }
    } catch (err) {
      console.error('[새로고침 에러]', err);
    } finally {
      setRefreshing(false);
    }
  };

  // 유틸리티 함수 메모이제이션
  const isVoteClosed = useCallback((finishTime: string) => {
    const finish = new Date(finishTime);
    const now = new Date();
    return finish.getTime() < now.getTime();
  }, []);

  const formatCreatedAt = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
      return `${diffMinutes}분 전`;
    } else if (diffHours < 24) {
      return `${diffHours}시간 전`;
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      return date.toLocaleDateString();
    }
  }, []);

  const formatDate = useCallback((dateString: string) => {
    const finishDate = new Date(dateString);
    const now = new Date();
  
    const diffTime = finishDate.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
    if (diffTime > 0) {
      if (diffMinutes < 60) {
        return `${diffMinutes}분 후 마감`;
      } else if (diffHours < 24) {
        const remainingMinutes = diffMinutes % 60;
        return `${diffHours}시간 ${remainingMinutes}분 후 마감`;
      } else if (diffDays <= 7) {
        const remainingHours = diffHours % 24;
        return `${diffDays}일 ${remainingHours}시간 후 마감`;
      } else {
        return finishDate.toLocaleDateString("ko-KR");
      }
    } else {
      return '';
    }
  }, []);

  // 핸들러 함수 메모이제이션
  const handleCommentPress = useCallback((voteId: number) => {
    setCommentModalVoteId(voteId);
  }, []);

  const handleStatisticsPress = useCallback((voteId: number) => {
    const vote = votes.find(v => v.voteId === voteId);
    const totalCount = vote?.voteOptions.reduce((sum, opt) => sum + opt.voteCount, 0) || 0;
    
    if (totalCount === 0) {
      Alert.alert('알림', '투표 데이터가 없습니다.');
      return;
    }
    
    setStatisticsModalVoteId(voteId);
  }, [votes]);

  const handleVote = useCallback(async (voteId: number, optionId: number) => {
    try {
      await selectVoteOption(voteId, optionId);
      await refreshVote(voteId);
      setSelectedOptions((prev) => ({
        ...prev,
        [voteId]: optionId,
      }));
    } catch (err) {
      Alert.alert('에러', '투표 중 오류가 발생했습니다.');
    }
  }, []);

  const handleToggleLike = useCallback(async (voteId: number) => {
    try {
      await toggleLike(voteId);
      await refreshVote(voteId);
    } catch (err) {
      Alert.alert('에러', '좋아요 처리 중 오류가 발생했습니다.');
    }
  }, []);

  const handleToggleBookmark = useCallback(async (voteId: number) => {
    try {
      await toggleBookmark(voteId);
      await refreshVote(voteId);
    } catch (err) {
      Alert.alert('에러', '북마크 처리 중 오류가 발생했습니다.');
    }
  }, []);

  const refreshVote = async (voteId: number) => {
    try {
      const updated = await getVoteById(voteId);
      setVotes((prev) => prev.map((v) => (v.voteId === voteId ? updated : v)));
    } catch (err) {
      console.error('투표 새로고침 실패:', err);
    }
  };

  const keyExtractor = useCallback((item: VoteResponse, index: number) => {
    return item.voteId ? `vote-${item.voteId}` : `vote-skeleton-${index}`;
  }, []);

  const VoteOptionItem = useMemo(() => React.memo(({ 
    option, 
    isSelected, 
    showGauge, 
    percentage, 
    onPress, 
    closed 
  }: { 
    option: any, 
    isSelected: boolean, 
    showGauge: boolean, 
    percentage: number, 
    onPress: () => void, 
    closed: boolean 
  }) => {
    return (
      <View style={[styles.optionWrapper, option.optionImage && styles.imageOptionWrapper]}>
        <TouchableOpacity
          style={[
            styles.optionButton,
            closed && styles.closedOptionButton,
            isSelected && styles.selectedOptionButton,
            option.optionImage && styles.optionButtonWithImage,
          ]}
          onPress={onPress}
          disabled={closed || isSelected}
          activeOpacity={0.7}
        >
          {showGauge && (
            <View style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${percentage * (option.optionImage ? 1.25 : 1.11)}%`,
              backgroundColor: isSelected ? "#4299E1" : "#E2E8F0",
              opacity: 0.3,
              borderRadius: 12,
            }} />
          )}
          {option.optionImage ? (
            <View style={styles.optionContentWithImage}>
              <Image
                source={{ uri: `${IMAGE_BASE_URL}${option.optionImage}` }}
                style={styles.largeOptionImage}
                resizeMode="cover"
              />
              <View style={styles.optionTextContainer}>
                <Text style={[
                  styles.optionButtonText,
                  isSelected && styles.selectedOptionText,
                  showGauge && { color: isSelected ? "#2C5282" : "#4A5568" }
                ]}>
                  {option.content}
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
                {option.content}
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
    );
  }), []);

  const renderReactions = useCallback((item: VoteResponse) => (
    <View style={styles.reactionRow}>
      <ReactionButton
        icon="heart"
        count={item.likeCount}
        isActive={item.isLiked}
        activeColor="#FF4B6E"
        onPress={() => handleToggleLike(item.voteId)}
      />
      <ReactionButton
        icon="message-circle"
        count={item.commentCount}
        onPress={() => handleCommentPress(item.voteId)}
      />
      <ReactionButton
        icon="bookmark"
        isActive={item.isBookmarked}
        activeColor="#1499D9"
        onPress={() => handleToggleBookmark(item.voteId)}
      />
      <ReactionButton
        icon="bar-chart-2"
        onPress={() => handleStatisticsPress(item.voteId)}
      />
    </View>
  ), [handleToggleLike, handleCommentPress, handleToggleBookmark, handleStatisticsPress]);

  const renderItem = useCallback(({ item, index }: { item: VoteResponse; index: number }) => {
    const closed = isVoteClosed(item.finishTime);
    const selectedOptionId = item.selectedOptionId ?? selectedOptions[item.voteId];
    const hasVoted = !!selectedOptionId;
    const showGauge = closed || hasVoted;
    const totalCount = item.voteOptions.reduce((sum, opt) => sum + opt.voteCount, 0);
    const hasImageOptions = item.voteOptions.some(opt => opt.optionImage);

    return (
      <Animated.View
        entering={FadeIn.duration(400).delay(index * 50)}
        style={[styles.voteItem, closed ? styles.closedVoteItem : styles.activeVoteItem]}
      >
        <View style={styles.userInfoRow}>
          <View style={styles.userInfoLeft}>
            <Image
              source={{
                uri: item.profileImage === 'default.jpg'
                  ? "https://votey-image.s3.ap-northeast-2.amazonaws.com/images/default.png"
                  : item.profileImage,
              }}
              style={styles.profileImage}
            />
            <View>
              <TouchableOpacity
                onPress={() => navigation.navigate('UserPageScreen', { userId: item.userId })}
                activeOpacity={0.7}
              >
                <Text style={styles.nickname}>{item.name}</Text>
              </TouchableOpacity>
              <Text style={styles.createdAtText}>{formatCreatedAt(item.createdAt)}</Text>
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
          <Text numberOfLines={2} style={styles.content}>{item.content}</Text>
        )}

        {item.images.length > 0 && (
          <View style={styles.imageContainer}>
            {item.images.map((img) => {
              const onLoad = (e: any) => {
                const { width: imgW, height: imgH } = e.nativeEvent.source;
                setImageSizes(prev => ({
                  ...prev,
                  [img.id]: { width: imgW, height: imgH }
                }));
              };
              // 기본 비율(16:9)로 먼저 보여주고, 실제 크기 알면 교체
              const aspectRatio = imageSizes[img.id]
                ? imageSizes[img.id].width / imageSizes[img.id].height
                : 16 / 9;
              return (
                <Image
                  key={img.id}
                  source={{ uri: img.imageUrl }}
                  style={[styles.image, { aspectRatio }]}
                  resizeMode="cover"
                  onLoad={onLoad}
                />
              );
            })}
          </View>
        )}

        {item.voteOptions.length > 0 && (
          <View style={[styles.optionContainer, hasImageOptions && styles.imageOptionContainer]}>
            {item.voteOptions.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              const percentage = totalCount > 0 ? Math.round((opt.voteCount / totalCount) * 100) : 0;
              
              return (
                <VoteOptionItem
                  key={opt.id}
                  option={opt}
                  isSelected={isSelected}
                  showGauge={showGauge}
                  percentage={percentage}
                  onPress={() => handleVote(item.voteId, opt.id)}
                  closed={closed}
                />
              );
            })}
            {showGauge && totalCount > 0 && (
              <Text style={styles.responseCountText}>{totalCount}명 참여</Text>
            )}
          </View>
        )}

        <View style={styles.divider} />
        {renderReactions(item)}
      </Animated.View>
    );
  }, [
    isVoteClosed,
    selectedOptions,
    formatCreatedAt,
    formatDate,
    handleVote,
    handleToggleLike,
    handleToggleBookmark,
    handleCommentPress,
    handleStatisticsPress,
    navigation,
    imageSizes
  ]);

  const renderTabs = useCallback(() => (
    <View style={styles.tabContainer}>
      <View style={styles.tabRow}>
        <TabButton
          label="참여한 투표"
          count={counts.voted}
          isActive={storageType === 'voted'}
          onPress={() => handleTabChange('voted')}
        />
        <TabButton
          label="좋아요한 투표"
          count={counts.liked}
          isActive={storageType === 'liked'}
          onPress={() => handleTabChange('liked')}
        />
        <TabButton
          label="북마크한 투표"
          count={counts.bookmarked}
          isActive={storageType === 'bookmarked'}
          onPress={() => handleTabChange('bookmarked')}
        />
      </View>
      <View style={styles.tabIndicator}>
        <Animated.View 
          style={[
            styles.tabIndicatorBar,
            { 
              left: storageType === 'voted' ? '0%' : 
                   storageType === 'liked' ? '33.333%' : '66.666%',
              width: '33.333%'
            }
          ]} 
        />
      </View>
    </View>
  ), [storageType, counts, handleTabChange]);

  const renderStatisticsTabs = useCallback(() => (
    <View style={styles.statisticsTabContainer}>
      <StatisticsTab
        label="지역별"
        isActive={activeStatTab === 'region'}
        onPress={() => setActiveStatTab('region')}
      />
      <StatisticsTab
        label="연령별"
        isActive={activeStatTab === 'age'}
        onPress={() => setActiveStatTab('age')}
      />
      <StatisticsTab
        label="성별"
        isActive={activeStatTab === 'gender'}
        onPress={() => setActiveStatTab('gender')}
      />
    </View>
  ), [activeStatTab]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderTabs()}
      <FlatList
        data={votes}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onEndReached={() => {
          if (!loading && !isLast) {
            loadPosts(page);
          }
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              onRefresh();
            }}
            colors={["#1499D9"]}
            tintColor="#1499D9"
          />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        updateCellsBatchingPeriod={100}
        initialNumToRender={10}
        ListFooterComponent={
          loading && votes.length > 0 ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color="#1499D9" />
              <Text style={styles.loadingText}>불러오는 중...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={() => (
          <EmptyState storageType={storageType} loading={loading} />
        )}
        contentContainerStyle={[
          styles.container,
          votes.length === 0 && !loading && styles.emptyListContainer,
        ]}
        showsVerticalScrollIndicator={false}
      />

      {commentModalVoteId && (
        <Modal
          visible={!!commentModalVoteId}
          transparent
          statusBarTranslucent
          animationType="slide"
          onRequestClose={() => {
            setCommentModalVoteId(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <Pressable 
              style={styles.modalBackground}
              onPress={() => {
                setCommentModalVoteId(null);
              }}
            >
              <View style={styles.modalBackdrop} />
            </Pressable>
            <View style={styles.modalContainer}>
              <CommentScreen
                route={{
                  params: {
                    voteId: commentModalVoteId
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      <Modal
        visible={!!statisticsModalVoteId}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => {
          setStatisticsModalVoteId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <Pressable 
            style={styles.modalBackground}
            onPress={() => {
              setStatisticsModalVoteId(null);
            }}
          >
            <View style={styles.modalBackdrop} />
          </Pressable>
          <View style={[styles.modalContainer, styles.statisticsModalContainer]}>
            <View style={styles.statisticsHeader}>
              <Text style={styles.statisticsTitle}>투표 통계</Text>
              <TouchableOpacity 
                onPress={() => {
                  setStatisticsModalVoteId(null);
                }}
                style={styles.closeButton}
              >
                <Feather name="x" size={24} color="#4A5568" />
              </TouchableOpacity>
            </View>
            {renderStatisticsTabs()}
            <View style={styles.statisticsContent}>
              {selectedVoteForStats && (
                <>
                  {activeStatTab === 'region' && <RegionStatistics voteId={selectedVoteForStats} />}
                  {activeStatTab === 'age' && <AgeStatistics voteId={selectedVoteForStats} />}
                  {activeStatTab === 'gender' && <GenderStatistics voteId={selectedVoteForStats} />}
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#F7FAFC' 
  },
  container: { 
    padding: 14,
    paddingBottom: 24,
    flexGrow: 1,
  },
  tabContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 0,
    paddingBottom: 0,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: -8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  tabButton: {
    paddingVertical: 14,
    flex: 1,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#1499D9',
    fontWeight: '600',
  },
  tabIndicator: {
    height: 2,
    backgroundColor: '#EDF2F7',
    position: 'relative',
  },
  tabIndicatorBar: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#1499D9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#1499D9',
    fontSize: 14,
  },
  footerLoading: {
    padding: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
  voteItem: {
    position: 'relative',
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  activeVoteItem: {
    backgroundColor: '#FFFFFF',
  },
  closedVoteItem: {
    backgroundColor: '#F9FAFB',
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  nickname: {
    fontSize: 15,
    color: '#1A202C',
    fontWeight: '600',
  },
  closedBadge: {
    backgroundColor: '#CBD5E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  closedBadgeText: {
    color: '#4A5568',
    fontSize: 12,
    fontWeight: '500',
  },
  title: { 
    fontSize: 18, 
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
    lineHeight: 24,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  categoryText: {
    color: '#3182CE',
    fontSize: 12,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  content: { 
    fontSize: 15, 
    marginBottom: 12,
    color: '#4A5568',
    lineHeight: 22,
  },
  imageContainer: { 
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: { 
    width: '100%',
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
    marginTop: 8,
    fontSize: 13,
    color: '#718096',
    textAlign: 'right',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 12,
  },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  reactionItem: { 
    flexDirection: 'row', 
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  reactionText: { 
    fontSize: 14, 
    color: '#4A5568',
    fontWeight: '500',
    marginLeft: 6,
  },
  activeReactionText: {
    color: '#FF4B6E',
  },
  emptyListContainer: { 
    flex: 1, 
    backgroundColor: '#F7FAFC' 
  },
  createdAtText: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
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
  // 스켈레톤 UI 스타일
  skeletonItem: {
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 12,
    width: '100%',
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
    width: '100%',
  },
});

export default React.memo(StorageScreen);