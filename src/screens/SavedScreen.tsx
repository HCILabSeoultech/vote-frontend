import React, { useEffect, useState } from 'react';
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
import RegionStatistics from '../components/statistics/RegionStatistics';
import AgeStatistics from '../components/statistics/AgeStatistics';
import GenderStatistics from '../components/statistics/GenderStatistics';

const STORAGE_TYPES = [
  { label: '참여한 투표', value: 'voted', count: 0 },
  { label: '좋아요한 글', value: 'liked', count: 0 },
  { label: '북마크한 글', value: 'bookmarked', count: 0 },
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

  const handleTabChange = (value: StorageType) => {
    setStorageType(value);
  };

  const loadPosts = async (nextPage = 0) => {
    if (loading || isLast) return;
    
    setLoading(true);
    
    try {
      const res = await getStoragePosts(storageType, nextPage);
      
      if (res && res.content) {
        setVotes(prev => nextPage === 0 ? res.content : [...prev, ...res.content]);
        setPage(res.number + 1);
        setIsLast(res.last);
      }
    } catch (err) {
      console.error(`${storageType} 불러오기 실패:`, err);
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
        voted: votedRes.totalElements,
        liked: likedRes.totalElements,
        bookmarked: bookmarkedRes.totalElements
      });
    } catch (err) {
      console.error('개수 불러오기 실패:', err);
    }
  };

  // 화면이 포커스될 때마다 실행
  useFocusEffect(
    React.useCallback(() => {
      setVotes([]);
      setPage(0);
      setIsLast(false);
      setLoading(true);
      loadPosts(0);
      fetchAllCounts();
      
      return () => {
        // cleanup
      };
    }, [storageType])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    setVotes([]);
    setPage(0);
    setIsLast(false);
    await Promise.all([loadPosts(0), fetchAllCounts()]);
    setRefreshing(false);
  };

  const isVoteClosed = (finishTime: string) => {
    const finish = new Date(finishTime)
    const now = new Date() //KST시스템

    return finish.getTime() < now.getTime()
  }

  const refreshVote = async (voteId: number) => {
    try {
      const updated = await getVoteById(voteId);
      setVotes((prev) => prev.map((v) => (v.voteId === voteId ? updated : v)));
    } catch (err) {
      console.error('투표 새로고침 실패:', err);
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

  const handleVote = async (voteId: number, optionId: number) => {
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
  };

  const formatCreatedAt = (dateString: string) => {
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

  const renderItem = ({ item, index }: { item: VoteResponse; index: number }) => {
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
              style={styles.profileImage}
            />
            <View>
              <TouchableOpacity
                onPress={() => navigation.navigate('UserPageScreen', { userId: item.userId })}
                activeOpacity={0.7}
              >
                <Text style={styles.nickname}>{item.username}</Text>
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
                      entering={FadeIn.duration(600)}
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
            onPress={() => handleCommentPress(item.voteId)}
            activeOpacity={0.7}
          >
            <Feather name="message-circle" size={22} color="#718096" />
            <Text style={styles.reactionText}>{item.commentCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reactionItem}
            onPress={() => handleToggleBookmark(item.voteId)}
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
            onPress={() => handleStatisticsPress(item.voteId)}
            activeOpacity={0.7}
          >
            <Feather name="bar-chart-2" size={22} color="#718096" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, storageType === 'voted' && styles.activeTab]}
          onPress={() => handleTabChange('voted')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, storageType === 'voted' && styles.activeTabText]}>
            참여한 투표 ({counts.voted})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, storageType === 'liked' && styles.activeTab]}
          onPress={() => handleTabChange('liked')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, storageType === 'liked' && styles.activeTabText]}>
            좋아요한 글 ({counts.liked})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, storageType === 'bookmarked' && styles.activeTab]}
          onPress={() => handleTabChange('bookmarked')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, storageType === 'bookmarked' && styles.activeTabText]}>
            북마크한 글 ({counts.bookmarked})
          </Text>
        </TouchableOpacity>
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
  );

  const renderEmptyList = () => {
    let message = '';
    switch (storageType) {
      case 'voted':
        message = '아직 참여한 투표가 없습니다.';
        break;
      case 'liked':
        message = '아직 좋아요한 글이 없습니다.';
        break;
      case 'bookmarked':
        message = '아직 북마크한 글이 없습니다.';
        break;
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{message}</Text>
      </View>
    );
  };

  // 스켈레톤 UI 렌더링 함수
  const renderSkeletonList = () => {
    return Array(3).fill(0).map((_, index) => (
      <SkeletonLoader key={index} />
    ));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderTabs()}
      <FlatList
        data={votes}
        keyExtractor={(item) => item.voteId.toString()}
        renderItem={renderItem}
        onEndReached={() => loadPosts(page)}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#1499D9"]}
            tintColor="#1499D9"
            title="새로고침 중..."
            titleColor="#718096"
          />
        }
        ListFooterComponent={
          loading && votes.length > 0
          ? () => (
              <View style={styles.footerLoading}>
                <ActivityIndicator size="small" color="#1499D9" />
                <Text style={styles.loadingText}>불러오는 중...</Text>
              </View>
            )
          : null
        }
        ListEmptyComponent={
          loading 
          ? () => (
              <View style={styles.container}>
                {renderSkeletonList()}
              </View>
            )
          : renderEmptyList
        }
        contentContainerStyle={[
          styles.container,
          votes.length === 0 && !loading && styles.emptyListContainer,
        ]}
        showsVerticalScrollIndicator={false}
      />

      {showCommentModal && selectedVoteId && (
        <Modal
          visible={showCommentModal}
          transparent
          statusBarTranslucent
          animationType="slide"
          onRequestClose={() => {
            refreshVote(selectedVoteId!);
            setShowCommentModal(false);
            setSelectedVoteId(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <Pressable 
              style={styles.modalBackground}
              onPress={async () => {
                await refreshVote(selectedVoteId!);
                setShowCommentModal(false);
                setSelectedVoteId(null);
              }}
            >
              <View style={styles.modalBackdrop} />
            </Pressable>
            <View style={styles.modalContainer}>
              <CommentScreen
                route={{
                  params: {
                    voteId: selectedVoteId
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      <Modal
        visible={showStatisticsModal}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => {
          setShowStatisticsModal(false);
          setSelectedVoteForStats(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <Pressable 
            style={styles.modalBackground}
            onPress={() => {
              setShowStatisticsModal(false);
              setSelectedVoteForStats(null);
            }}
          >
            <View style={styles.modalBackdrop} />
          </Pressable>
          <View style={[styles.modalContainer, styles.statisticsModalContainer]}>
            <View style={styles.statisticsHeader}>
              <Text style={styles.statisticsTitle}>투표 통계</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowStatisticsModal(false);
                  setSelectedVoteForStats(null);
                }}
                style={styles.closeButton}
              >
                <Feather name="x" size={24} color="#4A5568" />
              </TouchableOpacity>
            </View>
            <View style={styles.statisticsTabContainer}>
              <TouchableOpacity
                style={[
                  styles.statisticsTabButton,
                  activeStatTab === 'region' && styles.activeStatisticsTab
                ]}
                onPress={() => setActiveStatTab('region')}
              >
                <Text style={[
                  styles.statisticsTabText,
                  activeStatTab === 'region' && styles.activeStatisticsTabText
                ]}>지역별</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statisticsTabButton,
                  activeStatTab === 'age' && styles.activeStatisticsTab
                ]}
                onPress={() => setActiveStatTab('age')}
              >
                <Text style={[
                  styles.statisticsTabText,
                  activeStatTab === 'age' && styles.activeStatisticsTabText
                ]}>연령별</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statisticsTabButton,
                  activeStatTab === 'gender' && styles.activeStatisticsTab
                ]}
                onPress={() => setActiveStatTab('gender')}
              >
                <Text style={[
                  styles.statisticsTabText,
                  activeStatTab === 'gender' && styles.activeStatisticsTabText
                ]}>성별</Text>
              </TouchableOpacity>
            </View>
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
    marginTop: 18,
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
    paddingVertical: 10,
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
});

export default StorageScreen;