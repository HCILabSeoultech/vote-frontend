import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import Animated, { FadeInLeft, FadeIn } from 'react-native-reanimated';
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

import { SERVER_URL } from '../constant/config';

const IMAGE_BASE_URL = `${SERVER_URL}`;
const { width } = Dimensions.get('window');

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

  const isFocused = useIsFocused();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'CommentScreen'>>();
  const route = useRoute();
  const { userId } = route.params as { userId: number };

  useEffect(() => {
    if (isFocused) {
      setVotes([]);
      setPage(0);
      setIsLast(false);
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

  const fetchUserData = async (nextPage: number) => {
    if (loading || isLast) return;
    setLoading(true);
    try {
      const res = await getUserPage(userId, nextPage);
      if (nextPage === 0) setProfile(res);
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

  const isVoteClosed = (finishTime: string) => {
    const finish = new Date(finishTime)
    const now = new Date() //KST시스템

    return finish.getTime() < now.getTime()
  }

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

  const renderItem = ({ item, index }: { item: VoteResponse, index: number }) => {
    const closed = isVoteClosed(item.finishTime);
    const selectedOptionId = item.selectedOptionId ?? selectedOptions[item.voteId];
    const hasVoted = !!selectedOptionId;
    const showGauge = closed || hasVoted;
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
                      !closed && isSelected && styles.selectedOptionButton,
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

          <TouchableOpacity style={styles.reactionItem} activeOpacity={0.7}>
            <Feather name="bar-chart-2" size={20} color="#718096" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderHeader = () => {
    if (!profile) return (
      <View style={styles.loadingProfileContainer}>
        <ActivityIndicator size="large" color="#5E72E4" />
        <Text style={styles.loadingText}>프로필 불러오는 중...</Text>
      </View>
    );
    
    const isDefault = profile.profileImage === 'default.jpg';
  
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
          {currentUserId !== userId && (
            <TouchableOpacity
              onPress={handleFollowToggle}
              style={[
                styles.followButton,
                isFollowing ? styles.followingButton : styles.followButton
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

        {profile.introduction && (
          <Text style={styles.introduction}>{profile.introduction}</Text>
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
      </Animated.View>
    );
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

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
      <FlatList
        data={activeTab === 'posts' ? votes : []}
        keyExtractor={(item) => item.voteId.toString()}
        renderItem={activeTab === 'posts' ? renderItem : null}
        contentContainerStyle={styles.container}
        onEndReached={() => activeTab === 'posts' && fetchUserData(page)}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={
          loading && activeTab === 'posts' ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="small" color="#5E72E4" />
              <Text style={styles.loadingText}>게시물 불러오는 중...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading && activeTab === 'posts' ? renderEmptyPosts : (
            activeTab === 'followers' ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>아직 팔로워가 없습니다.</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>아직 팔로잉하는 사용자가 없습니다.</Text>
              </View>
            )
          )
        }
        showsVerticalScrollIndicator={false}
      />

      {showCommentModal && selectedVoteId && (
        <Modal
          visible={showCommentModal}
          transparent
          statusBarTranslucent
          animationType="slide"
          onRequestClose={() => {
            refreshVote(selectedVoteId);
            setShowCommentModal(false);
            setSelectedVoteId(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <Pressable 
              style={styles.modalBackground}
              onPress={async () => {
                await refreshVote(selectedVoteId);
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
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#718096',
    fontSize: 14,
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
  },
  followButton: {
    backgroundColor: '#3182CE',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
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
  gaugeBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 12,
    zIndex: -1,
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
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
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
    color: '#718096',
    marginTop: 2,
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
});

export default UserPageScreen;