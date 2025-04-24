import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
} from 'react-native';
import Animated, { FadeInLeft, FadeIn, useAnimatedStyle, withRepeat, withTiming, withSequence, useSharedValue } from 'react-native-reanimated';
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
import RegionStatistics from '../components/statistics/RegionStatistics';
import AgeStatistics from '../components/statistics/AgeStatistics';
import GenderStatistics from '../components/statistics/GenderStatistics';

import { SERVER_URL } from '../constant/config';

const IMAGE_BASE_URL = `${SERVER_URL}`;
const { width } = Dimensions.get('window');

const TABS = [
  { label: '게시물', value: 'posts' },
  { label: '팔로워', value: 'followers' },
  { label: '팔로잉', value: 'following' },
] as const;

type TabType = 'posts' | 'followers' | 'following';

// 스켈레톤 UI 컴포넌트
const SkeletonLoader = () => {
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
    <Animated.View style={[styles.skeletonContainer, animatedStyle]}>
      <View style={styles.skeletonProfile}>
        <View style={styles.skeletonProfileImage} />
        <View style={styles.skeletonProfileInfo}>
          <View style={styles.skeletonText} />
          <View style={styles.skeletonText} />
        </View>
      </View>
      <View style={styles.skeletonTabs}>
        <View style={styles.skeletonTab} />
        <View style={styles.skeletonTab} />
        <View style={styles.skeletonTab} />
      </View>
      {[1, 2, 3].map((_, index) => (
        <View key={index} style={styles.skeletonPost}>
          <View style={styles.skeletonPostHeader}>
            <View style={styles.skeletonAvatar} />
            <View style={styles.skeletonPostInfo}>
              <View style={styles.skeletonText} />
              <View style={styles.skeletonText} />
            </View>
          </View>
          <View style={styles.skeletonPostContent}>
            <View style={[styles.skeletonText, { width: '80%' }]} />
            <View style={[styles.skeletonText, { width: '60%' }]} />
          </View>
          <View style={styles.skeletonOptions}>
            <View style={styles.skeletonOption} />
            <View style={styles.skeletonOption} />
          </View>
          <View style={styles.skeletonReactions}>
            <View style={styles.skeletonReaction} />
            <View style={styles.skeletonReaction} />
            <View style={styles.skeletonReaction} />
            <View style={styles.skeletonReaction} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
};

const MyPageScreen: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<VoteResponse[]>([]);
  const [page, setPage] = useState(0);
  const [isLast, setIsLast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [commentModalVoteId, setCommentModalVoteId] = useState<number | null>(null);
  const [statisticsModalVoteId, setStatisticsModalVoteId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [activeStatTab, setActiveStatTab] = useState<'region' | 'age' | 'gender'>('region');
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const isFocused = useIsFocused();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'CommentScreen'>>();

  const fetchData = useCallback(async (nextPage: number) => {
    if (loading && nextPage !== 0) return;
    setLoading(true);
    try {
      const res = await getMyPage(nextPage);
      if (nextPage === 0) {
        setProfile(res);
        setPosts(res.posts.content);
        setHasLoaded(true);
      } else {
        setPosts(prev => [...prev, ...res.posts.content]);
      }
      setPage(res.posts.number + 1);
      setIsLast(res.posts.last);
    } catch (err) {
      Alert.alert('에러', '마이페이지 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    if (isFocused && !hasLoaded) {
      fetchData(0);
    }
  }, [isFocused, hasLoaded, fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    try {
      const res = await getMyPage(0);
      setProfile(res);
      setPosts(res.posts.content);
      setPage(1);
      setIsLast(res.posts.last);
    } catch (err) {
      Alert.alert('에러', '마이페이지 정보를 불러오지 못했습니다.');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

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
      await selectVoteOption(voteId, optionId);
      await refreshVote(voteId);
      setSelectedOptions(prev => ({ ...prev, [voteId]: optionId }));
    } catch (err) {
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

  const handleTabChange = useCallback((value: TabType) => {
    setActiveTab(value);
    if (value === 'posts') {
      setPosts([]);
      setPage(0);
      setIsLast(false);
      fetchData(0);
    }
  }, [fetchData]);

  const handleStatisticsPress = useCallback((voteId: number) => {
    const vote = posts.find(v => v.voteId === voteId);
    const totalCount = vote?.voteOptions.reduce((sum, opt) => sum + opt.voteCount, 0) || 0;
    if (totalCount === 0) {
      Alert.alert('알림', '투표 데이터가 없습니다.');
      return;
    }
    setStatisticsModalVoteId(voteId);
  }, [posts]);

  const renderPost = useCallback(({ item, index }: { item: VoteResponse, index: number }) => {
    const closed = isVoteClosed(item.finishTime);
    const selectedOptionId = item.selectedOptionId ?? selectedOptions[item.voteId];
    const hasVoted = !!selectedOptionId;
    const showGauge = closed || hasVoted;
    const totalCount = item.voteOptions.reduce((sum, opt) => sum + opt.voteCount, 0);
    const hasImageOptions = item.voteOptions.some(opt => opt.optionImage);

    const formatDate = (dateString: string) => {
      const finishDate = new Date(dateString)
      const now = new Date()
      const diffTime = finishDate.getTime() - now.getTime()
      const diffMinutes = Math.floor(diffTime / (1000 * 60))
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      if (diffTime > 0) {
        if (diffMinutes < 60) return `${diffMinutes}분 후 마감`;
        if (diffHours < 24) {
          const remainingMinutes = diffMinutes % 60;
          return `${diffHours}시간 ${remainingMinutes}분 후 마감`;
        }
        if (diffDays <= 7) {
          const remainingHours = diffHours % 24;
          return `${diffDays}일 ${remainingHours}시간 후 마감`;
        }
        return finishDate.toLocaleDateString("ko-KR");
      }
      return '';
    };

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
                  ? `${IMAGE_BASE_URL}/images/default.jpg`
                  : `${IMAGE_BASE_URL}${item.profileImage}`,
              }}
              style={styles.profileImageSmall}
            />
            <View>
              <Text style={styles.nickname}>{item.username}</Text>
              <Text style={styles.createdAtText}>{formatCreatedAt(item.createdAt)}</Text>
            </View>
          </View>

          <View style={styles.userInfoActions}>
            {closed && (
              <TouchableOpacity
                onPress={() => navigation.navigate('ReuploadVoteScreen', { voteId: item.voteId })}
                style={styles.reuploadButton}
                activeOpacity={0.7}
              >
                <Text style={styles.reuploadText}>재업로드</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() =>
                Alert.alert('삭제 확인', '정말 삭제하시겠습니까?', [
                  { text: '취소', style: 'cancel' },
                  {
                    text: '삭제',
                    style: 'destructive',
                    onPress: () => handleDeleteVote(item.voteId),
                  },
                ])
              }
              style={styles.deleteButton}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteText}>삭제</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.title}>{item.title}</Text>

        <View style={styles.metaContainer}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.categoryName}</Text>
          </View>
          <Text style={styles.dateText}>{formatDate(item.finishTime)}</Text>
          {closed && (
            <View style={styles.closedBadge}>
              <Text style={styles.closedBadgeText}>마감됨</Text>
            </View>
          )}
        </View>

        {item.content && (
          <Text numberOfLines={2} style={styles.content}>{item.content}</Text>
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
              const isSelected = selectedOptionId === opt.id;
              const percentage = totalCount > 0 ? Math.round((opt.voteCount / totalCount) * 100) : 0;

              return (
                <View key={opt.id} style={[styles.optionWrapper, opt.optionImage && styles.imageOptionWrapper]}>
                  {showGauge && (
                    <Animated.View
                      entering={FadeInLeft.duration(600)}
                      style={[
                        styles.gaugeBar,
                        {
                          width: `${percentage}%`,
                          backgroundColor: isSelected ? '#5E72E4' : '#E2E8F0',
                        },
                      ]}
                    />
                  )}
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      closed && styles.closedOptionButton,
                      isSelected && styles.selectedOptionButton,
                      opt.optionImage && styles.optionButtonWithImage,
                    ]}
                    onPress={() => handleVote(item.voteId, opt.id)}
                    disabled={closed || isSelected}
                    activeOpacity={0.7}
                  >
                    {opt.optionImage ? (
                      <View style={styles.optionContentWithImage}>
                        <Image
                          source={{ uri: `${IMAGE_BASE_URL}${opt.optionImage}` }}
                          style={styles.largeOptionImage}
                          resizeMode="cover"
                        />
                        <View style={styles.optionTextContainer}>
                          <Text style={[styles.optionButtonText, isSelected && styles.selectedOptionText]}>
                            {opt.content}
                          </Text>
                          {showGauge && (
                            <Text style={[styles.percentageText, isSelected && styles.selectedPercentageText]}>
                              {percentage}%
                            </Text>
                          )}
                        </View>
                      </View>
                    ) : (
                      <>
                        <Text style={[styles.optionButtonText, isSelected && styles.selectedOptionText]}>
                          {opt.content}
                        </Text>
                        {showGauge && (
                          <Text style={[styles.percentageText, isSelected && styles.selectedPercentageText]}>
                            {percentage}%
                          </Text>
                        )}
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              );
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
            <Feather name="bar-chart-2" size={20} color="#718096" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }, [isVoteClosed, selectedOptions, handleVote, handleToggleLike, handleToggleBookmark, handleDeleteVote, handleCommentPress, handleStatisticsPress, formatCreatedAt, navigation]);

  const renderProfile = useCallback(() => {
    if (!profile) return null;
    const isDefault = profile.profileImage === 'default.jpg';

    const handleLogout = async () => {
      try {
        await AsyncStorage.removeItem('token');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } catch (err) {
        Alert.alert('오류', '로그아웃 중 문제가 발생했습니다.');
      }
    };

    return (
      <Animated.View 
        entering={FadeIn.duration(500)}
        style={styles.profileContainer}
      >
        <View style={styles.profileHeader}>
          <View style={styles.profileMainInfo}>
            <Image
              source={{
                uri: isDefault
                  ? `${IMAGE_BASE_URL}/images/default.jpg`
                  : `${IMAGE_BASE_URL}${profile.profileImage}`,
              }}
              style={styles.profileImage}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.username}>{profile.username}</Text>
              <View style={styles.pointContainer}>
                <Text style={styles.pointLabel}>포인트</Text>
                <Text style={styles.pointValue}>{profile.point}</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => Alert.alert('알림', '프로필 수정 기능은 준비 중입니다.')}
              activeOpacity={0.7}
            >
              <Feather name="edit-2" size={16} color="#3182CE" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Feather name="log-out" size={16} color="#E53E3E" />
            </TouchableOpacity>
          </View>
        </View>

        {profile.introduction && (
          <Text style={styles.introduction}>{profile.introduction}</Text>
        )}

        <View style={styles.tabContainer}>
          <View style={styles.tabRow}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.value}
                style={[styles.tabButton, activeTab === tab.value && styles.activeTab]}
                onPress={() => handleTabChange(tab.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === tab.value && styles.activeTabText]}>
                  {tab.label} {tab.value === 'posts' ? `(${profile?.postCount || 0})` :
                             tab.value === 'followers' ? `(${profile?.followerCount || 0})` :
                             `(${profile?.followingCount || 0})`}
                </Text>
              </TouchableOpacity>
            ))}
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
      </Animated.View>
    );
  }, [profile, activeTab, handleTabChange, navigation]);

  const renderContent = () => {
    switch (activeTab) {
      case 'posts':
        return (loading || refreshing) ? (
          <SkeletonLoader />
        ) : (
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={(item) => item.voteId.toString()}
            onEndReached={() => fetchData(page)}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loading ? (
                <View style={styles.skeletonContainer}>
                  {[1, 2, 3].map((_, index) => (
                    <View key={index} style={styles.skeletonPost}>
                      <View style={styles.skeletonPostHeader}>
                        <View style={styles.skeletonAvatar} />
                        <View style={styles.skeletonPostInfo}>
                          <View style={styles.skeletonText} />
                          <View style={styles.skeletonText} />
                        </View>
                      </View>
                      <View style={styles.skeletonPostContent}>
                        <View style={[styles.skeletonText, { width: '80%' }]} />
                        <View style={[styles.skeletonText, { width: '60%' }]} />
                      </View>
                      <View style={styles.skeletonOptions}>
                        <View style={styles.skeletonOption} />
                        <View style={styles.skeletonOption} />
                      </View>
                      <View style={styles.skeletonReactions}>
                        <View style={styles.skeletonReaction} />
                        <View style={styles.skeletonReaction} />
                        <View style={styles.skeletonReaction} />
                        <View style={styles.skeletonReaction} />
                      </View>
                    </View>
                  ))}
                </View>
              ) : null
            }
            ListEmptyComponent={null}
            showsVerticalScrollIndicator={false}
          />
        );
      case 'followers':
        return (loading || refreshing) ? (
          <View style={styles.skeletonContainer}>
            <View style={styles.skeletonProfile}>
              <View style={styles.skeletonProfileImage} />
              <View style={styles.skeletonProfileInfo}>
                <View style={styles.skeletonText} />
                <View style={styles.skeletonText} />
              </View>
            </View>
            <View style={styles.skeletonTabs}>
              <View style={styles.skeletonTab} />
              <View style={styles.skeletonTab} />
              <View style={styles.skeletonTab} />
            </View>
            {[1, 2, 3].map((_, index) => (
              <View key={index} style={styles.skeletonFollower}>
                <View style={styles.skeletonFollowerHeader}>
                  <View style={styles.skeletonAvatar} />
                  <View style={styles.skeletonFollowerInfo}>
                    <View style={styles.skeletonText} />
                    <View style={styles.skeletonText} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null;
      case 'following':
        return (loading || refreshing) ? (
          <View style={styles.skeletonContainer}>
            <View style={styles.skeletonProfile}>
              <View style={styles.skeletonProfileImage} />
              <View style={styles.skeletonProfileInfo}>
                <View style={styles.skeletonText} />
                <View style={styles.skeletonText} />
              </View>
            </View>
            <View style={styles.skeletonTabs}>
              <View style={styles.skeletonTab} />
              <View style={styles.skeletonTab} />
              <View style={styles.skeletonTab} />
            </View>
            {[1, 2, 3].map((_, index) => (
              <View key={index} style={styles.skeletonFollower}>
                <View style={styles.skeletonFollowerHeader}>
                  <View style={styles.skeletonAvatar} />
                  <View style={styles.skeletonFollowerInfo}>
                    <View style={styles.skeletonText} />
                    <View style={styles.skeletonText} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null;
    }
  };

  const keyExtractor = useCallback((item: VoteResponse) => item.voteId.toString(), []);

  return (
    <SafeAreaView style={styles.safeArea}>
      {loading && !hasLoaded ? (
        <View style={styles.container}>
          <SkeletonLoader />
        </View>
      ) : (
        <FlatList
          ListHeaderComponent={renderProfile()}
          data={activeTab === 'posts' ? posts : []}
          renderItem={activeTab === 'posts' ? renderPost : null}
          keyExtractor={keyExtractor}
          onEndReached={() => activeTab === 'posts' && fetchData(page)}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={null}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1499D9"
              colors={["#1499D9"]}
              progressViewOffset={50}
            />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          windowSize={10}
          initialNumToRender={5}
          updateCellsBatchingPeriod={50}
        />
      )}

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#F7FAFC' 
  },
  container: {
    padding: 16,
    paddingBottom: 24,
  },
  loadingProfileContainer: {
    padding: 16,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    color: "#1499D9",
    fontSize: 14,
  },

  loaderContainer: {
    padding: 16,
    alignItems: "center",
  },
  

  profileContainer: { 
    marginBottom: 24,
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
  },
  profileInfo: {
    marginLeft: 20,
    flex: 1,
  },
  username: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#2D3748',
    marginBottom: 6,
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#718096',
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 16,
  },
  voteItem: {
    position: 'relative',
    marginBottom: 16,
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
  profileImageSmall: {
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
  userInfoActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reuploadButton: {
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  reuploadText: {
    fontSize: 13,
    color: '#3182CE',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  deleteText: {
    fontSize: 13,
    color: '#E53E3E',
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
    marginRight: 8,
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
    position: 'relative', 
    marginVertical: 6,
  },
  imageOptionWrapper: {
    width: '48%',
  },
  optionButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 54,
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
  },
  gaugeBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 12,
    zIndex: -1,
  },
  optionButtonText: { 
    fontSize: 15, 
    color: '#2D3748',
    fontWeight: '500',
    flex: 1,
  },
  selectedOptionText: {
    color: '#1499D9',
    fontWeight: '600',
  },
  percentageText: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#4A5568',
    marginLeft: 8,
  },
  selectedPercentageText: {
    color: '#1499D9',
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
  skeletonContainer: {
    padding: 16,
  },
  skeletonProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  skeletonProfileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E2E8F0',
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
    gap: 8,
    marginBottom: 16,
  },
  skeletonText: {
    height: 16,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  skeletonOptions: {
    gap: 8,
    marginBottom: 12,
  },
  skeletonOption: {
    height: 54,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
  },
  skeletonReactions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  skeletonReaction: {
    width: 24,
    height: 24,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
  },
  skeletonFollower: {
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
  skeletonFollowerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonFollowerInfo: {
    marginLeft: 12,
    flex: 1,
    gap: 4,
  },
});

export default React.memo(MyPageScreen);