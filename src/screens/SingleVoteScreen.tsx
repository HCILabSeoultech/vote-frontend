import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Animated, { FadeInLeft, FadeIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getVoteById, selectVoteOption } from '../api/post';
import { toggleLike, toggleBookmark } from '../api/reaction';
import { VoteResponse } from '../types/Vote';
import { Ionicons } from '@expo/vector-icons';

import { SERVER_URL } from '../constant/config';
const IMAGE_BASE_URL = `${SERVER_URL}`;
const { width } = Dimensions.get('window');

const SinglePageScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const voteId = route.params?.voteId;

  const [vote, setVote] = useState<VoteResponse | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVote();
  }, [voteId]);

  const fetchVote = async () => {
    setLoading(true);
    try {
      const res = await getVoteById(voteId);
      setVote(res);
    } catch (err) {
      Alert.alert('에러', '투표를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const isVoteClosed = (finishTime: string) => {
    const finish = new Date(finishTime)
    const now = new Date() //KST시스템

    return finish.getTime() < now.getTime()
  }

  const handleVote = async (optionId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return Alert.alert('인증 오류', '로그인이 필요합니다.');

      await selectVoteOption(voteId, optionId);
      await fetchVote();
      setSelectedOptions((prev) => ({ ...prev, [voteId]: optionId }));
    } catch (err) {
      Alert.alert('에러', '투표 중 오류가 발생했습니다.');
    }
  };

  const handleToggleLike = async () => {
    try {
      await toggleLike(voteId);
      await fetchVote();
    } catch (err) {
      Alert.alert('에러', '좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  const handleToggleBookmark = async () => {
    try {
      await toggleBookmark(voteId);
      await fetchVote();
    } catch (err) {
      Alert.alert('에러', '북마크 처리 중 오류가 발생했습니다.');
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

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#5E72E4" />
        <Text style={styles.loadingText}>투표 불러오는 중...</Text>
      </View>
    );
  }

  if (!vote) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#1499D9" />
        <Text style={styles.errorText}>투표를 불러올 수 없습니다.</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchVote}
          activeOpacity={0.7}
        >
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const selectedOptionId = vote.selectedOptionId ?? selectedOptions[vote.voteId];
  const closed = isVoteClosed(vote.finishTime);
  const hasVoted = !!selectedOptionId;
  const showGauge = closed || hasVoted;
  const totalCount = vote.voteOptions.reduce((sum, opt) => sum + opt.voteCount, 0);

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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#4A5568" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>투표 상세</Text>
        <TouchableOpacity 
          style={styles.shareButton}
          activeOpacity={0.7}
        >
          <Ionicons name="share-outline" size={24} color="#4A5568" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          entering={FadeIn.duration(300)}
          style={styles.contentCard}
        >
          <View style={styles.userInfoRow}>
            <View style={styles.userInfoLeft}>
              <Image
                source={{
                  uri: vote.profileImage === 'default.jpg'
                    ? `${IMAGE_BASE_URL}/images/default.jpg`
                    : `${IMAGE_BASE_URL}${vote.profileImage}`,
                }}
                style={styles.profileImage}
              />
              <View>
                <Text style={styles.nickname}>{vote.username}</Text>
                <Text style={styles.createdAtText}>{formatCreatedAt(vote.createdAt)}</Text>
              </View>
            </View>
            
            {closed && (
              <View style={styles.closedBadge}>
                <Text style={styles.closedBadgeText}>마감됨</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{vote.title}</Text>

          <View style={styles.metaContainer}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{vote.categoryName}</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(vote.finishTime)}</Text>
          </View>

          {vote.content && (
            <Text style={styles.content}>{vote.content}</Text>
          )}

          {vote.images.length > 0 && (
            <View style={styles.imageContainer}>
              {vote.images.map((img, index) => (
                <Animated.View 
                  key={img.id}
                  entering={FadeIn.duration(400).delay(index * 100)}
                  style={styles.imageWrapper}
                >
                  <Image
                    source={{ uri: `${IMAGE_BASE_URL}${img.imageUrl}` }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>

        <Animated.View 
          entering={FadeIn.duration(300).delay(200)}
          style={styles.optionsCard}
        >
          <Text style={styles.optionsTitle}>
            {closed ? '투표 결과' : hasVoted ? '내 투표 결과' : '투표하기'}
          </Text>
          
          <View style={[
            styles.optionContainer,
            vote.voteOptions.some(opt => opt.optionImage) && styles.imageOptionContainer
          ]}>
            {vote.voteOptions.map((opt, index) => {
              const isSelected = selectedOptionId === opt.id;
              const percentage = totalCount > 0 ? Math.round((opt.voteCount / totalCount) * 100) : 0;
              const hasImage = !!opt.optionImage;

              return (
                <Animated.View 
                  key={opt.id} 
                  entering={FadeIn.duration(300).delay(300 + index * 100)}
                  style={[
                    styles.optionWrapper,
                    hasImage && styles.imageOptionWrapper
                  ]}
                >
                  {showGauge && (
                    <Animated.View
                      entering={FadeInLeft.duration(600).delay(600 + index * 100)}
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
                      hasImage && styles.optionButtonWithImage,
                    ]}
                    onPress={() => handleVote(opt.id)}
                    disabled={closed || isSelected}
                    activeOpacity={0.7}
                  >
                    {hasImage ? (
                      <View style={styles.optionContentWithImage}>
                        <Image
                          source={{ uri: `${IMAGE_BASE_URL}${opt.optionImage}` }}
                          style={styles.largeOptionImage}
                          resizeMode="cover"
                        />
                        <View style={styles.optionTextContainer}>
                          <Text 
                            style={[
                              styles.optionButtonText,
                              isSelected && styles.selectedOptionText
                            ]}
                          >
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
                    ) : (
                      <>
                        <Text 
                          style={[
                            styles.optionButtonText,
                            isSelected && styles.selectedOptionText
                          ]}
                        >
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
                      </>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
          
          {showGauge && totalCount > 0 && (
            <Text style={styles.responseCountText}>{totalCount}명 참여</Text>
          )}
        </Animated.View>

        <Animated.View 
          entering={FadeIn.duration(300).delay(400)}
          style={styles.reactionCard}
        >
          <View style={styles.reactionRow}>
            <TouchableOpacity 
              style={styles.reactionItem} 
              onPress={handleToggleLike}
              activeOpacity={0.7}
            >
              <Text style={styles.reactionIcon}>{vote.isLiked ? '❤️' : '🤍'}</Text>
              <Text style={styles.reactionText}>{vote.likeCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reactionItem}
              onPress={() => navigation.navigate('CommentScreen', { voteId: vote.voteId })}
              activeOpacity={0.7}
            >
              <Text style={styles.reactionIcon}>💬</Text>
              <Text style={styles.reactionText}>{vote.commentCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.reactionItem} 
              onPress={handleToggleBookmark}
              activeOpacity={0.7}
            >
              <Text style={styles.reactionIcon}>{vote.isBookmarked ? '🔖' : '📄'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.reactionItem} activeOpacity={0.7}>
              <Text style={styles.reactionIcon}>📊</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#F7FAFC' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
  },
  backButton: {
    padding: 4,
  },
  shareButton: {
    padding: 4,
  },
  container: { 
    padding: 16, 
    paddingBottom: 100,
  },
  loaderContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
  },
  loadingText: {
    marginTop: 12,
    color: '#718096',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#4A5568',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#1499D9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  nickname: {
    fontSize: 16,
    color: '#1A202C',
    fontWeight: '600',
  },
  closedBadge: {
    backgroundColor: '#CBD5E0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  closedBadgeText: {
    color: '#4A5568',
    fontSize: 12,
    fontWeight: '500',
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 12,
    lineHeight: 30,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 10,
  },
  categoryText: {
    color: '#3182CE',
    fontSize: 13,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '500',
  },
  content: { 
    fontSize: 16, 
    color: '#4A5568',
    lineHeight: 24,
    marginBottom: 16,
  },
  imageContainer: { 
    marginTop: 8,
  },
  imageWrapper: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  image: { 
    width: '100%', 
    height: width * 0.6, 
    borderRadius: 12,
  },
  optionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 16,
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
    marginVertical: 8,
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
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 60,
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
  optionButtonText: {
    fontSize: 16,
    color: '#2D3748',
    fontWeight: '500',
    flex: 1,
  },
  selectedOptionText: {
    color: '#1499D9',
    fontWeight: '600',
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
    marginLeft: 8,
  },
  selectedPercentageText: {
    color: '#1499D9',
  },
  responseCountText: {
    marginTop: 12,
    fontSize: 14,
    color: '#718096',
    textAlign: 'right',
    fontWeight: '500',
  },
  reactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  reactionItem: { 
    flexDirection: 'row', 
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  reactionIcon: { 
    fontSize: 22, 
    marginRight: 8,
  },
  reactionText: { 
    fontSize: 15, 
    color: '#4A5568',
    fontWeight: '500',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5,
  },
  createdAtText: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
});

export default SinglePageScreen;