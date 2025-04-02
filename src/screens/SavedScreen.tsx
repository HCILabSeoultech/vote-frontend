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
} from 'react-native';
import Animated, { FadeInLeft } from 'react-native-reanimated';
import { getStoragePosts } from '../api/storage';
import { toggleLike, toggleBookmark } from '../api/reaction';
import { selectVoteOption } from '../api/post';

import { VoteResponse } from '../types/Vote';

const STORAGE_TYPES = [
  { label: '투표한 글', value: 'voted' },
  { label: '좋아요한 글', value: 'liked' },
  { label: '북마크한 글', value: 'bookmarked' },
] as const;

type StorageType = typeof STORAGE_TYPES[number]['value'];

const IMAGE_BASE_URL = 'http://localhost:8080';

const StorageScreen: React.FC = () => {
  const [storageType, setStorageType] = useState<StorageType>('voted');
  const [votes, setVotes] = useState<VoteResponse[]>([]);
  const [page, setPage] = useState(0);
  const [isLast, setIsLast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});

  const loadPosts = async (nextPage = 0) => {
    if (loading || isLast) return;
    setLoading(true);
    try {
      const res = await getStoragePosts(storageType, nextPage);
      setVotes(prev => nextPage === 0 ? res.content : [...prev, ...res.content]);
      setPage(res.number + 1);
      setIsLast(res.last);
    } catch (err) {
      console.error(`${storageType} 불러오기 실패:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setVotes([]);
    setPage(0);
    setIsLast(false);
    loadPosts(0);
  }, [storageType]);

  const isVoteClosed = (finishTime: string) => new Date(finishTime).getTime() < new Date().getTime();

  const handleToggleLike = async (voteId: number) => {
    try {
      await toggleLike(voteId);
      setVotes(prev => prev.map(v => v.voteId === voteId ? {
        ...v,
        isLiked: !v.isLiked,
        likeCount: v.isLiked ? v.likeCount - 1 : v.likeCount + 1
      } : v));
    } catch (err) {
      Alert.alert('에러', '좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  const handleToggleBookmark = async (voteId: number) => {
    try {
      await toggleBookmark(voteId);
      setVotes(prev => prev.map(v => v.voteId === voteId ? {
        ...v,
        isBookmarked: !v.isBookmarked
      } : v));
    } catch (err) {
      Alert.alert('에러', '북마크 처리 중 오류가 발생했습니다.');
    }
  };

  const handleVote = async (voteId: number, optionId: number) => {
    try {
      await selectVoteOption(voteId, optionId);
      setVotes(prev => prev.map(v => {
        if (v.voteId !== voteId) return v;
        const updatedOptions = v.voteOptions.map(opt => {
          if (opt.id === optionId) return { ...opt, voteCount: opt.voteCount + 1 };
          if (opt.id === v.selectedOptionId) return { ...opt, voteCount: opt.voteCount - 1 };
          return opt;
        });
        return {
          ...v,
          voteOptions: updatedOptions,
          selectedOptionId: optionId,
        };
      }));
    } catch (err) {
      Alert.alert('에러', '투표 중 오류가 발생했습니다.');
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
        <Text style={styles.title}>{item.title} {closed && ' (마감)'}</Text>
        <Text style={styles.meta}>작성자: {item.username} | 카테고리: {item.categoryName}</Text>
        <Text style={styles.meta}>마감일: {new Date(item.finishTime).toLocaleDateString()}</Text>

        <Text numberOfLines={2} style={styles.content}>{item.content}</Text>

        {item.images.length > 0 && (
          <View style={styles.imageContainer}>
            {item.images.map((img) => (
              <Image
                key={img.id}
                source={{ uri: `${IMAGE_BASE_URL}${img.imageUrl}` }}
                style={styles.image}
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
                  style={[styles.optionButton, closed && { backgroundColor: '#eee', borderColor: '#ccc' }, !closed && isSelected && { borderColor: '#007bff', borderWidth: 2 }]}
                  onPress={() => handleVote(item.voteId, opt.id)}
                  disabled={closed || isSelected}
                >
                  <Text style={styles.optionButtonText}>{opt.content}</Text>
                  {showGauge && <Text style={styles.percentageText}>{percentage}%</Text>}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

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

  const renderTabs = () => (
    <View style={styles.tabRow}>
      {STORAGE_TYPES.map(({ label, value }) => (
        <TouchableOpacity
          key={value}
          style={[styles.tabButton, storageType === value && styles.activeTab]}
          onPress={() => setStorageType(value)}
        >
          <Text style={[styles.tabText, storageType === value && styles.activeTabText]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderTabs()}
      <FlatList
        data={votes}
        keyExtractor={(item) => item.voteId.toString()}
        renderItem={renderItem}
        onEndReached={() => loadPosts(page)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator /> : null}
        contentContainerStyle={styles.container}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 16 },
  tabRow: {
    flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10,
    backgroundColor: '#f5f5f5', borderBottomWidth: 1, borderColor: '#ddd'
  },
  tabButton: {
    paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 20, backgroundColor: '#eee'
  },
  activeTab: { backgroundColor: '#007bff' },
  tabText: { fontSize: 14, color: '#333' },
  activeTabText: { color: '#fff', fontWeight: 'bold' },
  voteItem: {
    marginBottom: 20, padding: 16,
    backgroundColor: '#f9f9f9', borderRadius: 12, elevation: 2,
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  meta: { fontSize: 12, color: '#888', marginTop: 2 },
  content: { fontSize: 14, marginVertical: 8 },
  imageContainer: { marginTop: 8 },
  image: { width: '100%', height: 200, borderRadius: 8, marginTop: 8 },
  optionContainer: { marginTop: 12 },
  optionWrapper: { position: 'relative', marginVertical: 6 },
  gaugeBar: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 10, zIndex: -1 },
  optionButton: {
    backgroundColor: '#ffffff', borderColor: '#888', borderWidth: 1, borderRadius: 10,
    paddingVertical: 14, paddingHorizontal: 16,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'
  },
  optionButtonText: { fontSize: 16, color: '#333' },
  percentageText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  reactionRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginTop: 16 },
  reactionItem: { flexDirection: 'row', alignItems: 'center' },
  reactionIcon: { fontSize: 20, marginRight: 4 },
  reactionText: { fontSize: 14, color: '#333' },
});

export default StorageScreen;