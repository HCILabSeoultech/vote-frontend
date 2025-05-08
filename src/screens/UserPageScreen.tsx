import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  ScrollView,
  RefreshControl,
  Easing,
} from 'react-native';
import Animated, { FadeInLeft, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { getVoteById, selectVoteOption } from '../api/post';
import { toggleLike, toggleBookmark } from '../api/reaction';
import { getUserPage } from '../api/user';
import { VoteResponse } from '../types/Vote';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkFollow, followUser, unfollowUser } from '../api/follow';
import { Feather } from '@expo/vector-icons';
import CommentScreen from '../screens/CommentScreen';
import RegionStatistics from '../components/RegionStatistics';
import AgeStatistics from '../components/AgeStatistics';
import GenderStatistics from '../components/GenderStatistics';
import { Animated as RNAnimated } from 'react-native';

import { SERVER_URL, IMAGE_BASE_URL } from '../constant/config';

const { width } = Dimensions.get('window');

const SkeletonLoader = React.memo(() => {
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 1000 }),
      -1,
      true
    );
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
  return (
    <Animated.View style={[styles.skeletonItem, animatedStyle]}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonUserInfo}>
          <View style={styles.skeletonText} />
          <View style={[styles.skeletonText, { width: '60%' }]} />
        </View>
      </View>
      <View style={[styles.skeletonText, { width: '80%', height: 16, marginBottom: 12, marginLeft: 12 }]} />
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonPostContent} />
      <View style={styles.skeletonOptions}>
        <View style={styles.skeletonOption} />
        <View style={styles.skeletonOption} />
      </View>
      <View style={styles.skeletonReactions} />
    </Animated.View>
  );
});

const imageWidth = 100;
const gaugeWidthAnims = {};
const VoteOptionGauge = ({ percentage, isSelected, width, imageWidth = 0 }: { percentage: number; isSelected: boolean; width: number; imageWidth?: number }) => {
  const widthAnim = React.useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    const targetWidth = width > 0 ? (width - imageWidth) * (percentage / 100) : 0;
    RNAnimated.timing(widthAnim, {
      toValue: targetWidth,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percentage, width, imageWidth]);
  return (
    <RNAnimated.View
      style={[
        styles.gaugeBar,
        {
          left: imageWidth,
          width: widthAnim,
          backgroundColor: isSelected ? '#4299E1' : '#E2E8F0',
          opacity: 0.3,
          position: 'absolute',
          top: 0,
          height: '100%',
          zIndex: 1,
        },
      ]}
    />
  );
};

const UserPageScreen: React.FC = () => {
  const [votes, setVotes] = useState<VoteResponse[]>([]);
  const [page, setPage] = useState(0);
  const [isLast, setIsLast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [profile, setProfile] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedVoteId, setSelectedVoteId] = useState<number | null>(null);
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);
  const [selectedVoteForStats, setSelectedVoteForStats] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [imageSizes, setImageSizes] = useState<Record<number, { width: number; height: number }>>({});
  const [optionWidths, setOptionWidths] = useState<Record<number, number>>({});
  const gaugeAnimRef = React.useRef<Record<number, RNAnimated.Value>>({});
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [showSkeleton, setShowSkeleton] = useState(true);
  const fadeAnim = useSharedValue(0);
  const skeletonOpacity = useSharedValue(0.3);
  const [activeStatTab, setActiveStatTab] = useState<'region' | 'age' | 'gender'>('region');

  const isFocused = useIsFocused();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'CommentScreen'>>();
  const route = useRoute();
  const { userId } = route.params as { userId: number };

  useEffect(() => {
    if (isFocused) {
      setVotes([]);
      setPage(0);
      setIsLast(false);
      setShowSkeleton(true);
      fetchUserData(0);
    }
  }, [isFocused]);

  useEffect(() => {
    const fetchUserId = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.userId;

        if (!userId) {
          return;
        }

        setCurrentUserId(userId); 
      } catch (e) {
        console.error('JWT 파싱 실패:', e);
      }
    };

    fetchUserId();
  }, []);
  
  useEffect(() => {
    const fetchFollowStatus = async () => {
      if (currentUserId && currentUserId !== userId) {
        const isFollow = await checkFollow(currentUserId, userId);
        setIsFollowing(isFollow);
      }
    };
    fetchFollowStatus();
  }, [currentUserId, userId]);

  useEffect(() => {
    skeletonOpacity.value = withRepeat(
      withTiming(0.7, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  const skeletonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: skeletonOpacity.value,
  }));

  const fetchUserData = async (nextPage: number) => {
    if (loading || isLast) return;
    setLoading(true);
    try {
      const res = await getUserPage(userId, nextPage);
      if (nextPage === 0) {
        setProfile(res);
        setTimeout(() => {
          setShowSkeleton(false);
        }, 1000);
      }
      setVotes((prev) => [...prev, ...res.posts.content]);
      setPage(res.posts.number + 1);
      setIsLast(res.posts.last);
    } catch (err) {
      console.error('유저 페이지 조회 실패:', err);
      Alert.alert('에러', '사용자 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const refreshVote = async (voteId: number) => {
    try {
      const updated = await getVoteById(voteId);
      setVotes((prev) => prev.map((vote) => (vote.voteId === voteId ? updated : vote)));
    } catch (err) {
      console.error('투표 새로고침 실패:', err);
    }
  };

  const handleVote = async (voteId: number, optionId: number) => {
    try {
      await selectVoteOption(voteId, optionId);
      await refreshVote(voteId);
      setSelectedOptions((prev) => ({ ...prev, [voteId]: optionId }));
    } catch (error) {
      console.error('투표 실패:', error);
      Alert.alert('에러', '투표 중 오류가 발생했습니다.');
    }
  };

  const handleToggleLike = async (voteId: number) => {
    try {
      await toggleLike(voteId);
      await refreshVote(voteId);
    } catch (err) {
      Alert.alert('에러', '좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  const handleToggleBookmark = async (voteId: number) => {
    try {
      await toggleBookmark(voteId);
      await refreshVote(voteId);
    } catch (err) {
      Alert.alert('에러', '북마크 처리 중 오류가 발생했습니다.');
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUserId) return;
    try {
      if (isFollowing) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }

      // 최신 프로필 정보 다시 요청
      const res = await getUserPage(userId, 0);
      setProfile(res);
      
      // 팔로우 여부도 다시 설정해야 버튼 상태가 바뀜!
      const followStatus = await checkFollow(currentUserId, userId);
      setIsFollowing(followStatus);

    } catch (err) {
      Alert.alert('에러', '팔로우 처리 중 오류가 발생했습니다.');
    }
  };

  const formatFinishTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime(); // 미래면 양수, 과거면 음수
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 마감일이 미래고, 7일 이내면 "~일 후 마감" 표시
    if (diffDays > 0 && diffDays <= 7) {
      return `${diffDays}일 후 마감`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleCommentPress = (voteId: number) => {
    setSelectedVoteId(voteId);
    setShowCommentModal(true);
  };

  const handleStatisticsPress = (voteId: number) => {
    const vote = votes.find(v => v.voteId === voteId);
    const totalCount = vote?.voteOptions.reduce((sum, opt) => sum + opt.voteCount, 0) || 0;
    
    if (totalCount === 0) {
      Alert.alert('알림', '투표 데이터가 없습니다.');
      return;
    }
    
    setSelectedVoteForStats(voteId);
    setShowStatisticsModal(true);
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await getUserPage(userId, 0);
      setProfile(res);
      setVotes(res.posts.content);
      setPage(res.posts.number + 1);
      setIsLast(res.posts.last);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  }, [userId]);

  const handleImageLoad = useCallback((voteId: number) => {
    setLoadedImages(prev => {
      const newSet = new Set(prev);
      newSet.add(voteId);
      return newSet;
    });
  }, []);

  const getCloudfrontUrl = useCallback((url: string | undefined) => {
    if (!url) return `${IMAGE_BASE_URL}/images/default.png`;
    if (url.includes('votey-image.s3.ap-northeast-2.amazonaws.com')) {
      return url.replace('https://votey-image.s3.ap-northeast-2.amazonaws.com', IMAGE_BASE_URL);
    }
    if (url.startsWith('http')) return url;
    return `${IMAGE_BASE_URL}${url.startsWith('/') ? url : '/' + url}`;
  }, []);

  const formatCreatedAt = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffMinutes < 60) return `${diffMinutes}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString();
  }, []);

  const isVoteClosed = useCallback((finishTime: string) => {
    const finish = new Date(finishTime);
    const now = new Date();
    return finish.getTime() < now.getTime();
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const renderItem = useCallback(({ item, index }: { item: VoteResponse, index: number }) => {
    const closed = isVoteClosed(item.finishTime);
    const selectedOptionId = item.selectedOptionId ?? selectedOptions[item.voteId];
    const hasVoted = !!selectedOptionId;
    const totalCount = item.voteOptions.reduce((sum, opt) => sum + opt.voteCount, 0);
    const hasImageOptions = item.voteOptions.some(opt => opt.optionImage);

    const formatDate = (dateString: string) => {
      const finishDate = new Date(dateString)
      const now = new Date() // 이미 시스템 시간 (KST) 기준
    
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

    return (
      <Animated.View 
        entering={FadeIn.duration(400).delay(index * 50)}
        style={[
          styles.voteItem, 
          closed ? styles.closedVoteItem : styles.activeVoteItem
        ]}
      >
        <View style={styles.userInfoRow}>
          <View style={styles.userInfoLeft}>
            <Image
              source={{
                uri: item.profileImage === 'default.jpg'
                  ? `${IMAGE_BASE_URL}/images/default.png`
                  : getCloudfrontUrl(item.profileImage ?? ''),
              }}
              style={styles.profileImageSmall}
            />
            <View>
              <Text style={styles.nickname}>{item.name}</Text>
              <Text style={styles.createdAtText}>{formatCreatedAt(item.createdAt)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.metaContainer}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.categoryName}</Text>
          </View>
          {closed && (
            <View style={[styles.categoryBadge, { backgroundColor: '#CBD5E0', marginLeft: 0 }]}> 
              <Text style={[styles.categoryText, { color: '#4A5568' }]}>마감됨</Text>
            </View>
          )}
          <Text style={styles.dateText}>{formatDate(item.finishTime)}</Text>
        </View>

        <Text style={styles.title}>{item.title}</Text>

        {item.content && (
          <Text numberOfLines={2} style={styles.content}>{item.content}</Text>
        )}

        {item.images.length > 0 && (
          <View style={styles.imageContainer}>
            {item.images.map((img) => (
              <Image
                key={img.id}
                source={{ uri: getCloudfrontUrl(img.imageUrl ?? '') }}
                style={styles.image}
                resizeMode="cover"
              />
            ))}
          </View>
        )}

        {item.voteOptions.length > 0 && (
          <View style={styles.optionContainer}>
            {item.voteOptions.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              const percentage = totalCount > 0 ? Math.round((opt.voteCount / totalCount) * 100) : 0;
              if (opt.optionImage) {
                return (
                  <View key={opt.id} style={styles.optionWrapper}>
                    <TouchableOpacity
                      style={[
                        styles.optionButton,
                        styles.optionButtonWithImage,
                        {
                          borderWidth: 2,
                          borderColor: isSelected ? '#3182CE' : '#E2E8F0',
                          backgroundColor: isSelected ? '#E6F0FF' : '#F7F7F7',
                        },
                      ]}
                      onPress={() => handleVote(item.voteId, opt.id)}
                      disabled={closed || isSelected}
                      activeOpacity={0.7}
                      onLayout={e => {
                        const width = e.nativeEvent.layout.width;
                        setOptionWidths(prev => {
                          if (prev[opt.id] === width) return prev;
                          return { ...prev, [opt.id]: width };
                        });
                      }}
                    >
                      <Image
                        source={{ uri: getCloudfrontUrl(opt.optionImage ?? '') }}
                        style={styles.leftOptionImage}
                        resizeMode="cover"
                        onError={(e) => { console.warn('옵션 이미지 로드 실패:', opt.optionImage, e.nativeEvent); }}
                      />
                      {optionWidths[opt.id] > 0 && (
                        <VoteOptionGauge
                          percentage={percentage}
                          isSelected={isSelected}
                          width={optionWidths[opt.id]}
                          imageWidth={imageWidth}
                        />
                      )}
                      <View style={styles.rightContent}>
                        <View style={styles.textAndPercentRow}>
                          <Text style={[
                            styles.optionButtonText,
                            isSelected && styles.selectedOptionText,
                            { color: isSelected ? "#2C5282" : "#4A5568" }
                          ]}>
                            {opt.content}
                          </Text>
                          <Text style={[
                            styles.percentageText,
                            isSelected && styles.selectedPercentageText
                          ]}>
                            {percentage}%
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              }
              return (
                <View key={opt.id} style={styles.optionWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      {
                        borderWidth: 2,
                        borderColor: isSelected ? '#3182CE' : '#E2E8F0',
                        backgroundColor: isSelected ? '#E6F0FF' : '#F7F7F7',
                      },
                    ]}
                    onPress={() => handleVote(item.voteId, opt.id)}
                    disabled={closed || isSelected}
                    activeOpacity={0.7}
                    onLayout={e => {
                      const width = e.nativeEvent.layout.width;
                      setOptionWidths(prev => {
                        if (prev[opt.id] === width) return prev;
                        return { ...prev, [opt.id]: width };
                      });
                    }}
                  >
                    {optionWidths[opt.id] > 0 && (
                      <VoteOptionGauge
                        percentage={percentage}
                        isSelected={isSelected}
                        width={optionWidths[opt.id]}
                        imageWidth={0}
                      />
                    )}
                    <View style={styles.textAndPercentRow}>
                      <Text style={[
                        styles.optionButtonText,
                        isSelected && styles.selectedOptionText,
                        { color: isSelected ? "#2C5282" : "#4A5568" }
                      ]}>
                        {opt.content}
                      </Text>
                      <Text style={[
                        styles.percentageText,
                        isSelected && styles.selectedPercentageText
                      ]}>
                        {percentage}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
            {totalCount > 0 && (
              <Text style={styles.responseCountText}>{totalCount}명 참여</Text>
            )}
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.reactionRow}>
          <TouchableOpacity 
            style={styles.reactionItem} 
            onPress={() => handleToggleLike(item.voteId)}
            activeOpacity={0.7}
          >
            <Feather 
              name={item.isLiked ? "heart" : "heart"} 
              size={20} 
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
            onPress={() => handleCommentPress(item.voteId)}
            activeOpacity={0.7}
          >
            <Feather name="message-circle" size={20} color="#718096" />
            <Text style={styles.reactionText}>{item.commentCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.reactionItem} 
            onPress={() => handleToggleBookmark(item.voteId)}
            activeOpacity={0.7}
          >
            <Feather 
              name={item.isBookmarked ? "bookmark" : "bookmark"} 
              size={20} 
              color={item.isBookmarked ? "#1499D9" : "#718096"} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.reactionItem} 
            onPress={() => handleStatisticsPress(item.voteId)}
            activeOpacity={0.7}
          >
            <Feather name="bar-chart-2" size={22} color="#718096" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }, [getCloudfrontUrl, formatCreatedAt, isVoteClosed, selectedOptions, handleVote, handleToggleLike, handleCommentPress, handleToggleBookmark, handleStatisticsPress, optionWidths]);

  const renderHeader = useCallback(() => {
    if (!profile) return (
      <View style={styles.loadingProfileContainer}>
        <View style={styles.skeletonProfile}>
          <View style={styles.skeletonProfileImage} />
          <View style={styles.skeletonProfileInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={[styles.skeletonText, { width: '100%', height: 24 }]} />
            </View>
          </View>
        </View>
      </View>
    );
    
    const isDefault = profile.profileImage === 'default.jpg';
  
    return (
      <View style={styles.profileContainer}>
        <View style={styles.profileHeader}>
          <View style={styles.profileMainInfo}>
            <Image
              source={{
                uri: isDefault
                  ? `${IMAGE_BASE_URL}/images/default.png`
                  : getCloudfrontUrl(profile.profileImage ?? ''),
              }}
              style={styles.profileImage}
            />
            <View style={styles.profileInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1A202C', marginBottom: 4 }}>{profile.name}</Text>
                {currentUserId !== userId && (
                  <TouchableOpacity
                    onPress={handleFollowToggle}
                    style={[
                      styles.followButton,
                      isFollowing ? styles.followingButton : styles.followButton,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.followButtonText,
                      isFollowing ? styles.followingButtonText : styles.followButtonText
                    ]}>
                      {isFollowing ? '팔로잉' : '팔로우'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
        {profile.introduction && (
          <Text style={{ marginTop: 8, fontSize: 14, color: '#4A5568', lineHeight: 20, paddingHorizontal: 16 }}>{profile.introduction}</Text>
        )}
        <View style={styles.tabContainer}>
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'posts' && styles.activeTab]}
              onPress={() => handleTabChange('posts')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
                게시물 ({profile.postCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'followers' && styles.activeTab]}
              onPress={() => handleTabChange('followers')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'followers' && styles.activeTabText]}>
                팔로워 ({profile.followerCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'following' && styles.activeTab]}
              onPress={() => handleTabChange('following')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>
                팔로잉 ({profile.followingCount})
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tabIndicator}>
            <Animated.View 
              style={[
                styles.tabIndicatorBar,
                { 
                  left: activeTab === 'posts' ? '0%' : 
                       activeTab === 'followers' ? '33.333%' : '66.666%',
                  width: '33.333%'
                }
              ]} 
            />
          </View>
        </View>
      </View>
    );
  }, [profile, currentUserId, userId, isFollowing, getCloudfrontUrl, handleFollowToggle, handleTabChange]);

  const keyExtractor = useCallback((item: VoteResponse) => item.voteId.toString(), []);

  const flatListProps = useMemo(() => ({
    data: activeTab === 'posts' ? votes : [],
    keyExtractor,
    renderItem: activeTab === 'posts' ? renderItem : undefined,
    contentContainerStyle: styles.container,
    onEndReached: () => activeTab === 'posts' && fetchUserData(page),
    onEndReachedThreshold: 0.5,
    ListHeaderComponent: renderHeader,
    refreshControl: (
      <RefreshControl
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        colors={["#1499D9"]}
        tintColor="#1499D9"
        progressViewOffset={0}
      />
    ),
    ListEmptyComponent: null,
    showsVerticalScrollIndicator: false,
  }), [activeTab, votes, renderItem, renderHeader, isRefreshing, handleRefresh, fetchUserData, page]);

  const renderEmptyPosts = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>아직 게시물이 없습니다.</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {showSkeleton ? (
        <FlatList
          key="skeleton"
          data={Array(3).fill(null)}
          keyExtractor={(_, index) => `skeleton-${index}`}
          renderItem={({ item, index }) => <SkeletonLoader key={index} />}
          ListHeaderComponent={
            <Animated.View style={[styles.loadingProfileContainer, skeletonAnimatedStyle]}>
              <View style={styles.profileHeader}>
                <View style={styles.profileMainInfo}>
                  <View style={styles.skeletonProfileImage} />
                  <View style={styles.profileInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={[styles.skeletonText, { width: '100%', height: 24 }]} />
                    </View>
                  </View>
                </View>
              </View>
            </Animated.View>
          }
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          {...flatListProps}
        />
      )}

      {showCommentModal && selectedVoteId && (
        <Modal
          visible={showCommentModal}
          transparent
          statusBarTranslucent
          animationType="slide"
          onRequestClose={() => {
            setShowCommentModal(false);
            setSelectedVoteId(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <Pressable 
              style={styles.modalBackground}
              onPress={() => {
                setShowCommentModal(false);
                setSelectedVoteId(null);
              }}
            >
              <View style={styles.modalBackdrop} />
            </Pressable>
            <View style={styles.modalContainer}>
              <CommentScreen
                route={{
                  key: 'comment-modal',
                  name: 'CommentScreen',
                  params: {
                    voteId: selectedVoteId
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}
      {showStatisticsModal && selectedVoteForStats && (
        <Modal
          visible={showStatisticsModal}
          transparent
          statusBarTranslucent
          animationType="slide"
          onRequestClose={() => setShowStatisticsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={styles.modalBackground}
              onPress={() => setShowStatisticsModal(false)}
            >
              <View style={styles.modalBackdrop} />
            </Pressable>
            <View style={[styles.modalContainer, styles.statisticsModalContainer]}>
              <View style={styles.statisticsHeader}>
                <Text style={styles.statisticsTitle}>투표 통계</Text>
                <TouchableOpacity 
                  onPress={() => setShowStatisticsModal(false)}
                  style={styles.closeButton}
                >
                  <Feather name="x" size={24} color="#4A5568" />
                </TouchableOpacity>
              </View>
              <View style={styles.statisticsTabContainer}>
                <TouchableOpacity
                  style={[styles.statisticsTabButton, activeStatTab === 'region' && styles.activeStatisticsTab]}
                  onPress={() => setActiveStatTab('region')}
                >
                  <Text style={[styles.statisticsTabText, activeStatTab === 'region' && styles.activeStatisticsTabText]}>지역별</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statisticsTabButton, activeStatTab === 'age' && styles.activeStatisticsTab]}
                  onPress={() => setActiveStatTab('age')}
                >
                  <Text style={[styles.statisticsTabText, activeStatTab === 'age' && styles.activeStatisticsTabText]}>연령별</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statisticsTabButton, activeStatTab === 'gender' && styles.activeStatisticsTab]}
                  onPress={() => setActiveStatTab('gender')}
                >
                  <Text style={[styles.statisticsTabText, activeStatTab === 'gender' && styles.activeStatisticsTabText]}>성별</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.statisticsContent}>
                {activeStatTab === 'region' && <RegionStatistics voteId={selectedVoteForStats} />}
                {activeStatTab === 'age' && <AgeStatistics voteId={selectedVoteForStats} />}
                {activeStatTab === 'gender' && <GenderStatistics voteId={selectedVoteForStats} />}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1,
    backgroundColor: '#fff',
  },
  flatList: {
    flex: 1,
  },
  container: {
    padding: 0,
    paddingBottom: 24,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  loadingProfileContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    color: '#718096',
    fontSize: 14,
  },
  profileContainer: { 
    marginBottom: 24,
    paddingTop: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  profileMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    backgroundColor: '#E2E8F0',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginLeft: 12,
  },
  profileInfo: {
    marginLeft: 20,
    flex: 1,
  },
  name: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#2D3748',
  },
  followButton: {
    backgroundColor: '#3182CE',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight:30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followingButton: {
    backgroundColor: '#E2E8F0',
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#4A5568',
  },
  pointContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  pointLabel: {
    fontSize: 13,
    color: '#3182CE',
    fontWeight: '500',
    marginRight: 6,
  },
  pointValue: {
    fontSize: 15,
    color: '#2B6CB0',
    fontWeight: '700',
  },
  introduction: { 
    marginTop: 8,
    marginBottom: 20,
    fontSize: 15, 
    color: '#4A5568',
    lineHeight: 22,
  },
  tabContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 0,
    paddingBottom: 0,
    marginBottom: -20,
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
    paddingVertical: 12,
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
  voteItem: {
    backgroundColor: '#fff',
    marginBottom: 0,
    borderRadius: 0,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activeVoteItem: {
    backgroundColor: '#fff',
  },
  closedVoteItem: {
    backgroundColor: '#fff',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  userInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageSmall: {
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
    fontSize: 17,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 0,
    lineHeight: 22,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  metaContainer: {
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
    height: undefined,
    aspectRatio: 1,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionWrapper: {
    position: 'relative',
    marginVertical: 2,
    borderRadius: 0,
    width: '100%',
  },
  imageOptionWrapper: {
    width: '48%',
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
  closedOptionButton: {
    backgroundColor: '#F7FAFC',
    borderColor: '#E2E8F0',
  },
  selectedOptionButton: {
    borderColor: '#1499D9',
    borderWidth: 1.5,
  },
  optionButtonWithImage: {
    minHeight: 100,
  },
  leftOptionImage: {
    width: 100,
    height: 100,
    borderRadius: 0,
    backgroundColor: '#111',
    marginRight: 6,
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
    paddingHorizontal: 12,
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
  gaugeBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: 0,
    zIndex: 1,
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
    gap: 44,
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
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
  },
  createdAtText: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  skeletonContainer: {
    padding: 16,
  },
  skeletonProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  skeletonProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#CBD5E0',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  skeletonProfileInfo: {
    marginLeft: 20,
    flex: 1,
    gap: 8,
  },
  skeletonTabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  skeletonTab: {
    flex: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  skeletonPost: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  skeletonPostHeader: {
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
  skeletonPostInfo: {
    flex: 1,
    gap: 4,
  },
  skeletonPostContent: {
    height: 20,
    backgroundColor: '#CBD5E0',
    borderRadius: 8,
    marginBottom: 5,
    width: '90%',
    marginHorizontal: 12,
  },
  skeletonText: {
    height: 14,
    backgroundColor: '#CBD5E0',
    borderRadius: 7,
    marginBottom: 3,
    width: '80%',
  },
  skeletonOptions: {
    paddingHorizontal: 8,
    gap: 3,
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
  skeletonReaction: {
    width: 24,
    height: 24,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
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
    gap: 5,
  },
  skeletonUserInfo: {
    flex: 1,
  },
  skeletonTitle: {
    height: 24,
    backgroundColor: '#CBD5E0',
    borderRadius: 12,
    marginBottom: 3,
    width: '90%',
    marginHorizontal: 12,
  },
  refreshIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
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
  },
  activeStatisticsTab: {},
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
});

export default UserPageScreen;