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
  Modal,
  Pressable,
} from 'react-native';
import Animated, { FadeInLeft, FadeIn, useAnimatedStyle, useSharedValue, withSpring, withTiming, runOnJS, interpolate, Extrapolate, withSequence, withDelay, withRepeat } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getVoteById, selectVoteOption } from '../api/post';
import { toggleLike, toggleBookmark } from '../api/reaction';
import { VoteResponse } from '../types/Vote';
import { Ionicons } from '@expo/vector-icons';
import CommentScreen from './CommentScreen';
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { Feather } from '@expo/vector-icons';
import RegionStatistics from '../components/statistics/RegionStatistics';
import AgeStatistics from '../components/statistics/AgeStatistics';
import GenderStatistics from '../components/statistics/GenderStatistics';

import { SERVER_URL } from '../constant/config';
const IMAGE_BASE_URL = `${SERVER_URL}`;
const { width } = Dimensions.get('window');

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
    <Animated.View style={[styles.skeletonItem, animatedStyle]}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonProfile}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonUserInfo}>
            <View style={styles.skeletonUsername} />
            <View style={styles.skeletonDate} />
          </View>
        </View>
        <View style={styles.skeletonBadge} />
      </View>

      <View style={styles.skeletonTitle} />
      
      <View style={styles.skeletonMeta}>
        <View style={styles.skeletonCategory} />
        <View style={styles.skeletonTime} />
      </View>

      <View style={styles.skeletonContent} />

      <View style={styles.skeletonImage} />

      <View style={styles.skeletonOptions}>
        {[1, 2].map((_, index) => (
          <View key={index} style={styles.skeletonOption}>
            <View style={styles.skeletonOptionText} />
          </View>
        ))}
      </View>

      <View style={styles.skeletonReactions}>
        {[1, 2, 3, 4].map((_, index) => (
          <View key={index} style={styles.skeletonReaction} />
        ))}
      </View>
    </Animated.View>
  );
};

const SinglePageScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const voteId = route.params?.voteId;

  const [vote, setVote] = useState<VoteResponse | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const translateY = useSharedValue(0);
  const context = useSharedValue({ y: 0 });
  const [isVisible, setIsVisible] = useState(true);
  const MODAL_HEIGHT = Dimensions.get('window').height * 0.8;
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const likeScale = useSharedValue(1);
  const bookmarkScale = useSharedValue(1);
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);
  const [activeStatTab, setActiveStatTab] = useState<'region' | 'age' | 'gender'>('region');

  useEffect(() => {
    fetchVote();
  }, [voteId]);

  const fetchVote = async () => {
    try {
      const res = await getVoteById(voteId);
      setVote(res);
      if (res.selectedOptionId) {
        setSelectedOptionId(res.selectedOptionId);
      }
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
    if (isLiking) return;
    setIsLiking(true);
    likeScale.value = withSequence(
      withSpring(1.2),
      withSpring(1)
    );
    try {
      await toggleLike(voteId);
      await fetchVote();
    } catch (err) {
      Alert.alert('에러', '좋아요 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLiking(false);
    }
  };

  const handleToggleBookmark = async () => {
    if (isBookmarking) return;
    setIsBookmarking(true);
    bookmarkScale.value = withSequence(
      withSpring(1.2),
      withSpring(1)
    );
    try {
      await toggleBookmark(voteId);
      await fetchVote();
    } catch (err) {
      Alert.alert('에러', '북마크 처리 중 오류가 발생했습니다.');
    } finally {
      setIsBookmarking(false);
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

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value }
    })
    .onUpdate((event) => {
      translateY.value = event.translationY + context.value.y
    })
    .onEnd(() => {
      if (translateY.value > MODAL_HEIGHT * 0.3) {
        translateY.value = withSpring(MODAL_HEIGHT, {}, () => {
          runOnJS(setIsVisible)(false)
          runOnJS(() => {
            setShowCommentModal(false);
            fetchVote();
          })()
        })
      } else {
        translateY.value = withSpring(0)
      }
    })

  const rStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      borderTopLeftRadius: interpolate(
        translateY.value,
        [0, MODAL_HEIGHT],
        [20, 0],
        Extrapolate.CLAMP
      ),
      borderTopRightRadius: interpolate(
        translateY.value,
        [0, MODAL_HEIGHT],
        [20, 0],
        Extrapolate.CLAMP
      ),
    }
  })

  const likeAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: likeScale.value }]
    };
  });

  const bookmarkAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: bookmarkScale.value }]
    };
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <View style={styles.skeletonBackButton} />
          <View style={styles.skeletonHeaderTitle} />
          <View style={styles.skeletonShareButton} />
      </View>
        <ScrollView contentContainerStyle={styles.container}>
          <SkeletonLoader />
        </ScrollView>
      </SafeAreaView>
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

  const selectedOptionIdFromVote = vote.selectedOptionId ?? selectedOptions[vote.voteId];
  const closed = isVoteClosed(vote.finishTime);
  const hasVoted = !!selectedOptionIdFromVote;
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
            <TouchableOpacity 
              style={styles.userInfoLeft}
              onPress={() => navigation.navigate("UserPageScreen", { userId: vote.userId })}
              activeOpacity={0.7}
            >
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
            </TouchableOpacity>
            
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
            {!closed && (
              <Text style={styles.dateText}>{formatDate(vote.finishTime)}</Text>
            )}
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

          <View style={styles.optionsContainer}>
            {vote.voteOptions.map((opt, index) => {
              const isSelected = selectedOptionId === opt.id;
              const percentage = totalCount > 0 ? Math.round((opt.voteCount / totalCount) * 100) : 0;

              return (
                <Animated.View
                  key={opt.id}
                  entering={FadeInLeft.duration(300).delay(index * 100)}
                  style={styles.optionWrapper}
                >
                  {showGauge && (
                    <Animated.View
                      entering={FadeInLeft.duration(600)}
                      style={[
                        styles.gaugeBar,
                        {
                          width: `${percentage}%`,
                          backgroundColor: isSelected ? "#5E72E4" : "#E2E8F0",
                        },
                      ]}
                    />
                  )}
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      closed && styles.closedOptionButton,
                      isSelected && styles.selectedOptionButton,
                    ]}
                    onPress={() => handleVote(opt.id)}
                    disabled={closed}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionContent}>
                      <Text style={[
                        styles.optionButtonText,
                        isSelected && styles.selectedOptionText
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
                </Animated.View>
              );
            })}
            {showGauge && totalCount > 0 && <Text style={styles.responseCountText}>{totalCount}명 참여</Text>}
          </View>

          <View style={styles.divider} />

          <View style={styles.reactionRow}>
            <Animated.View style={likeAnimatedStyle}>
              <TouchableOpacity 
                style={styles.statItem}
                onPress={handleToggleLike}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="heart-outline" 
                  size={20} 
                  color={vote.isLiked ? "#F56565" : "#718096"} 
                />
                <Text style={[styles.statText, vote.isLiked && styles.likedText]}>
                  {vote.likeCount}
                </Text>
              </TouchableOpacity>
            </Animated.View>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => setShowCommentModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#718096" />
              <Text style={styles.statText}>{vote.commentCount}</Text>
            </TouchableOpacity>
            <Animated.View style={bookmarkAnimatedStyle}>
              <TouchableOpacity 
                style={styles.statItem}
                onPress={handleToggleBookmark}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="bookmark-outline" 
                  size={20} 
                  color={vote.isBookmarked ? "#1499D9" : "#718096"} 
                />
              </TouchableOpacity>
            </Animated.View>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => {
                const totalCount = vote?.voteOptions.reduce((sum, opt) => sum + opt.voteCount, 0) || 0;
                if (totalCount === 0) {
                  Alert.alert('알림', '투표 데이터가 없습니다.');
                  return;
                }
                setShowStatisticsModal(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="stats-chart" size={20} color="#718096" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      <Modal
        visible={showCommentModal}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => {
          fetchVote();
          setShowCommentModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <Pressable 
            style={styles.modalBackground}
            onPress={async () => {
              await fetchVote();
              setShowCommentModal(false);
            }}
          >
            <View style={styles.modalBackdrop} />
          </Pressable>
          <View style={styles.modalContainer}>
            <CommentScreen route={{ params: { voteId: voteId } }} />
          </View>
        </View>
      </Modal>

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
                <Ionicons name="close" size={24} color="#4A5568" />
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
              {activeStatTab === 'region' && <RegionStatistics voteId={voteId} />}
              {activeStatTab === 'age' && <AgeStatistics voteId={voteId} />}
              {activeStatTab === 'gender' && <GenderStatistics voteId={voteId} />}
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
    paddingBottom: 32,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
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
    fontSize: 15,
    color: '#2D3748',
    fontWeight: '600',
  },
  closedBadge: {
    backgroundColor: '#EDF2F7',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 12,
    lineHeight: 24,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    color: '#4A5568',
    lineHeight: 22,
    marginBottom: 16,
  },
  imageContainer: {
    marginBottom: 16,
  },
  imageWrapper: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: width * 0.6,
    borderRadius: 12,
  },
  optionsContainer: {
    marginBottom: 16,
  },
  optionWrapper: {
    position: "relative",
    marginVertical: 6,
  },
  gaugeBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 12,
    zIndex: -1,
  },
  optionButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 54,
  },
  closedOptionButton: {
    backgroundColor: "#F7FAFC",
    borderColor: "#E2E8F0",
  },
  selectedOptionButton: {
    borderColor: "#1499D9",
    borderWidth: 1.5,
  },
  optionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  optionButtonText: {
    fontSize: 15,
    color: "#2D3748",
    fontWeight: "500",
    flex: 1,
  },
  selectedOptionText: {
    color: "#1499D9",
    fontWeight: "600",
  },
  percentageText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4A5568",
    marginLeft: 8,
  },
  selectedPercentageText: {
    color: "#1499D9",
  },
  responseCountText: {
    marginTop: 8,
    fontSize: 13,
    color: "#718096",
    textAlign: "right",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  likedText: {
    color: '#F56565',
  },
  createdAtText: {
    fontSize: 13,
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
  skeletonItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  skeletonProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    marginRight: 12,
  },
  skeletonUserInfo: {
    gap: 4,
  },
  skeletonUsername: {
    width: 100,
    height: 16,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  skeletonDate: {
    width: 60,
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  skeletonBadge: {
    width: 60,
    height: 24,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
  },
  skeletonTitle: {
    width: '80%',
    height: 24,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonMeta: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  skeletonCategory: {
    width: 60,
    height: 24,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
  },
  skeletonTime: {
    width: 100,
    height: 20,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  skeletonContent: {
    width: '100%',
    height: 60,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 16,
  },
  skeletonImage: {
    width: '100%',
    height: width * 0.6,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 16,
  },
  skeletonOptions: {
    gap: 8,
    marginBottom: 16,
  },
  skeletonOption: {
    height: 54,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
  },
  skeletonOptionText: {
    width: '70%',
    height: 20,
    backgroundColor: '#F7FAFC',
    borderRadius: 4,
  },
  skeletonReactions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  skeletonReaction: {
    width: 24,
    height: 24,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
  },
  skeletonBackButton: {
    width: 32,
    height: 32,
    backgroundColor: '#E2E8F0',
    borderRadius: 16,
  },
  skeletonHeaderTitle: {
    width: 100,
    height: 24,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  skeletonShareButton: {
    width: 32,
    height: 32,
    backgroundColor: '#E2E8F0',
    borderRadius: 16,
  },
});

export default SinglePageScreen;