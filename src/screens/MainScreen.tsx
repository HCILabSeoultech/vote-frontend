import type React from "react"
import { useEffect, useState } from "react"
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
} from "react-native"
import { Feather} from '@expo/vector-icons'
import Animated, { FadeInLeft, FadeIn } from "react-native-reanimated"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { getMainPageVotes, getVoteById, selectVoteOption } from "../api/post"
import { toggleLike, toggleBookmark } from "../api/reaction"
import type { VoteResponse } from "../types/Vote"
import { useIsFocused, useNavigation } from "@react-navigation/native"
import type { StackNavigationProp } from "@react-navigation/stack"
import type { RootStackParamList } from "../navigation/AppNavigator"
import { jwtDecode } from "jwt-decode"

import { SERVER_URL } from "../constant/config"

const IMAGE_BASE_URL = `${SERVER_URL}`
const { width } = Dimensions.get("window")

interface JwtPayload {
  sub: string
}

const MainScreen: React.FC = () => {
  const [votes, setVotes] = useState<VoteResponse[]>([])
  const [page, setPage] = useState(0)
  const [isLast, setIsLast] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({})
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)
  const isFocused = useIsFocused()
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, "CommentScreen">>()

  useEffect(() => {
    const fetchUserFromToken = async () => {
      const token = await AsyncStorage.getItem("token")
      if (token) {
        try {
          const decoded: JwtPayload = jwtDecode(token)
          setCurrentUsername(decoded.sub)
        } catch (e) {
          console.error("JWT decode 실패:", e)
        }
      }
    }

    fetchUserFromToken()
  }, [])

  useEffect(() => {
    if (isFocused) {
      setVotes([])
      setPage(0)
      setIsLast(false)
      fetchVotes(0)
    }
  }, [isFocused])

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>VOTY</Text>
      <TouchableOpacity onPress={() => Alert.alert("알림", "알림 기능 준비 중입니다.")}>
      <Feather name="bell" size={24} color="#2D3748" />
      </TouchableOpacity>
    </View>
  )

  const fetchVotes = async (nextPage: number) => {
    if (loading || isLast) return
    setLoading(true)
    try {
      const res = await getMainPageVotes(nextPage)
      setVotes((prev) => [...prev, ...res.content])
      setPage(res.number + 1)
      setIsLast(res.last)
    } catch (err) {
      console.error("투표 불러오기 실패:", err)
    } finally {
      setLoading(false)
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

  const isVoteClosed = (finishTime: string) => {
    const finish = new Date(finishTime)
    const now = new Date() //KST시스템

    return finish.getTime() < now.getTime()
  }

  const handleVote = async (voteId: number, optionId: number) => {
    try {
      const token = await AsyncStorage.getItem("token")
      if (!token) {
        Alert.alert("인증 오류", "로그인이 필요합니다.")
        return
      }

      await selectVoteOption(voteId, optionId)
      await refreshVote(voteId)
      setSelectedOptions((prev) => ({
        ...prev,
        [voteId]: optionId,
      }))
    } catch (error) {
      console.error("투표 실패:", error)
      Alert.alert("에러", "투표 중 오류가 발생했습니다.")
    }
  }

  const handleToggleLike = async (voteId: number) => {
    try {
      const token = await AsyncStorage.getItem("token")
      if (!token) {
        Alert.alert("인증 오류", "로그인이 필요합니다.")
        return
      }

      await toggleLike(voteId)
      await refreshVote(voteId)
    } catch (err) {
      console.error("좋아요 실패:", err)
      Alert.alert("에러", "좋아요 처리 중 오류가 발생했습니다.")
    }
  }

  const handleToggleBookmark = async (voteId: number) => {
    try {
      const token = await AsyncStorage.getItem("token")
      if (!token) {
        Alert.alert("인증 오류", "로그인이 필요합니다.")
        return
      }

      await toggleBookmark(voteId)
      await refreshVote(voteId)
    } catch (err) {
      console.error("북마크 실패:", err)
      Alert.alert("에러", "북마크 처리 중 오류가 발생했습니다.")
    }
  }

  const renderItem = ({ item }: { item: VoteResponse }) => {
    const closed = isVoteClosed(item.finishTime)
    const selectedOptionId = item.selectedOptionId ?? selectedOptions[item.voteId]
    const hasVoted = !!selectedOptionId
    const showGauge = closed || hasVoted
    const totalCount = item.voteOptions.reduce((sum, opt) => sum + opt.voteCount, 0)
    const hasImageOptions = item.voteOptions.some(opt => opt.optionImage)

    const isMyPost = currentUsername !== null && item.username === currentUsername

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

    // Format creation time to show how long ago the post was created
    const formatCreationTime = (dateString: string) => {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffSec = Math.floor(diffMs / 1000)
      const diffMin = Math.floor(diffSec / 60)
      const diffHour = Math.floor(diffMin / 60)
      const diffDay = Math.floor(diffHour / 24)

      if (diffSec < 60) {
        return "방금 전"
      } else if (diffMin < 60) {
        return `${diffMin}분 전`
      } else if (diffHour < 24) {
        return `${diffHour}시간 전`
      } else if (diffDay < 7) {
        return `${diffDay}일 전`
      } else {
        return date.toLocaleDateString()
      }
    }

    return (
      <Animated.View
        entering={FadeIn.duration(400).delay((item.voteId % 10) * 50)}
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
                onPress={() => navigation.navigate("UserPageScreen", { userId: item.userId })}
                activeOpacity={0.7}
              >
                <Text style={styles.nickname}>{item.username}</Text>
              </TouchableOpacity>
              <Text style={styles.creationTime}>{formatCreationTime(item.createdAt)}</Text>
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={votes}
        keyExtractor={(item) => item.voteId.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.container}
        ListHeaderComponent={renderHeader}
        onEndReached={() => fetchVotes(page)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="small" color="#1499D9" />
              <Text style={styles.loadingText}>투표 불러오는 중...</Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7FAFC",
  },
  container: {
    padding: 12,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#3182CE",
  },
  headerIcon: {
    fontSize: 24,
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
  creationTime: {
    fontSize: 12,
    color: "#718096",
    marginTop: 2,
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
    position: "relative",
    marginVertical: 6,
  },
  imageOptionWrapper: {
    width: '48%',
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
  closedOptionButton: {
    backgroundColor: "#F7FAFC",
    borderColor: "#E2E8F0",
  },
  selectedOptionButton: {
    borderColor: "#1499D9",
    borderWidth: 1.5,
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
  loaderContainer: {
    padding: 16,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    color: "#1499D9",
    fontSize: 14,
  },
})

export default MainScreen
