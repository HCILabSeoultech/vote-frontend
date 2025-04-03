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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMainPageVotes, selectVoteOption } from '../api/post';
import { toggleLike, toggleBookmark } from '../api/reaction';

import { VoteResponse } from '../types/Vote';
import { useIsFocused } from '@react-navigation/native';

const IMAGE_BASE_URL = 'http://localhost:8080';

const SavedScreen: React.FC = () => {
  const [votes, setVotes] = useState<VoteResponse[]>([]);
  const [page, setPage] = useState(0);
  const [isLast, setIsLast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const isFocused = useIsFocused();

  const fetchVotes = async (nextPage: number) => {
    if (loading || isLast) return;
    setLoading(true);

    try {
      const res = await getMainPageVotes(nextPage);
      setVotes((prev) => [...prev, ...res.content]);
      setPage(res.number + 1);
      setIsLast(res.last);
    } catch (err) {
      console.error('투표 불러오기 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      setVotes([]);
      setPage(0);
      setIsLast(false);
      fetchVotes(0);
    }
  }, [isFocused]);

  const isVoteClosed = (finishTime: string) => {
    return new Date(finishTime).getTime() < new Date().getTime();
  };

  const handleVote = async (voteId: number, optionId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('인증 오류', '로그인이 필요합니다.');
        return;
      }

      await selectVoteOption(voteId, optionId);

      setVotes((prevVotes) =>
        prevVotes.map((vote) => {
          if (vote.voteId !== voteId) return vote;

          const isFirstVote = vote.selectedOptionId === undefined;

          const updatedOptions = vote.voteOptions.map((opt) => {
            if (opt.id === optionId) {
              return { ...opt, voteCount: opt.voteCount + 1 };
            }
            if (!isFirstVote && vote.selectedOptionId === opt.id) {
              return { ...opt, voteCount: opt.voteCount - 1 };
            }
            return opt;
          });

          return {
            ...vote,
            voteOptions: updatedOptions,
            selectedOptionId: optionId,
          };
        })
      );

      setSelectedOptions((prev) => ({
        ...prev,
        [voteId]: optionId,
      }));
    } catch (error) {
      console.error('투표 실패:', error);
      Alert.alert('에러', '투표 중 오류가 발생했습니다.');
    }
  };

  const handleToggleLike = async (voteId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('인증 오류', '로그인이 필요합니다.');
        return;
      }

      await toggleLike(voteId);

      setVotes((prevVotes) =>
        prevVotes.map((vote) => {
          if (vote.voteId !== voteId) return vote;
          return {
            ...vote,
            isLiked: !vote.isLiked,
          };
        })
      );
    } catch (err) {
      console.error('좋아요 실패:', err);
      Alert.alert('에러', '좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  const handleToggleBookmark = async (voteId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('인증 오류', '로그인이 필요합니다.');
        return;
      }

      await toggleBookmark(voteId);

      setVotes((prevVotes) =>
        prevVotes.map((vote) => {
          if (vote.voteId !== voteId) return vote;
          return {
            ...vote,
            isBookmarked: !vote.isBookmarked,
          };
        })
      );
    } catch (err) {
      console.error('북마크 실패:', err);
      Alert.alert('에러', '북마크 처리 중 오류가 발생했습니다.');
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
          {item.profileImage === 'default.jpg' ? (
            <Image
              source={{ uri: `${IMAGE_BASE_URL}/images/default.jpg` }}
              style={styles.profileImage}
            />
          ) : (
            <Image
              source={{ uri: `${IMAGE_BASE_URL}${item.profileImage}` }}
              style={styles.profileImage}
            />
          )}
          <Text style={styles.nickname}>{item.username}</Text>
        </View>
        <Text style={styles.title}>
          {item.title} {closed && ' (마감)'}
        </Text>

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

        {item.voteOptions.length > 0 && (
          <View style={styles.optionContainer}>
            {item.voteOptions.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              const percentage = totalCount > 0 ? Math.round((opt.voteCount / totalCount) * 100) : 0;

              return (
                <View key={opt.id} style={styles.optionWrapper}>
                  {showGauge && (
                    <Animated.View
                      entering={FadeInLeft}
                      style={[
                        styles.gaugeBar,
                        {
                          width: `${percentage}%`,
                          backgroundColor: isSelected ? '#007bff' : '#d0e6ff',
                        },
                      ]}
                    />
                  )}
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      closed && { backgroundColor: '#eee', borderColor: '#ccc' },
                      !closed && isSelected && { borderColor: '#007bff', borderWidth: 2 },
                    ]}
                    onPress={() => handleVote(item.voteId, opt.id)}
                    disabled={closed || isSelected}
                  >
                    <Text style={styles.optionButtonText}>{opt.content}</Text>
                    {showGauge && (
                      <Text style={styles.percentageText}>{percentage}%</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.reactionRow}>
          <TouchableOpacity style={styles.reactionItem} onPress={() => handleToggleLike(item.voteId)}>
            <Text style={styles.reactionIcon}>{item.isLiked ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.reactionItem}>
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={votes}
        keyExtractor={(item) => item.voteId.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.container}
        onEndReached={() => fetchVotes(page)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator size="small" /> : null}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 16 },
  voteItem: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    elevation: 2,
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  meta: { fontSize: 12, color: '#888' },
  content: { fontSize: 14, marginVertical: 8 },
  imageContainer: { marginTop: 8 },
  image: { width: '100%', height: 200, borderRadius: 8, marginTop: 8 },
  optionContainer: { marginTop: 12 },
  optionWrapper: {
    position: 'relative',
    marginVertical: 6,
  },
  gaugeBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 10,
    zIndex: -1,
  },
  optionButton: {
    backgroundColor: '#ffffff',
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
  percentageText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 16,
  },
  reactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionIcon: {
    fontSize: 20,
    marginRight: 4,
  },
  reactionText: {
    fontSize: 14,
    color: '#333',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  profileImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    backgroundColor: '#ccc',
  },
  nickname: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});

export default SavedScreen;
