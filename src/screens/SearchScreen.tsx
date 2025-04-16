"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Ionicons } from "@expo/vector-icons"
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
} from "react-native"
import Animated, { FadeInLeft, FadeIn } from "react-native-reanimated"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { getTopLikedVotes, getVoteById, selectVoteOption, getVotesByCategory } from "../api/post"
import { toggleLike, toggleBookmark } from "../api/reaction"
import { searchUsers, searchVotes } from "../api/search"
import type { VoteResponse } from "../types/Vote"
import type { UserDocument } from "../types/UserData"
import { useNavigation } from "@react-navigation/native"
import type { StackNavigationProp } from "@react-navigation/stack"
import type { RootStackParamList } from "../navigation/AppNavigator"

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

const SearchScreen: React.FC = () => {
  const [votes, setVotes] = useState<VoteResponse[]>([])
  const [userResults, setUserResults] = useState<UserDocument[]>([])
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({})
  const [searchKeyword, setSearchKeyword] = useState("")
  const [searchType, setSearchType] = useState<"vote" | "user">("vote")
  const [loading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<number>(0)

  const navigation = useNavigation<StackNavigationProp<RootStackParamList, "CommentScreen">>()

  useEffect(() => {
    fetchVotes()
  }, [])

  useEffect(() => {
    if (searchKeyword.trim() === "") {
      if (selectedCategory === 0) {
        fetchVotes()
      } else {
        fetchCategoryVotes(selectedCategory)
      }
    }
  }, [selectedCategory])

  const fetchVotes = async () => {
    try {
      const res = await getTopLikedVotes()
      setVotes(res)
    } catch (err) {
      console.error("인기 투표 불러오기 실패:", err)
    }
  }

  const fetchCategoryVotes = async (categoryId: number) => {
    try {
      const res = await getVotesByCategory(categoryId)
      if (res && res.content) {
        setVotes(res.content)
      }
    } catch (error) {
      console.error("카테고리별 인기글 불러오기 실패:", error)
    }
  }

  const refreshVote = async (voteId: number) => {
    try {
      const updated = await getVoteById(voteId)
      setVotes((prev) => prev.map((vote) => (vote.voteId === voteId ? updated : vote)))
    } catch (err) {
      console.error("투표 새로고침 실패:", err)
    }
  }

  const handleVote = async (voteId: number, optionId: number) => {
    try {
      const token = await AsyncStorage.getItem("token")
      if (!token) return Alert.alert("인증 오류", "로그인이 필요합니다.")

      await selectVoteOption(voteId, optionId)
      await refreshVote(voteId)
      setSelectedOptions((prev) => ({ ...prev, [voteId]: optionId }))
    } catch (error) {
      console.error("투표 실패:", error)
    }
  }

  const handleToggleLike = async (voteId: number) => {
    try {
      await toggleLike(voteId)
      await refreshVote(voteId)
    } catch (err) {
      console.error("좋아요 실패:", err)
    }
  }

  const handleToggleBookmark = async (voteId: number) => {
    try {
      await toggleBookmark(voteId)
      await refreshVote(voteId)
    } catch (err) {
      console.error("북마크 실패:", err)
    }
  }

  const handleSearch = async (text: string) => {
    setSearchKeyword(text)
    if (text.trim() === "") {
      setUserResults([])
      if (selectedCategory === 0) {
        fetchVotes()
      } else {
        fetchCategoryVotes(selectedCategory)
      }
      return
    }

    try {
      if (searchType === "vote") {
        const res = await searchVotes(text)

        const mapped = (res as any[]).map((item) => ({
          ...item,
          voteId: item.voteId ?? item.id,
        }))

        const cleaned = mapped.filter((item) => item && item.voteId !== undefined)
        setVotes(cleaned)
      } else {
        const users = await searchUsers(text)
        setUserResults(users)
      }
    } catch (err) {
      console.error("검색 실패:", err)
    }
  }

  const handleCategorySelect = (categoryId: number) => {
    setSelectedCategory(categoryId)
  }

  const isVoteClosed = (finishTime: string) => new Date(finishTime).getTime() < Date.now()

  const formatDate = (dateString: string) => {
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

  const renderVoteItem = ({ item, index }: { item: VoteResponse; index: number }) => {
    if (searchKeyword.trim() !== "") {
      return (
        <Animated.View entering={FadeIn.duration(300).delay(index * 50)}>
          <TouchableOpacity
            style={styles.simpleVoteItem}
            onPress={() => navigation.navigate("SingleVoteScreen", { voteId: item.voteId })}
            activeOpacity={0.7}
          >
            <Text style={styles.simpleTitle}>{item.title}</Text>
            <View style={styles.simpleMetaContainer}>
              <View style={styles.simpleUserInfo}>
                <Text style={styles.simpleMetaLabel}>작성자:</Text>
                <Text style={styles.simpleMetaValue}>{item.username}</Text>
              </View>
              <View style={styles.simpleCategory}>
                <Text style={styles.simpleMetaLabel}>카테고리:</Text>
                <Text style={styles.simpleMetaValue}>
                  {"category" in item ? (item as any).category : item.categoryName}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )
    }

    const closed = isVoteClosed(item.finishTime)
    const selectedOptionId = item.selectedOptionId ?? selectedOptions[item.voteId]
    const hasVoted = !!selectedOptionId
    const showGauge = closed || hasVoted
    const totalCount = item.voteOptions.reduce((sum, opt) => sum + opt.voteCount, 0)
    const hasImageOptions = item.voteOptions.some(opt => opt.optionImage)

    return (
      <Animated.View
        entering={FadeIn.duration(400).delay(index * 50)}
        style={[styles.voteItem, closed ? styles.closedVoteItem : styles.activeVoteItem]}
      >
        <View style={styles.userInfoRow}>
          <View style={styles.userInfoLeft}>
            <Image
              source={{
                uri:
                  item.profileImage === "default.jpg"
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
          <Text numberOfLines={2} style={styles.content}>
            {item.content}
          </Text>
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
              const isSelected = selectedOptionId === opt.id
              const percentage = totalCount > 0 ? Math.round((opt.voteCount / totalCount) * 100) : 0

              return (
                <View key={opt.id} style={[styles.optionWrapper, opt.optionImage && styles.imageOptionWrapper]}>
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
              )
            })}
            {showGauge && totalCount > 0 && <Text style={styles.responseCountText}>{totalCount}명 참여</Text>}
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.reactionRow}>
          <TouchableOpacity
            style={styles.reactionItem}
            onPress={() => handleToggleLike(item.voteId)}
            activeOpacity={0.7}
          >
            <Text style={styles.reactionIcon}>{item.isLiked ? "❤️" : "🤍"}</Text>
            <Text style={styles.reactionText}>{item.likeCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reactionItem}
            onPress={() => navigation.navigate("CommentScreen", { voteId: item.voteId })}
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
            <Text style={styles.reactionIcon}>{item.isBookmarked ? "🔖" : "📄"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.reactionItem} activeOpacity={0.7}>
            <Text style={styles.reactionIcon}>📊</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    )
  }

  const renderEmptyResults = () => {
    if (loading) return null

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {searchType === "vote" ? "검색 결과가 없습니다." : "일치하는 사용자가 없습니다."}
        </Text>
        <Text style={styles.emptySubText}>다른 검색어를 입력해보세요.</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBarContainer}>
          <View style={styles.inlineToggleContainer}>
            <TouchableOpacity
              style={[styles.inlineToggleButton, searchType === "vote" && styles.activeInlineToggle]}
              onPress={() => setSearchType("vote")}
              activeOpacity={0.7}
            >
              <Text style={[styles.inlineToggleText, searchType === "vote" && styles.activeToggleText]}>투표</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.inlineToggleButton, searchType === "user" && styles.activeInlineToggle]}
              onPress={() => setSearchType("user")}
              activeOpacity={0.7}
            >
              <Text style={[styles.inlineToggleText, searchType === "user" && styles.activeToggleText]}>유저</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="search" size={20} color="#718096" style={styles.searchIcon} />
            <TextInput
              placeholder={searchType === "vote" ? "투표 검색..." : "사용자 검색..."}
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

        {searchKeyword.trim() === "" && searchType === "vote" && (
          <View style={styles.contentHeader}>
            <Text style={styles.popularTitle}>
              {selectedCategory === 0 ? "인기 투표" : `${categories.find((c) => c.id === selectedCategory)?.name} 투표`}
            </Text>

            <View style={styles.categoryContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScrollContainer}
              >
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.categoryButton, selectedCategory === category.id && styles.selectedCategoryButton]}
                    onPress={() => handleCategorySelect(category.id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        selectedCategory === category.id && styles.selectedCategoryText,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </View>

      {searchType === "user" ? (
        <FlatList
          data={userResults}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeIn.duration(300).delay(index * 50)}>
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
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.username}</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
          contentContainerStyle={[styles.container, userResults.length === 0 && styles.emptyListContainer]}
          ListEmptyComponent={renderEmptyResults}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={votes}
          keyExtractor={(item, index) => (item?.voteId !== undefined ? item.voteId.toString() : `vote-${index}`)}
          renderItem={renderVoteItem}
          contentContainerStyle={[styles.container, votes.length === 0 && styles.emptyListContainer]}
          ListEmptyComponent={renderEmptyResults}
          showsVerticalScrollIndicator={false}
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
    paddingTop: 12,
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  searchBarContainer: {
    marginHorizontal: 16,
  },
  inlineToggleContainer: {
    flexDirection: "row",
    backgroundColor: "#EDF2F7",
    borderRadius: 24,
    padding: 4,
    marginBottom: 12,
    alignSelf: "center",
  },
  inlineToggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  activeInlineToggle: {
    backgroundColor: "#5E72E4",
  },
  inlineToggleText: {
    fontSize: 14,
    color: "#4A5568",
    fontWeight: "600",
  },
  activeToggleText: {
    color: "#FFFFFF",
    fontWeight: "700",
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
    marginTop: 4,
    marginBottom: 8,
  },
  categoryScrollContainer: {
    paddingVertical: 4,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: "#EDF2F7",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  selectedCategoryButton: {
    backgroundColor: "#5E72E4",
    borderColor: "#4C63D9",
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4A5568",
  },
  selectedCategoryText: {
    color: "#FFFFFF",
    fontWeight: "600",
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
    backgroundColor: "#CBD5E0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  closedBadgeText: {
    color: "#4A5568",
    fontSize: 12,
    fontWeight: "500",
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
    backgroundColor: "#EBF4FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
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
    borderColor: '#5E72E4',
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
    color: "#5E72E4",
    fontWeight: "600",
  },
  percentageText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4A5568",
    marginLeft: 8,
  },
  selectedPercentageText: {
    color: "#5E72E4",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userProfileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E2E8F0",
    borderWidth: 2,
    borderColor: "#EDF2F7",
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D3748",
  },
  simpleVoteItem: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  simpleTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2D3748",
    marginBottom: 8,
  },
  simpleMetaContainer: {
    marginTop: 4,
  },
  simpleUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  simpleCategory: {
    flexDirection: "row",
    alignItems: "center",
  },
  simpleMetaLabel: {
    fontSize: 13,
    color: "#718096",
    marginRight: 4,
  },
  simpleMetaValue: {
    fontSize: 13,
    color: "#4A5568",
    fontWeight: "500",
  },
  createdAtText: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
})

export default SearchScreen
