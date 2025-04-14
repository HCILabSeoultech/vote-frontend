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
} from 'react-native';
import Animated, { FadeInLeft, FadeIn } from 'react-native-reanimated';
import { getStoragePosts } from '../api/storage';
import { toggleLike, toggleBookmark } from '../api/reaction';
import { getVoteById, selectVoteOption } from '../api/post';
import { VoteResponse } from '../types/Vote';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

const STORAGE_TYPES = [
  { label: '투표한 글', value: 'voted' },
  { label: '좋아요한 글', value: 'liked' },
  { label: '북마크한 글', value: 'bookmarked' },
] as const;

type StorageType = typeof STORAGE_TYPES[number]['value'];
type NavigationProp = StackNavigationProp<RootStackParamList, 'CommentScreen'>;

import { SERVER_URL } from '../constant/config';
const IMAGE_BASE_URL = `${SERVER_URL}`;
const { width } = Dimensions.get('window');

const StorageScreen: React.FC = () => {
  const [storageType, setStorageType] = useState<StorageType>('voted');
  const [votes, setVotes] = useState<VoteResponse[]>([]);
  const [page, setPage] = useState(0);
  const [isLast, setIsLast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const navigation = useNavigation<NavigationProp>();
  const [tabRefreshTrigger, setTabRefreshTrigger] = useState(0);

  const handleTabChange = (value: StorageType) => {
    setStorageType(value);
    setTabRefreshTrigger(prev => prev + 1);
  };

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
  }, [storageType, tabRefreshTrigger]);

  const isVoteClosed = (finishTime: string) => new Date(finishTime).getTime() < new Date().getTime();

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 0 && diffDays <= 7) return `${diffDays}일 후 마감`;
    return date.toLocaleDateString();
  };

  const renderItem = ({ item, index }: { item: VoteResponse; index: number }) => {
    const closed = isVoteClosed(item.finishTime);
    const selectedOptionId = item.selectedOptionId ?? selectedOptions[item.voteId];
    const hasVoted = !!selectedOptionId;
    const showGauge = closed || hasVoted;
    const totalCount = item.voteOptions.reduce((sum, opt) => sum + opt.voteCount, 0);

    return (
      <Animated.View
        entering={FadeIn.duration(400).delay(index * 50)}
        style={[
          styles.voteItem,
          closed ? styles.closedVoteItem : styles.activeVoteItem,
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
              style={styles.profileImage}
            />
            <TouchableOpacity
              onPress={() => navigation.navigate('UserPageScreen', { userId: item.userId })}
              activeOpacity={0.7}
            >
              <Text style={styles.nickname}>{item.username}</Text>
            </TouchableOpacity>
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
          <View style={styles.optionContainer}>
            {item.voteOptions.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              const percentage = totalCount > 0 ? Math.round((opt.voteCount / totalCount) * 100) : 0;
              return (
                <View key={opt.id} style={styles.optionWrapper}>
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
                    ]}
                    onPress={() => handleVote(item.voteId, opt.id)}
                    disabled={closed || isSelected}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        isSelected && styles.selectedOptionText,
                      ]}
                    >
                      {opt.content}
                    </Text>
                    {showGauge && (
                      <Text
                        style={[
                          styles.percentageText,
                          isSelected && styles.selectedPercentageText,
                        ]}
                      >
                        {percentage}%
                      </Text>
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
            <Text style={styles.reactionIcon}>{item.isLiked ? '❤️' : '🤍'}</Text>
            <Text style={styles.reactionText}>{item.likeCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reactionItem}
            onPress={() => navigation.navigate('CommentScreen', { voteId: item.voteId })}
            activeOpacity={0.7}
          >
            <Text style={styles.reactionIcon}>💬</Text>
            <Text style={styles.reactionText}>{item.commentCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reactionItem}
            onPress={() => handleToggleBookmark(item.voteId)}
            activeOpacity={0.7}
          >
            <Text style={styles.reactionIcon}>{item.isBookmarked ? '🔖' : '📄'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.reactionItem} activeOpacity={0.7}>
            <Text style={styles.reactionIcon}>📊</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <View style={styles.tabRow}>
        {STORAGE_TYPES.map(({ label, value }) => (
          <TouchableOpacity
            key={value}
            style={[styles.tabButton, storageType === value && styles.activeTab]}
            onPress={() => handleTabChange(value)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.tabText, storageType === value && styles.activeTabText]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderEmptyList = () => {
    let message = '';
    switch (storageType) {
      case 'voted':
        message = '아직 투표한 글이 없습니다.';
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

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderTabs()}
      <FlatList
        data={votes}
        keyExtractor={(item) => item.voteId.toString()}
        renderItem={renderItem}
        onEndReached={() => loadPosts(page)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading
          ? () => (
              <View style={styles.footerLoading}>
                <ActivityIndicator size="small" color="#5E72E4" />
                <Text style={styles.loadingText}>불러오는 중...</Text>
              </View>
            )
          : null
        }
        ListEmptyComponent={!loading ? renderEmptyList : null}
        contentContainerStyle={[
          styles.container,
          votes.length === 0 && !loading && styles.emptyListContainer,
        ]}
        showsVerticalScrollIndicator={false}
      />
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
    flexGrow: 1,
  },
  tabContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  tabRow: {
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    paddingHorizontal: 16,
  },
  tabButton: {
    paddingVertical: 10, 
    paddingHorizontal: 20,
    borderRadius: 24, 
    backgroundColor: '#EDF2F7',
    minWidth: 100,
    alignItems: 'center',
  },
  activeTab: { 
    backgroundColor: '#5E72E4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: { 
    fontSize: 14, 
    color: '#4A5568',
    fontWeight: '600',
  },
  activeTabText: { 
    color: '#FFFFFF', 
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#718096',
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
  optionWrapper: { 
    position: 'relative', 
    marginVertical: 6,
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
    borderColor: '#5E72E4',
    borderWidth: 1.5,
  },
  optionButtonText: { 
    fontSize: 15, 
    color: '#2D3748',
    fontWeight: '500',
    flex: 1,
  },
  selectedOptionText: {
    color: '#5E72E4',
    fontWeight: '600',
  },
  percentageText: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#4A5568',
    marginLeft: 8,
  },
  selectedPercentageText: {
    color: '#5E72E4',
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
  },
  reactionItem: { 
    flexDirection: 'row', 
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  reactionIcon: { 
    fontSize: 20, 
    marginRight: 6,
  },
  reactionText: { 
    fontSize: 14, 
    color: '#4A5568',
    fontWeight: '500',
  },
  emptyListContainer: { 
    flex: 1, 
    backgroundColor: '#F7FAFC' 
  },
});

export default StorageScreen;