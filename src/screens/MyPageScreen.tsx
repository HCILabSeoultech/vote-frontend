import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  RefreshControl,
  Animated as RNAnimated,
} from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, withRepeat, withTiming, withSequence, useSharedValue } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { getMyPage } from '../api/user';
import { toggleLike, toggleBookmark } from '../api/reaction';
import { selectVoteOption, getVoteById, deleteVote } from '../api/post';
import { VoteResponse } from '../types/Vote';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Feather } from '@expo/vector-icons';
import CommentScreen from '../screens/CommentScreen';
import RegionStatistics from '../components/RegionStatistics';
import AgeStatistics from '../components/AgeStatistics';
import GenderStatistics from '../components/GenderStatistics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SERVER_URL, IMAGE_BASE_URL } from '../constant/config';

const { width } = Dimensions.get('window');

const TABS = [
  { label: '게시물', value: 'posts' },
  { label: '팔로워', value: 'followers' },
  { label: '팔로잉', value: 'following' },
] as const;

type TabType = 'posts' | 'followers' | 'following';

type NavigationProp = StackNavigationProp<{
  Main: undefined;
  Login: undefined;
  Signup: undefined;
  SignupStep1Screen: undefined;
  CommentScreen: { voteId: number };
  EditProfile: undefined;
  ReuploadVoteScreen: { voteId: number };
}>;

// 전역 이미지 캐시 상태
const profileImageCache = new Map<string, boolean>();

// 스켈레톤 UI 컴포넌트
const SkeletonLoader = () => {
  const opacity = useSharedValue(0.5);
  
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 600 }),
        withTiming(0.9, { duration: 600 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <ScrollView style={styles.skeletonContainer}>
      <Animated.View style={[styles.skeletonContentWrapper, animatedStyle]}>
        {/* 프로필 섹션 */}
        <View style={styles.profileContainer}>
          <View style={styles.profileHeader}>
            <View style={styles.profileMainInfo}>
              <View style={styles.skeletonProfileImage} />
              <View style={styles.profileInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={[styles.skeletonText, { width: '30%', height: 24 }]} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={[styles.skeletonText, { width: 80, height: 32, borderRadius: 8 }]} />
                    <View style={[styles.skeletonText, { width: 80, height: 32, borderRadius: 8 }]} />
                  </View>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.skeletonIntroduction}>
            <View style={[styles.skeletonText, { width: '95%', height: 16 }]} />
          </View>
        </View>

        {/* 탭 섹션 */}
        <View style={[styles.tabContainer, { borderBottomWidth: 0 }]}>
          <View style={styles.tabRow}>
            <View style={styles.skeletonTab} />
            <View style={styles.skeletonTab} />
            <View style={styles.skeletonTab} />
          </View>
        </View>

        {/* 게시물(글) 스켈레톤 - 메인페이지와 동일하게 */}
        {[1, 2, 3].map((_, index) => (
          <Animated.View key={index} style={[styles.skeletonItem, animatedStyle]}>
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
        ))}
      </Animated.View>
    </ScrollView>
  );
};

// 게이지 애니메이션 컴포넌트 (MainScreen과 동일)
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

// 프로필 이미지 컴포넌트를 메모이제이션
const MemoizedProfileImage = React.memo(({ uri, style }: { uri: string; style: any }) => {
  const [isLoaded, setIsLoaded] = useState(profileImageCache.has(uri));
  const [isError, setIsError] = useState(false);
  const imageRef = useRef<Image>(null);

  useEffect(() => {
    if (profileImageCache.has(uri)) {
      return;
    }

    let isMounted = true;
    
    const loadImage = async () => {
      try {
        await Image.prefetch(uri);
        if (isMounted) {
          profileImageCache.set(uri, true);
          setIsLoaded(true);
          setIsError(false);
        }
      } catch (error) {
        if (isMounted) {
          setIsError(true);
          setIsLoaded(true);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [uri]);

  const handleLoad = useCallback(() => {
    profileImageCache.set(uri, true);
    setIsLoaded(true);
    setIsError(false);
  }, [uri]);

  const handleError = useCallback(() => {
    setIsError(true);
    setIsLoaded(true);
  }, []);

  if (profileImageCache.has(uri)) {
    return (
      <View style={[styles.profileImageContainer, style]}>
        <Image
          ref={imageRef}
          source={{ 
            uri: isError ? `${IMAGE_BASE_URL}/images/default.png` : uri,
            cache: 'force-cache'
          }}
          style={styles.profileImage}
          resizeMode="cover"
          onError={handleError}
          progressiveRenderingEnabled={true}
          fadeDuration={0}
        />
      </View>
    );
  }

  return (
    <View style={[styles.profileImageContainer, style]}>
      <Image
        ref={imageRef}
        source={{ 
          uri: isError ? `${IMAGE_BASE_URL}/images/default.png` : uri,
          cache: 'force-cache'
        }}
        style={[
          styles.profileImage,
          !isLoaded && { opacity: 0 }
        ]}
        resizeMode="cover"
        onLoad={handleLoad}
        onError={handleError}
        progressiveRenderingEnabled={true}
        fadeDuration={0}
      />
      {!isLoaded && (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
          <ActivityIndicator size="small" color="#1499D9" />
        </View>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  return prevProps.uri === nextProps.uri;
});

// PostItem 컴포넌트를 분리하고 React.memo로 감싸기
const PostItem = React.memo(({ 
  item, 
  onVote, 
  onToggleLike, 
  onToggleBookmark, 
  onCommentPress, 
  onStatisticsPress, 
  onDeleteVote,
  navigation,
  formatCreatedAt,
  isVoteClosed,
  selectedOptions
}: {
  item: VoteResponse;
  onVote: (voteId: number, optionId: number) => void;
  onToggleLike: (voteId: number) => void;
  onToggleBookmark: (voteId: number) => void;
  onCommentPress: (voteId: number) => void;
  onStatisticsPress: (voteId: number) => void;
  onDeleteVote: (voteId: number) => void;
  navigation: NavigationProp;
  formatCreatedAt: (dateString: string) => string;
  isVoteClosed: (finishTime: string) => boolean;
  selectedOptions: Record<number, number>;
}) => {
  const closed = isVoteClosed(item.finishTime);
  const selectedOptionId = item.selectedOptionId ?? selectedOptions[item.voteId];
  const hasVoted = !!selectedOptionId;
  const showGauge = closed || hasVoted;
  const totalCount = item.voteOptions.reduce((sum, opt) => sum + opt.voteCount, 0);
  const hasImageOptions = item.voteOptions.some(opt => opt.optionImage);

  return (
    <View style={styles.voteItem}>
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
          style={styles.profileImageSmall}
        />
        <View>
          <Text style={styles.nickname}>{item.name}</Text>
          <Text style={styles.createdAtText}>{formatCreatedAt(item.createdAt)}</Text>
        </View>
        <View style={{ flex: 1 }} />
        {closed && (
          <TouchableOpacity
            onPress={() => navigation.navigate('ReuploadVoteScreen', { voteId: item.voteId })}
            style={[styles.pointContainer, { backgroundColor: '#EBF8FF', minWidth: 70, paddingHorizontal: 8 }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.pointLabel, { color: '#3182CE' }]}>재업로드</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() =>
            Alert.alert('삭제 확인', '정말 삭제하시겠습니까?', [
              { text: '취소', style: 'cancel' },
              {
                text: '삭제',
                style: 'destructive',
                onPress: () => onDeleteVote(item.voteId),
              },
            ])
          }
          style={[styles.pointContainer, { backgroundColor: '#FFF5F5' }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.pointLabel, { color: '#E53E3E' }]}>삭제</Text>
        </TouchableOpacity>
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
              source={{ 
                uri: img.imageUrl.includes('votey-image.s3.ap-northeast-2.amazonaws.com')
                  ? img.imageUrl.replace('https://votey-image.s3.ap-northeast-2.amazonaws.com', IMAGE_BASE_URL)
                  : img.imageUrl.startsWith('http')
                    ? img.imageUrl
                    : `${IMAGE_BASE_URL}${img.imageUrl}`
              }}
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
                      isSelected && styles.selectedOptionButton,
                    ]}
                    onPress={() => onVote(item.voteId, opt.id)}
                    disabled={closed || isSelected}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ 
                        uri: opt.optionImage.includes('votey-image.s3.ap-northeast-2.amazonaws.com')
                          ? opt.optionImage.replace('https://votey-image.s3.ap-northeast-2.amazonaws.com', IMAGE_BASE_URL)
                          : opt.optionImage.startsWith('http')
                            ? opt.optionImage
                            : `${IMAGE_BASE_URL}${opt.optionImage}`
                      }}
                      style={styles.leftOptionImage}
                      resizeMode="cover"
                    />
                    {showGauge && (
                      <VoteOptionGauge percentage={percentage} isSelected={isSelected} />
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
              <View key={opt.id} style={styles.optionWrapper}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    closed && styles.closedOptionButton,
                    isSelected && styles.selectedOptionButton,
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
          {showGauge && totalCount > 0 && (
            <Text style={styles.responseCountText}>{totalCount}명 참여</Text>
          )}
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
          onPress={() => onStatisticsPress(item.voteId)}
          activeOpacity={0.7}
        >
          <Feather name="bar-chart-2" size={20} color="#718096" />
        </TouchableOpacity>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // 최적화를 위한 비교 함수
  return (
    prevProps.item === nextProps.item &&
    prevProps.selectedOptions[prevProps.item.voteId] === nextProps.selectedOptions[nextProps.item.voteId]
  );
});

const MyPageScreen: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<VoteResponse[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [isLast, setIsLast] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [commentModalVoteId, setCommentModalVoteId] = useState<number | null>(null);
  const [statisticsModalVoteId, setStatisticsModalVoteId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [activeStatTab, setActiveStatTab] = useState<'region' | 'age' | 'gender'>('region');
  const [refreshing, setRefreshing] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());
  const [imageCache, setImageCache] = useState<Record<string, boolean>>({});
  const [showSkeleton, setShowSkeleton] = useState(true);

  const isFirstLoad = useRef(true);
  const flatListRef = useRef<FlatList>(null);
  const isFocused = useIsFocused();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const optionWidthRef = useRef<Record<number, number>>({});
  const gaugeWidthAnims = useRef<Record<number, RNAnimated.Value>>({});
  const imageWidth = 100;

  // 데이터 캐시를 위한 ref
  const cachedData = useRef<{
    profile: any;
    posts: VoteResponse[];
    followers: any[];
    following: any[];
    lastLoadedTab: TabType | null;
  }>({
    profile: null,
    posts: [],
    followers: [],
    following: [],
    lastLoadedTab: null
  });

  // 탭 변경 시 데이터 유지
  useEffect(() => {
    if (isFocused && cachedData.current.profile) {
      setProfile(cachedData.current.profile);
      setPosts(cachedData.current.posts);
      setFollowers(cachedData.current.followers);
      setFollowing(cachedData.current.following);
      setProfileLoading(false);
      setPostsLoading(false);
    }
  }, [isFocused]);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await getMyPage(0);
      setProfile(res);
      cachedData.current.profile = res;
    } catch (err) {
      Alert.alert('에러', '프로필 정보를 불러오지 못했습니다.');
    }
  }, []);

  const fetchPosts = useCallback(async (nextPage: number) => {
    try {
      const res = await getMyPage(nextPage);
      if (nextPage === 0) {
        setPosts(res.posts.content);
        cachedData.current.posts = res.posts.content;
      } else {
        setPosts(prev => {
          const newPosts = [...prev, ...res.posts.content];
          cachedData.current.posts = newPosts;
          return newPosts;
        });
      }
      setPage(res.posts.number + 1);
      setIsLast(res.posts.last);
    } catch (err) {
      Alert.alert('에러', '게시물을 불러오지 못했습니다.');
    } finally {
      setPostsLoading(false);
    }
  }, []);

  // 초기 데이터 로딩
  useEffect(() => {
    if (isFirstLoad.current) {
      const loadInitialData = async () => {
        setProfileLoading(true);
        setPostsLoading(true);
        try {
          await Promise.all([
            fetchProfile(),
            fetchPosts(0)
          ]);
        } finally {
          // 1초 후에 스켈레톤 UI를 숨깁니다
          setTimeout(() => {
            setProfileLoading(false);
            setShowSkeleton(false);
          }, 1000);
          isFirstLoad.current = false;
        }
      };
      loadInitialData();
    }
  }, []);

  // 새로고침
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPostsLoading(true);
    setShowSkeleton(true);
    try {
      await Promise.all([
        fetchProfile(),
        fetchPosts(0)
      ]);
    } finally {
      setTimeout(() => {
        setRefreshing(false);
        setShowSkeleton(false);
      }, 1000);
      isFirstLoad.current = false;
    }
  }, [fetchProfile, fetchPosts]);

  // 탭 변경 핸들러
  const handleTabChange = useCallback((value: TabType) => {
    if (activeTab === value) return;
    
    // 이전 탭의 데이터 캐시
    if (activeTab === 'posts') {
      cachedData.current.posts = posts;
    } else if (activeTab === 'followers') {
      cachedData.current.followers = followers;
    } else if (activeTab === 'following') {
      cachedData.current.following = following;
    }

    setActiveTab(value);
    cachedData.current.lastLoadedTab = value;
  }, [activeTab, posts, followers, following]);

  // 이미지 프리로딩 함수
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

  // 이미지 로딩 상태 관리
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

  // 이미지 렌더링 최적화
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

  // 뷰어블 아이템 변경 감지
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: any[] }) => {
    const imageUrls = viewableItems
      .flatMap(item => [
        ...item.item.images.map((img: any) => img.imageUrl),
        ...item.item.voteOptions
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

  // 이미지 옵션 게이지 애니메이션 useEffect (posts가 바뀔 때마다)
  useEffect(() => {
    posts.forEach(item => {
      const totalCount = item.voteOptions.reduce((sum, o) => sum + o.voteCount, 0);
      item.voteOptions.forEach(opt => {
        if (opt.optionImage) {
          if (!gaugeWidthAnims.current[opt.id]) {
            gaugeWidthAnims.current[opt.id] = new RNAnimated.Value(0);
          }
          const percentage = totalCount > 0 ? Math.round((opt.voteCount / totalCount) * 100) : 0;
          const optionWidth = optionWidthRef.current[opt.id] || 0;
          if (optionWidth > 0) {
            const targetWidth = (optionWidth - imageWidth) * (percentage / 100);
            RNAnimated.timing(gaugeWidthAnims.current[opt.id], {
              toValue: targetWidth,
              duration: 400,
              useNativeDriver: false,
            }).start();
          }
        }
      });
    });
  }, [posts]);

  const isVoteClosed = useCallback((finishTime: string) => {
    const finish = new Date(finishTime)
    const now = new Date()
    return finish.getTime() < now.getTime()
  }, []);
  
  const refreshVote = useCallback(async (voteId: number) => {
    try {
      const updated = await getVoteById(voteId);
      setPosts(prev => prev.map(p => (p.voteId === voteId ? updated : p)));
    } catch (err) {
      console.error('투표 새로고침 실패:', err);
    }
  }, []);

  const handleVote = useCallback(async (voteId: number, optionId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('인증 오류', '로그인이 필요합니다.');
        return;
      }
      setSelectedOptions(prev => ({
        ...prev,
        [voteId]: optionId,
      }));
      await selectVoteOption(voteId, optionId);
      await refreshVote(voteId);
    } catch (err) {
      setSelectedOptions(prev => {
        const newState = { ...prev };
        delete newState[voteId];
        return newState;
      });
      Alert.alert('에러', '투표 중 오류가 발생했습니다.');
    }
  }, [refreshVote]);

  const handleToggleLike = useCallback(async (voteId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('인증 오류', '로그인이 필요합니다.');
        return;
      }
      await toggleLike(voteId);
      await refreshVote(voteId);
    } catch (err) {
      Alert.alert('에러', '좋아요 처리 중 오류가 발생했습니다.');
    }
  }, [refreshVote]);

  const handleToggleBookmark = useCallback(async (voteId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('인증 오류', '로그인이 필요합니다.');
        return;
      }
      await toggleBookmark(voteId);
      await refreshVote(voteId);
    } catch (err) {
      Alert.alert('에러', '북마크 처리 중 오류가 발생했습니다.');
    }
  }, [refreshVote]);

  const handleDeleteVote = useCallback(async (voteId: number) => {
    try {
      await deleteVote(voteId);
      setPosts(prev => prev.filter(post => post.voteId !== voteId));
      Alert.alert('삭제 완료', '투표가 삭제되었습니다.');
    } catch (err) {
      Alert.alert('에러', '삭제 중 오류가 발생했습니다.');
    }
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

  const handleCommentPress = useCallback((voteId: number) => {
    setCommentModalVoteId(voteId);
  }, []);

  const handleStatisticsPress = useCallback((voteId: number) => {
    const vote = posts.find(v => v.voteId === voteId);
    const totalCount = vote?.voteOptions.reduce((sum, opt) => sum + opt.voteCount, 0) || 0;
    if (totalCount === 0) {
      Alert.alert('알림', '투표 데이터가 없습니다.');
      return;
    }
    setStatisticsModalVoteId(voteId);
  }, [posts]);

  // renderPost 함수를 useCallback으로 최적화
  const renderPost = useCallback(({ item }: { item: VoteResponse }) => (
    <PostItem
      item={item}
      onVote={handleVote}
      onToggleLike={handleToggleLike}
      onToggleBookmark={handleToggleBookmark}
      onCommentPress={handleCommentPress}
      onStatisticsPress={handleStatisticsPress}
      onDeleteVote={handleDeleteVote}
      navigation={navigation}
      formatCreatedAt={formatCreatedAt}
      isVoteClosed={isVoteClosed}
      selectedOptions={selectedOptions}
    />
  ), [handleVote, handleToggleLike, handleToggleBookmark, handleCommentPress, handleStatisticsPress, handleDeleteVote, navigation, formatCreatedAt, isVoteClosed, selectedOptions]);

  const renderHeader = () => {
    if (!profile || showSkeleton) return (
      <View style={styles.loadingProfileContainer}>
        <View style={styles.profileHeader}>
          <View style={styles.profileMainInfo}>
            <View style={styles.skeletonProfileImage} />
            <View style={styles.profileInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={[styles.skeletonText, { width: '30%', height: 24 }]} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={[styles.skeletonText, { width: 80, height: 32, borderRadius: 8 }]} />
                  <View style={[styles.skeletonText, { width: 80, height: 32, borderRadius: 8 }]} />
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
    
    const isDefault = profile.profileImage === 'default.jpg';
    const profileImageUri = isDefault
      ? `${IMAGE_BASE_URL}/images/default.png`
      : profile.profileImage.includes('votey-image.s3.ap-northeast-2.amazonaws.com')
        ? profile.profileImage.replace('https://votey-image.s3.ap-northeast-2.amazonaws.com', IMAGE_BASE_URL)
        : profile.profileImage.startsWith('http')
          ? profile.profileImage
          : `${IMAGE_BASE_URL}${profile.profileImage}`;

    const memoizedProfileImageUri = useMemo(() => profileImageUri, [profileImageUri]);
  
    return (
      <View style={styles.profileContainer}>
        <View style={styles.profileHeader}>
          <View style={styles.profileMainInfo}>
            <MemoizedProfileImage
              uri={memoizedProfileImageUri}
              style={styles.profileImage}
            />
            <View style={styles.profileInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1A202C', marginBottom: 4 }}>{profile.name}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => Alert.alert('알림', '프로필 수정 기능은 준비중입니다.')}
                    style={styles.editButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editButtonText}>프로필 수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        '로그아웃',
                        '정말 로그아웃하시겠습니까?',
                        [
                          {
                            text: '취소',
                            style: 'cancel',
                          },
                          {
                            text: '로그아웃',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await AsyncStorage.removeItem('token');
                                navigation.reset({
                                  index: 0,
                                  routes: [{ name: 'Login' }],
                                });
                              } catch (err) {
                                Alert.alert('오류', '로그아웃 중 문제가 발생했습니다.');
                              }
                            },
                          },
                        ]
                      );
                    }}
                    style={[styles.editButton, { backgroundColor: '#FEE2E2' }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.editButtonText, { color: '#E53E3E' }]}>로그아웃</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
        {profile.introduction && (
          <Text numberOfLines={1} style={{ marginTop: 8, fontSize: 14, color: '#4A5568', lineHeight: 20, paddingHorizontal: 16 }}>{profile.introduction}</Text>
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
          {!showSkeleton && (
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
          )}
        </View>
      </View>
    );
  };

  const renderUser = useCallback(({ item }: { item: any }) => (
    <View style={styles.userCard}>
      <Image source={{ uri: item.profileImage }} style={styles.userCardImage} />
      <View style={styles.userCardInfo}>
        <Text style={styles.userCardName}>{item.name}</Text>
        {/* <Text style={styles.userCardIntro}>간단한 소개글</Text> */}
      </View>
      {/* <TouchableOpacity style={styles.userCardButton}><Text style={styles.userCardButtonText}>팔로우</Text></TouchableOpacity> */}
    </View>
  ), []);

  // 게시물 무한 스크롤
  const handleLoadMore = useCallback(() => {
    if (isLast || activeTab !== 'posts') return;
    fetchPosts(page);
  }, [isLast, activeTab, page, fetchPosts]);

  const renderContent = () => {
    let data = [];
    let renderItem = undefined;
    let keyExtractor = undefined;
    if (activeTab === 'posts') {
      data = posts;
      renderItem = renderPost;
      keyExtractor = (item: VoteResponse) => item.voteId.toString();
    } else if (activeTab === 'followers') {
      data = followers;
      renderItem = renderUser;
      keyExtractor = (item: any) => `follower-${item.id}`;
    } else if (activeTab === 'following') {
      data = following;
      renderItem = renderUser;
      keyExtractor = (item: any) => `following-${item.id}`;
    }

    return (
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={null}
        contentContainerStyle={styles.container}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={10}
        initialNumToRender={5}
        updateCellsBatchingPeriod={50}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10,
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#1499D9"]}
            tintColor="#1499D9"
            progressViewOffset={10}
          />
        }
        ListHeaderComponent={() => (
          <>
            {renderHeader()}
          </>
        )}
        {...flatListProps}
      />
    );
  };

  const ProfileSkeleton = () => {
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
      <Animated.View entering={FadeIn.duration(300)}>
        <Animated.View 
          style={[styles.profileContainer, animatedStyle]}
        >
          <View style={styles.profileHeader}>
            <View style={styles.profileMainInfo}>
              <View style={styles.skeletonProfileImage} />
              <View style={styles.profileInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={[styles.skeletonText, { width: '30%', height: 24 }]} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={[styles.skeletonText, { width: 80, height: 32, borderRadius: 8 }]} />
                    <View style={[styles.skeletonText, { width: 80, height: 32, borderRadius: 8 }]} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { flex: 1, paddingTop: insets.top }]}> 
      {showSkeleton ? (
        <SkeletonLoader />
      ) : (
        <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1 }}>
          {renderContent()}
          {commentModalVoteId !== null && (
            <Modal
              visible={true}
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
                      key: 'comment-modal',
                      name: 'CommentScreen',
                      params: {
                        voteId: commentModalVoteId
                      }
                    }}
                  />
                </View>
              </View>
            </Modal>
          )}

          {statisticsModalVoteId !== null && (
          <Modal
              visible={true}
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
                    {statisticsModalVoteId && (
                    <>
                        {activeStatTab === 'region' && <RegionStatistics voteId={statisticsModalVoteId} />}
                        {activeStatTab === 'age' && <AgeStatistics voteId={statisticsModalVoteId} />}
                        {activeStatTab === 'gender' && <GenderStatistics voteId={statisticsModalVoteId} />}
                    </>
                  )}
                </View>
              </View>
            </View>
          </Modal>
          )}
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  container: {
    padding: 0,
    paddingBottom: 24,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  profileContainer: { 
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#E2E8F0',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  name: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#1A202C',
    marginBottom: 4,
  },
  pointContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minWidth: 50,
  },
  pointLabel: {
    fontSize: 12,
    color: '#4A5568',
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
  },
  pointValue: {
    fontSize: 13,
    color: '#2B6CB0',
    fontWeight: '600',
  },
  profilePointContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minWidth: 80,
  },
  profilePointLabel: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
  },
  profilePointValue: {
    fontSize: 15,
    color: '#2B6CB0',
    fontWeight: '600',
  },
  introduction: { 
    marginTop: 8,
    fontSize: 14, 
    color: '#4A5568',
    lineHeight: 20,
  },
  tabContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
  },
  tabText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3182CE',
    fontWeight: '600',
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
  createdAtText: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
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
  content: {
    fontSize: 15,
    color: '#222',
    lineHeight: 22,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 0,
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
  optionButtonWithImage: {
    minHeight: 100,
  },
  optionButtonTextContainer: {
    minHeight: 60,
  },
  optionContentWithImage: {
    width: '100%',
    alignItems: 'center',
  },
  largeOptionImage: {
    width: '100%',
    height: 90,
    borderRadius: 8,
    marginBottom: 6,
  },
  optionTextContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
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
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#718096',
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
  tabIndicator: {
    height: 2,
    position: 'relative',
  },
  tabIndicatorBar: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#1499D9',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
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
  activeStatisticsTab: {
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
  skeletonContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  skeletonContentWrapper: {
    flex: 1,
  },
  skeletonProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#CBD5E0',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  skeletonText: {
    height: 16,
    backgroundColor: '#CBD5E0',
    borderRadius: 7,
    marginBottom: 4,
    width: '80%',
  },
  skeletonTab: {
    height: 35,
    backgroundColor: '#CBD5E0',
    borderRadius: 8,
    flex: 1,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CBD5E0',
    marginLeft: 10,
  },
  skeletonItem: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderRadius: 0,
    padding: 8,
    marginHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginTop: 0,
    marginLeft: -4,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 0,
    gap: 8,
  },
  skeletonUserInfo: {
    flex: 1,
  },
  skeletonTitle: {
    height: 24,
    backgroundColor: '#CBD5E0',
    borderRadius: 12,
    marginBottom: 6,
    width: '90%',
    marginHorizontal: 12,
  },
  skeletonContent: {
    height: 20,
    backgroundColor: '#CBD5E0',
    borderRadius: 8,
    marginBottom: 6,
    width: '90%',
    marginHorizontal: 12,
  },
  skeletonOptions: {
    paddingHorizontal: 12,
    gap: 8,
  },
  skeletonOption: {
    height: 44,
    backgroundColor: '#CBD5E0',
    borderRadius: 8,
    width: '100%',
    marginBottom: 6,
  },
  skeletonReactions: {
    height: 28,
    backgroundColor: '#CBD5E0',
    borderRadius: 8,
    marginTop: 6,
    marginHorizontal: 12,
    width: '90%',
  },
  skeletonIntroduction: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  loadingProfileContainer: {
    padding: 16,
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
  },
  editButtonText: {
    color: '#3182CE',
    fontWeight: '600',
    fontSize: 14,
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
  profileImageContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E2E8F0',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 14,
  },
  userCardImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
  userCardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userCardName: {
    fontSize: 16,
    color: '#222',
    fontWeight: '600',
  },
  userCardIntro: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  userCardButton: {
    backgroundColor: '#3182CE',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  userCardButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
  closedOptionButton: {
    backgroundColor: '#F7FAFC',
    borderColor: '#E2E8F0',
  },
  gaugeBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: 0,
    zIndex: 1,
  },
  image: { 
    width: '100%', 
    height: undefined,
    aspectRatio: 1,
  },
  imageContainer: { 
    marginBottom: 0,
    borderRadius: 0,
    overflow: 'hidden',
  },
  selectedOptionButton: {
    borderColor: '#3182CE',
    borderWidth: 2,
    backgroundColor: '#E6F0FF',
    borderRadius: 8,
  },
  responseCountText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
    marginTop: 4,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    gap: 8,
  },
});

export default React.memo(MyPageScreen);