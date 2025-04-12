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
} from 'react-native';
import Animated, { FadeInLeft } from 'react-native-reanimated';
import { getVoteById, selectVoteOption } from '../api/post';
import { toggleLike, toggleBookmark } from '../api/reaction';
import { getUserPage } from '../api/user';
import { VoteResponse } from '../types/Vote';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkFollow, followUser, unfollowUser } from '../api/follow';

import { SERVER_URL } from '../constant/config';

const IMAGE_BASE_URL = `${SERVER_URL}`

const UserPageScreen: React.FC = () => {
  const [votes, setVotes] = useState<VoteResponse[]>([]);
  const [page, setPage] = useState(0);
  const [isLast, setIsLast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [profile, setProfile] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

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

  const isVoteClosed = (finishTime: string) => new Date(finishTime).getTime() < new Date().getTime();

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
        setIsFollowing(false);
      } else {
        await followUser(userId);
        setIsFollowing(true);
      }
    } catch (err) {
      Alert.alert('에러', '팔로우 처리 중 오류가 발생했습니다.');
    }
  };
  

  const renderItem = ({ item }: { item: VoteResponse }) => {
    const closed = isVoteClosed(item.finishTime);
    const selectedOptionId = item.selectedOptionId ?? selectedOptions[item.voteId];
    const hasVoted = !!selectedOptionId;
    const showGauge = closed || hasVoted;
    const totalCount = item.voteOptions.reduce((sum, opt) => sum + opt.voteCount, 0);

    return (
      <View style={[styles.voteItem, closed && { backgroundColor: '#ddd' }]}>        
        <View style={styles.userInfoRow}>
          <View style={styles.userInfoTextBox}>
            <Image
              source={{
                uri: item.profileImage === 'default.jpg'
                  ? `${IMAGE_BASE_URL}/images/default.jpg`
                  : `${IMAGE_BASE_URL}${item.profileImage}`,
              }}
              style={styles.profileImage}
            />
            <Text style={styles.nickname}>{item.username}</Text>
          </View>
        </View>

        <Text style={styles.title}>{item.title}{closed && ' (마감)'}</Text>
        <Text style={styles.meta}>카테고리: {item.categoryName}</Text>
        <Text style={styles.meta}>마감일: {new Date(item.finishTime).toLocaleDateString()}</Text>
        <Text numberOfLines={2} style={styles.content}>{item.content}</Text>

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

        <View style={styles.optionContainer}>
          {item.voteOptions.map((opt) => {
            const isSelected = selectedOptionId === opt.id;
            const percentage = totalCount > 0 ? Math.round((opt.voteCount / totalCount) * 100) : 0;

            return (
              <View key={opt.id} style={styles.optionWrapper}>
                {showGauge && (
                  <Animated.View
                    entering={FadeInLeft}
                    style={[styles.gaugeBar, {
                      width: `${percentage}%`,
                      backgroundColor: isSelected ? '#007bff' : '#d0e6ff',
                    }]}
                  />
                )}
                <TouchableOpacity
                  style={[styles.optionButton,
                    closed && { backgroundColor: '#eee', borderColor: '#ccc' },
                    !closed && isSelected && { borderColor: '#007bff', borderWidth: 2 },
                  ]}
                  onPress={() => handleVote(item.voteId, opt.id)}
                  disabled={closed || isSelected}
                >
                  <Text style={styles.optionButtonText}>{opt.content}</Text>
                  {showGauge && <Text style={styles.percentageText}>{percentage}%</Text>}
                </TouchableOpacity>
              </View>
            );
          })}
          {showGauge && totalCount > 0 && (
            <Text style={styles.responseCountText}>({totalCount}명 응답)</Text>
          )}
        </View>

        <View style={styles.reactionRow}>
          <TouchableOpacity style={styles.reactionItem} onPress={() => handleToggleLike(item.voteId)}>
            <Text style={styles.reactionIcon}>{item.isLiked ? '❤️' : '🤍'}</Text>
            <Text style={styles.reactionText}>{item.likeCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reactionItem}
            onPress={() => navigation.navigate('CommentScreen', { voteId: item.voteId })}
          >
            <Text style={styles.reactionIcon}>💬</Text>
            <Text style={styles.reactionText}>{item.commentCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.reactionItem} onPress={() => handleToggleBookmark(item.voteId)}>
            <Text style={styles.reactionIcon}>{item.isBookmarked ? '🔖' : '📄'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.reactionItem}>
            <Text style={styles.reactionIcon}>📊</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    if (!profile) return null;
    const isDefault = profile.profileImage === 'default.jpg';

    return (
      <View style={styles.profileContainer}>
        <View style={styles.userInfoRow}>
          <Image
            source={{
              uri: isDefault
                ? `${IMAGE_BASE_URL}/images/default.jpg`
                : `${IMAGE_BASE_URL}${profile.profileImage}`,
            }}
            style={styles.mainProfileImage}
          />
          <View style={styles.userInfoTextBox}>
            <Text style={styles.username}>{profile.username}</Text>
            <Text style={styles.point}>포인트: {profile.point}</Text>
          </View>
          {currentUserId !== userId && (
            <TouchableOpacity
            onPress={() => {
              handleFollowToggle();
            }}
              style={[styles.followButton, isFollowing && styles.followingButton]}
            >
              <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                {isFollowing ? '팔로우 취소' : '팔로우'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.introduction}>{profile.introduction}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={votes}
        keyExtractor={(item) => item.voteId.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.container}
        onEndReached={() => fetchUserData(page)}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={loading ? <ActivityIndicator size="small" /> : null}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 16 },
  profileContainer: { marginBottom: 20 },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ccc',
    marginRight: 1,
  },
  userInfoTextBox: {
    flex: 1,
    marginLeft: 3,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  point: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  introduction: {
    marginTop: 12,
    fontSize: 14,
    color: '#555',
  },
  followButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#007bff',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  followingButton: {
    backgroundColor: '#ddd',
  },
  followButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  followingButtonText: {
    color: '#333',
  },
  voteItem: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 4,
  },
  meta: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  content: {
    fontSize: 14,
    color: '#000',
    marginTop: 8,
  },
  imageContainer: { marginTop: 8 },
  image: { width: '100%', height: 200, borderRadius: 8, marginTop: 8 },
  optionContainer: { marginTop: 12 },
  optionWrapper: { position: 'relative', marginVertical: 6 },
  gaugeBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 10,
    zIndex: -1,
  },
  optionButton: {
    backgroundColor: '#fff',
    borderColor: '#888',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optionButtonText: { fontSize: 16, color: '#333' },
  percentageText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  responseCountText: {
    marginTop: 6,
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 16,
  },
  reactionItem: { flexDirection: 'row', alignItems: 'center' },
  reactionIcon: { fontSize: 20, marginRight: 4 },
  reactionText: { fontSize: 14, color: '#333' },
  profileImage: {
    width: 30,
    height: 30,
    borderRadius: 20,
    backgroundColor: '#ccc',
    marginRight: 8,
  },
  nickname: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});

export default UserPageScreen;
