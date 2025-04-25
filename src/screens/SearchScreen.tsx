"use client"

import React, { useEffect, useState, useCallback, useMemo } from "react"
import { Ionicons, Feather } from "@expo/vector-icons"
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Dimensions,
  ScrollView,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from "react-native"
import Animated, { FadeInLeft, FadeIn, useAnimatedStyle, withRepeat, withSequence, withTiming, useSharedValue } from "react-native-reanimated"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { getTopLikedVotes, getVoteById, selectVoteOption, getVotesByCategory } from "../api/post"
import { toggleLike, toggleBookmark } from "../api/reaction"
import { searchUsers, searchVotes } from "../api/search"
import type { VoteResponse, SearchVoteResponse, VoteOption } from "../types/Vote"
import type { UserDocument } from "../types/UserData"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import type { StackNavigationProp } from "@react-navigation/stack"
import type { RootStackParamList } from "../navigation/AppNavigator"
import MainLogo from '../../assets/mainlogo.svg'
import DefaultVoteImage from '../components/DefaultVoteImage'

import { SERVER_URL } from "../constant/config"

const IMAGE_BASE_URL = `${SERVER_URL}`
const { width } = Dimensions.get("window")

const categories = [
  { id: 0, name: "전체" },
  { id: 1, name: "운동" },
  { id: 2, name: "음식" },
  { id: 3, name: "패션" },
  { id: 4, name: "여행" },
  { id: 5, name: "정치" },
  { id: 6, name: "기술" },
]

const sortOptions = [
  { id: 'likes' as const, name: '좋아요순' },
  { id: 'comments' as const, name: '댓글순' },
  { id: 'participants' as const, name: '참여자순' },
];

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
      <View style={styles.simpleVoteContent}>
        <View style={styles.skeletonImage} />
        <View style={styles.simpleVoteInfo}>
          <View style={styles.voteHeader}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonCategory} />
          </View>
          <View style={styles.authorInfo}>
            <View style={styles.skeletonAuthor} />
            <View style={styles.skeletonDot} />
            <View style={styles.skeletonDate} />
          </View>
          <View style={styles.simpleMetaRow}>
            <View style={styles.skeletonTime} />
            <View style={styles.statsContainer}>
              <View style={styles.skeletonStat} />
              <View style={styles.skeletonStat} />
              <View style={styles.skeletonStat} />
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  )
}

const SkeletonUserLoader = () => {
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
      <View style={styles.userItem}>
        <View style={styles.skeletonUserImage} />
        <View style={styles.skeletonUserName} />
        <View style={styles.skeletonChevron} />
      </View>
    </Animated.View>
  )
}

const SearchScreen: React.FC = () => {
  const [votes, setVotes] = useState<VoteResponse[]>([])
  const [userResults, setUserResults] = useState<UserDocument[]>([])
  const [searchResults, setSearchResults] = useState<SearchVoteResponse[]>([])
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({})
  const [searchKeyword, setSearchKeyword] = useState("")
  const [searchType, setSearchType] = useState<"vote" | "user">("vote")
  const [voteStatus, setVoteStatus] = useState<"ongoing" | "closed" | "all">("all")
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<number>(0)
  const [sortOption, setSortOption] = useState<'likes' | 'comments' | 'participants'>('likes')
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const navigation = useNavigation<StackNavigationProp<RootStackParamList, "CommentScreen">>()

  const fetchVotes = useCallback(async () => {
    try {
      const res = await getTopLikedVotes(30)
      setVotes(res)
      setHasLoaded(true)
    } catch (err) {
      console.error("인기 투표 불러오기 실패:", err)
    }
  }, [])

  const fetchCategoryVotes = useCallback(async (categoryId: number) => {
    try {
      const res = await getVotesByCategory(categoryId, 0, 30)
      if (res && res.content) {
        setVotes(res.content)
      }
    } catch (error) {
      console.error("카테고리별 인기글 불러오기 실패:", error)
    }
  }, [])

  const resetScreen = useCallback(() => {
    setSearchKeyword("")
    setUserResults([])
    setSearchResults([])
    setVoteStatus("all")
    setSelectedCategory(0)
    setSortOption('likes')
    setSearchType("vote")
    if (!hasLoaded) {
      fetchVotes()
    }
  }, [hasLoaded, fetchVotes])

  useEffect(() => {
    if (!hasLoaded) {
    fetchVotes()
    }
  }, [hasLoaded, fetchVotes])

  useEffect(() => {
    if (searchKeyword.trim() === "") {
      if (selectedCategory === 0) {
        if (!hasLoaded) {
        fetchVotes()
        }
      } else {
        fetchCategoryVotes(selectedCategory)
      }
    }
  }, [selectedCategory, hasLoaded, searchKeyword, fetchVotes, fetchCategoryVotes])

  const refreshVote = useCallback(async (voteId: number) => {
    try {
      const updated = await getVoteById(voteId)
      setVotes((prev) => prev.map((vote) => (vote.voteId === voteId ? updated : vote)))
    } catch (err) {
      console.error("투표 새로고침 실패:", err)
    }
  }, [])

  const handleVote = useCallback(async (voteId: number, optionId: number) => {
    try {
      const token = await AsyncStorage.getItem("token")
      if (!token) return Alert.alert("인증 오류", "로그인이 필요합니다.")

      await selectVoteOption(voteId, optionId)
      await refreshVote(voteId)
      setSelectedOptions((prev) => ({ ...prev, [voteId]: optionId }))
    } catch (error) {
      console.error("투표 실패:", error)
    }
  }, [refreshVote])

  const handleToggleLike = useCallback(async (voteId: number) => {
    try {
      await toggleLike(voteId)
      await refreshVote(voteId)
    } catch (err) {
      console.error("좋아요 실패:", err)
    }
  }, [refreshVote])

  const handleToggleBookmark = useCallback(async (voteId: number) => {
    try {
      await toggleBookmark(voteId)
      await refreshVote(voteId)
    } catch (err) {
      console.error("북마크 실패:", err)
    }
  }, [refreshVote])

  const handleSearch = useCallback(async (text: string) => {
    setSearchKeyword(text)
    if (text.trim() === "") {
      setUserResults([])
      setSearchResults([])
      return
    }

    setLoading(true)
    try {
      if (searchType === "vote") {
        const res = await searchVotes(text)
        setSearchResults(res)
      } else {
        const users = await searchUsers(text)
        setUserResults(users)
      }
    } catch (err) {
      console.error("검색 실패:", err)
      Alert.alert("검색 오류", "검색 중 문제가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }, [searchType])

  const handleCategorySelect = useCallback(async (categoryId: number) => {
    setLoading(true)
    setSelectedCategory(categoryId)
    try {
      if (categoryId === 0) {
        await fetchVotes()
      } else {
        await fetchCategoryVotes(categoryId)
      }
    } catch (error) {
      console.error("카테고리 변경 실패:", error)
    } finally {
      setLoading(false)
    }
  }, [fetchVotes, fetchCategoryVotes])

  const handleSortOptionSelect = useCallback(async (option: 'likes' | 'comments' | 'participants') => {
    setLoading(true)
    setSortOption(option)
    try {
      if (selectedCategory === 0) {
        await fetchVotes()
      } else {
        await fetchCategoryVotes(selectedCategory)
      }
    } catch (error) {
      console.error("정렬 옵션 변경 실패:", error)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, fetchVotes, fetchCategoryVotes])

  const handleVoteStatusChange = useCallback(async (newStatus: "ongoing" | "closed" | "all") => {
    setLoading(true)
    setVoteStatus(newStatus)
    try {
      if (selectedCategory === 0) {
        await fetchVotes()
      } else {
        await fetchCategoryVotes(selectedCategory)
      }
    } catch (error) {
      console.error("투표 상태 변경 실패:", error)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, fetchVotes, fetchCategoryVotes])

  const isVoteClosed = useCallback((finishTime: string) => {
    const finish = new Date(finishTime)
    const now = new Date() //KST시스템

    return finish.getTime() < now.getTime()
  }, [])

  const formatCreatedAt = useCallback((dateString: string) => {
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
  }, [])

  const formatDate = useCallback((dateString: string) => {
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
  }, [])

  const getFilteredVotes = useMemo(() => {
    if (voteStatus === "all") return votes;
    return votes.filter(vote => {
      const closed = isVoteClosed(vote.finishTime);
      return voteStatus === "closed" ? closed : !closed;
    });
  }, [votes, voteStatus, isVoteClosed]);

  const getSortedVotes = useMemo(() => {
    return [...getFilteredVotes].sort((a, b) => {
      switch (sortOption) {
        case 'likes':
          return b.likeCount - a.likeCount;
        case 'comments':
          return b.commentCount - a.commentCount;
        case 'participants':
          const aParticipants = a.voteOptions.reduce((sum, opt) => sum + opt.voteCount, 0);
          const bParticipants = b.voteOptions.reduce((sum, opt) => sum + opt.voteCount, 0);
          return bParticipants - aParticipants;
        default:
          return 0;
      }
    });
  }, [getFilteredVotes, sortOption]);

  const getSelectedCategoryName = useMemo(() => {
    const category = categories.find(c => c.id === selectedCategory);
    return category ? category.name : '전체';
  }, [selectedCategory]);

  const getSelectedSortName = useMemo(() => {
    const option = sortOptions.find(o => o.id === sortOption);
    return option ? option.name : '좋아요순';
  }, [sortOption]);

  const renderSearchResultItem = useCallback(({ item, index }: { item: SearchVoteResponse; index: number }) => {
    return (
      <Animated.View 
        entering={FadeIn.duration(300).delay(index * 50)}
        style={styles.itemShadow}
      >
        <TouchableOpacity
          style={styles.simpleVoteItem}
          onPress={() => navigation.navigate("SingleVoteScreen", { voteId: item.id })}
          activeOpacity={0.7}
        >
          <View style={styles.simpleVoteContent}>
            <View style={styles.simpleVoteInfo}>
              <View style={styles.voteHeader}>
                <Text style={styles.simpleTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{item.category}</Text>
                </View>
              </View>
              <View style={styles.authorInfo}>
                <Text style={styles.authorName}>{item.username}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [navigation]);

  const renderVoteItem = useCallback(({ item }: { item: VoteResponse }) => {
    return (
      <Animated.View 
        entering={FadeIn.duration(300).delay(0)}
        style={styles.itemShadow}
      >
        <TouchableOpacity
          style={styles.simpleVoteItem}
          onPress={() => navigation.navigate("SingleVoteScreen", { voteId: item.voteId })}
          activeOpacity={0.7}
        >
          <View style={styles.simpleVoteContent}>
            {item.images && item.images.length > 0 ? (
              <Image
                source={{ uri: `${IMAGE_BASE_URL}${item.images[0].imageUrl}` }}
                style={styles.simpleVoteImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.defaultImageContainer}>
                <MainLogo width={60} height={60} />
              </View>
            )}
            <View style={styles.simpleVoteInfo}>
              <View style={styles.voteHeader}>
                <Text style={styles.simpleTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{item.categoryName}</Text>
                </View>
              </View>
              <View style={styles.authorInfo}>
                <Text style={styles.authorName}>{item.username}</Text>
                <Text style={styles.dotSeparator}>•</Text>
                <Text style={styles.createdAt}>{formatCreatedAt(item.createdAt)}</Text>
              </View>
              <View style={styles.simpleMetaRow}>
                {isVoteClosed(item.finishTime) ? (
                  <View style={styles.closedBadge}>
                    <Text style={styles.closedBadgeText}>마감됨</Text>
                  </View>
                ) : (
                  <Text style={styles.remainingTimeText}>
                    {formatDate(item.finishTime)}
                  </Text>
                )}
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Feather name="users" size={14} color="#718096" />
                    <Text style={styles.statText}>
                      {item.voteOptions?.reduce((sum: number, opt: VoteOption) => sum + (opt.voteCount || 0), 0) || 0}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Feather name="heart" size={14} color={item.isLiked ? "#F56565" : "#718096"} />
                    <Text style={[styles.statText, item.isLiked && styles.likedText]}>
                      {item.likeCount}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Feather name="message-circle" size={14} color="#718096" />
                    <Text style={styles.statText}>
                      {item.commentCount}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [navigation, formatCreatedAt, formatDate, isVoteClosed]);

  const renderUserItem = useCallback(({ item }: { item: UserDocument }) => {
    return (
      <Animated.View 
        entering={FadeIn.duration(300).delay(0)}
        style={styles.itemShadow}
      >
        <TouchableOpacity
          style={styles.userItem}
          onPress={() => navigation.navigate("UserPageScreen", { userId: item.id })}
          activeOpacity={0.7}
        >
          <Image
            source={{
              uri:
                item.profileImage === "default.jpg"
                  ? `${IMAGE_BASE_URL}/images/default.jpg`
                  : `${IMAGE_BASE_URL}${item.profileImage}`,
            }}
            style={styles.userProfileImage}
          />
          <Text style={styles.userName}>{item.username}</Text>
          <Feather name="chevron-right" size={20} color="#A0AEC0" />
        </TouchableOpacity>
      </Animated.View>
    );
  }, [navigation]);

  const renderEmptyResults = useCallback(() => {
    if (loading) return null

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {searchType === "vote" ? "검색 결과가 없습니다." : "일치하는 사용자가 없습니다."}
        </Text>
        <Text style={styles.emptySubText}>다른 검색어를 입력해보세요.</Text>
      </View>
    )
  }, [loading, searchType])

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    try {
      if (searchKeyword.trim() === "") {
        if (selectedCategory === 0) {
          await fetchVotes();
        } else {
          await fetchCategoryVotes(selectedCategory);
        }
      } else {
        if (searchType === "vote") {
          const res = await searchVotes(searchKeyword);
          setSearchResults(res);
        } else {
          const users = await searchUsers(searchKeyword);
          setUserResults(users);
        }
      }
    } catch (error) {
      console.error("새로고침 실패:", error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [searchKeyword, selectedCategory, searchType, fetchVotes, fetchCategoryVotes]);

  const keyExtractor = useCallback((item: VoteResponse | SearchVoteResponse | UserDocument) => {
    if ('voteId' in item) return item.voteId.toString();
    return item.id.toString();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.searchContainer}>
        <View style={styles.tabContainer}>
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabButton, searchType === "vote" && styles.activeTab]}
              onPress={() => setSearchType("vote")}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, searchType === "vote" && styles.activeTabText]}>
                투표
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, searchType === "user" && styles.activeTab]}
              onPress={() => setSearchType("user")}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, searchType === "user" && styles.activeTabText]}>
                유저
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tabIndicator}>
            <Animated.View 
              style={[
                styles.tabIndicatorBar,
                { 
                  left: searchType === "vote" ? "0%" : "50%",
                  width: "50%"
                }
              ]} 
            />
          </View>
        </View>

        <View style={styles.searchBarContainer}>
          <View style={styles.inputContainer}>
            <Ionicons name="search" size={20} color="#718096" style={styles.searchIcon} />
            <TextInput
              placeholder={searchType === "vote" ? "제목, 작성자, 카테고리로 검색..." : "사용자 검색..."}
              style={styles.searchInput}
              value={searchKeyword}
              onChangeText={handleSearch}
              placeholderTextColor="#A0AEC0"
              returnKeyType="search"
            />
            {searchKeyword.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch("")} style={styles.clearButton} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={18} color="#CBD5E0" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {searchType === "vote" && searchKeyword.trim() === "" && (
          <View style={styles.filterContainer}>
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowCategoryModal(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownButtonText}>{getSelectedCategoryName}</Text>
                <Feather name="chevron-down" size={16} color="#4A5568" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowSortModal(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownButtonText}>{getSelectedSortName}</Text>
                <Feather name="chevron-down" size={16} color="#4A5568" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.ongoingButton, voteStatus === "ongoing" && styles.activeFilterButton]}
              onPress={() => handleVoteStatusChange(voteStatus === "ongoing" ? "all" : "ongoing")}
              activeOpacity={0.7}
            >
              <Feather 
                name={voteStatus === "ongoing" ? "check-square" : "square"} 
                size={18} 
                color={voteStatus === "ongoing" ? "#1499D9" : "#718096"} 
              />
              <Text style={[styles.ongoingButtonText, voteStatus === "ongoing" && styles.activeFilterButtonText]}>
                진행중인 투표만 보기
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>카테고리 선택</Text>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.modalOption}
                onPress={() => {
                  handleCategorySelect(category.id);
                  setShowCategoryModal(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  selectedCategory === category.id && styles.modalOptionSelectedText
                ]}>
                  {category.name}
                </Text>
                {selectedCategory === category.id && (
                  <Feather name="check" size={18} color="#1499D9" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showSortModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>정렬</Text>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.modalOption}
                onPress={() => {
                  handleSortOptionSelect(option.id);
                  setShowSortModal(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  sortOption === option.id && styles.modalOptionSelectedText
                ]}>
                  {option.name}
                </Text>
                {sortOption === option.id && (
                  <Feather name="check" size={18} color="#1499D9" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {loading ? (
        <FlatList
          data={Array(5).fill({})}
          keyExtractor={(_, index) => `skeleton-${index}`}
          renderItem={() => searchType === "user" ? <SkeletonUserLoader /> : <SkeletonLoader />}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          windowSize={10}
          initialNumToRender={5}
          updateCellsBatchingPeriod={50}
          refreshing={refreshing}
          onRefresh={onRefresh}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1499D9" colors={["#1499D9"]}/>}
        />
      ) : searchType === "user" ? (
        <FlatList
          data={userResults}
          keyExtractor={keyExtractor}
          renderItem={renderUserItem}
          contentContainerStyle={[styles.container, userResults.length === 0 && styles.emptyListContainer]}
          ListEmptyComponent={renderEmptyResults}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          windowSize={10}
          initialNumToRender={5}
          updateCellsBatchingPeriod={50}
          refreshing={refreshing}
          onRefresh={onRefresh}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1499D9" colors={["#1499D9"]}/>}
        />
      ) : searchKeyword.trim() !== "" ? (
        <FlatList
          data={searchResults}
          keyExtractor={keyExtractor}
          renderItem={renderSearchResultItem}
          contentContainerStyle={[styles.container, searchResults.length === 0 && styles.emptyListContainer]}
          ListEmptyComponent={renderEmptyResults}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          windowSize={10}
          initialNumToRender={5}
          updateCellsBatchingPeriod={50}
          refreshing={refreshing}
          onRefresh={onRefresh}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1499D9" colors={["#1499D9"]}/>}
        />
      ) : (
        <FlatList
          data={getSortedVotes}
          keyExtractor={keyExtractor}
          renderItem={renderVoteItem}
          contentContainerStyle={[styles.container, votes.length === 0 && styles.emptyListContainer]}
          ListEmptyComponent={renderEmptyResults}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          windowSize={10}
          initialNumToRender={5}
          updateCellsBatchingPeriod={50}
          refreshing={refreshing}
          onRefresh={onRefresh}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1499D9" colors={["#1499D9"]}/>}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7FAFC",
  },
  searchContainer: {
    backgroundColor: "#FFFFFF",
    paddingTop: 4,
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 16,
  },
  tabContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 2,
    paddingBottom: 0,
    borderRadius: 16,
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
  searchBarContainer: {
    marginHorizontal: 16,
    marginBottom: 0,
    marginTop: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDF2F7",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#2D3748",
    paddingVertical: 12,
    height: 46,
  },
  clearButton: {
    padding: 6,
  },
  contentHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  popularTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2D3748",
    marginBottom: 12,
  },
  categoryContainer: {
    marginTop: 0,
    marginBottom: -5,
    paddingHorizontal: 16,
  },
  categoryScrollContainer: {
    paddingVertical: 4,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#EDF2F7',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    height: 32,
  },
  selectedCategoryButton: {
    backgroundColor: '#1499D9',
    borderColor: '#1499D9',
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4A5568',
    lineHeight: 16,
  },
  selectedCategoryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  container: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#718096",
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4A5568",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#718096",
  },
  voteItem: {
    position: "relative",
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  activeVoteItem: {
    backgroundColor: "#FFFFFF",
  },
  closedVoteItem: {
    backgroundColor: "#F9FAFB",
  },
  userInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: "#E2E8F0",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  nickname: {
    fontSize: 15,
    color: "#1A202C",
    fontWeight: "600",
  },
  closedBadge: {
    backgroundColor: "#EDF2F7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  closedBadgeText: {
    color: "#4A5568",
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2D3748",
    marginBottom: 8,
    lineHeight: 24,
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  categoryBadge: {
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexShrink: 0,
  },
  categoryText: {
    color: "#3182CE",
    fontSize: 12,
    fontWeight: "500",
  },
  dateText: {
    fontSize: 12,
    color: "#718096",
    fontWeight: "500",
  },
  content: {
    fontSize: 15,
    marginBottom: 12,
    color: "#4A5568",
    lineHeight: 22,
  },
  imageContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  image: {
    width: "100%",
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
    backgroundColor: "#E2E8F0",
    marginBottom: 12,
  },
  reactionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  reactionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  reactionIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  reactionText: {
    fontSize: 14,
    color: "#4A5568",
    fontWeight: "500",
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
    borderRadius: 16,
  },
  userProfileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E2E8F0",
    borderWidth: 2,
    borderColor: "#EDF2F7",
  },
  userName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2D3748",
    marginLeft: 12,
    flex: 1,
  },
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userStatItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  userStatCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5568',
  },
  userStatLabel: {
    fontSize: 13,
    color: '#718096',
  },
  userStatDivider: {
    width: 1,
    height: 10,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  simpleVoteItem: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    marginHorizontal: 2,
  },
  simpleVoteContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  simpleVoteImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
  },
  simpleVoteInfo: {
    flex: 1,
  },
  simpleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  remainingTimeText: {
    fontSize: 13,
    color: '#2D3748',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: '#4A5568',
    fontWeight: '500',
  },
  simpleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 4,
    lineHeight: 22,
    flex: 1,
  },
  voteStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    gap: 8,
  },
  statusToggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    height: 32,
  },
  activeStatusToggleButton: {
    backgroundColor: '#EBF8FF',
    borderColor: '#1499D9',
  },
  statusToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#718096',
    lineHeight: 16,
  },
  activeStatusToggleText: {
    color: '#1499D9',
    fontWeight: '600',
  },
  itemShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  likedText: {
    color: '#F56565',
  },
  defaultImageContainer: {
    marginRight: 16,
  },
  sortContainer: {
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  sortScrollContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  activeSortButton: {
    backgroundColor: '#EBF8FF',
    borderColor: '#1499D9',
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#718096',
  },
  activeSortButtonText: {
    color: '#1499D9',
    fontWeight: '600',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 0,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 0,
  },
  ongoingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 2,
    marginBottom: 4,
    marginTop: 4,
  },
  ongoingButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#718096',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'flex-start',
  },
  activeFilterButton: {
    backgroundColor: '#EBF8FF',
    borderColor: '#1499D9',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#718096',
  },
  activeFilterButtonText: {
    color: '#1499D9',
    fontWeight: '600',
  },
  dropdownButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  modalOptionText: {
    fontSize: 15,
    color: '#4A5568',
  },
  modalOptionSelectedText: {
    color: '#1499D9',
    fontWeight: '600',
  },
  voteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: 8,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorName: {
    fontSize: 13,
    color: '#4A5568',
    fontWeight: '500',
  },
  dotSeparator: {
    marginHorizontal: 6,
    color: '#CBD5E0',
  },
  createdAt: {
    fontSize: 13,
    color: '#718096',
  },
  skeletonItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  skeletonImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: '#EDF2F7',
  },
  skeletonTitle: {
    height: 20,
    width: '70%',
    backgroundColor: '#EDF2F7',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonCategory: {
    height: 20,
    width: 60,
    backgroundColor: '#EDF2F7',
    borderRadius: 12,
  },
  skeletonAuthor: {
    height: 16,
    width: 80,
    backgroundColor: '#EDF2F7',
    borderRadius: 4,
  },
  skeletonDot: {
    height: 16,
    width: 16,
    backgroundColor: '#EDF2F7',
    borderRadius: 8,
    marginHorizontal: 6,
  },
  skeletonDate: {
    height: 16,
    width: 60,
    backgroundColor: '#EDF2F7',
    borderRadius: 4,
  },
  skeletonTime: {
    height: 16,
    width: 100,
    backgroundColor: '#EDF2F7',
    borderRadius: 4,
  },
  skeletonStat: {
    height: 16,
    width: 30,
    backgroundColor: '#EDF2F7',
    borderRadius: 4,
  },
  skeletonUserImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EDF2F7',
  },
  skeletonUserName: {
    height: 16,
    width: 120,
    backgroundColor: '#EDF2F7',
    borderRadius: 4,
    marginLeft: 12,
    flex: 1,
  },
  skeletonChevron: {
    height: 20,
    width: 20,
    backgroundColor: '#EDF2F7',
    borderRadius: 10,
  },
})

export default React.memo(SearchScreen)
