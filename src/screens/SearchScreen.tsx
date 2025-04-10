import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
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
  TextInput,
} from 'react-native';
import Animated, { FadeInLeft } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTopLikedVotes, getVoteById, selectVoteOption } from '../api/post';
import { toggleLike, toggleBookmark } from '../api/reaction';
import { searchUsers, searchVotes } from '../api/search';
import { VoteResponse } from '../types/Vote';
import { UserDocument } from '../types/UserData';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

const IMAGE_BASE_URL = 'http://localhost:8080';

const SearchScreen: React.FC = () => {
  const [votes, setVotes] = useState<VoteResponse[]>([]);
  const [userResults, setUserResults] = useState<UserDocument[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchType, setSearchType] = useState<'vote' | 'user'>('vote');
  const [loading, setLoading] = useState(false);

  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'CommentScreen'>>();

  useEffect(() => {
    fetchVotes();
  }, []);

  const fetchVotes = async () => {
    setLoading(true);
    try {
      const res = await getTopLikedVotes();
      setVotes(res);
    } catch (err) {
      console.error('인기 투표 불러오기 실패:', err);
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

  const handleVote = async (voteId: number, optionId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return Alert.alert('인증 오류', '로그인이 필요합니다.');

      await selectVoteOption(voteId, optionId);
      await refreshVote(voteId);
      setSelectedOptions((prev) => ({ ...prev, [voteId]: optionId }));
    } catch (error) {
      console.error('투표 실패:', error);
    }
  };

  const handleToggleLike = async (voteId: number) => {
    try {
      await toggleLike(voteId);
      await refreshVote(voteId);
    } catch (err) {
      console.error('좋아요 실패:', err);
    }
  };

  const handleToggleBookmark = async (voteId: number) => {
    try {
      await toggleBookmark(voteId);
      await refreshVote(voteId);
    } catch (err) {
      console.error('북마크 실패:', err);
    }
  };

  const handleSearch = async (text: string) => {
    setSearchKeyword(text);
    if (text.trim() === '') {
      setUserResults([]);
      fetchVotes();
      return;
    }

    try {
      setLoading(true);
      if (searchType === 'vote') {
        const res = await searchVotes(text);

        const mapped = (res as any[]).map((item) => ({
          ...item,
          voteId: item.voteId ?? item.id,
        }));
  
        const cleaned = mapped.filter((item) => item && item.voteId !== undefined);
        setVotes(cleaned);
      } else {
        const users = await searchUsers(text);
        setUserResults(users);
      }
    } catch (err) {
      console.error('검색 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const isVoteClosed = (finishTime: string) => new Date(finishTime).getTime() < Date.now();

  const renderVoteItem = ({ item }: { item: VoteResponse }) => {
    if (searchKeyword.trim() !== '') {
      return (
        <TouchableOpacity
          style={styles.simpleVoteItem}
          onPress={() => navigation.navigate('CommentScreen', { voteId: item.voteId })}
        >
          <Text style={styles.simpleTitle}>{item.title}</Text>
          <Text style={styles.simpleMeta}>작성자: {item.username}</Text>
          <Text style={styles.simpleMeta}>
            카테고리: {'category' in item ? (item as any).category : item.categoryName}
          </Text>

        </TouchableOpacity>
      );
    }

    const closed = isVoteClosed(item.finishTime);
    const selectedOptionId = item.selectedOptionId ?? selectedOptions[item.voteId];
    const hasVoted = !!selectedOptionId;
    const showGauge = closed || hasVoted;
    const totalCount = item.voteOptions.reduce((sum, opt) => sum + opt.voteCount, 0);

    return (
      <View style={[styles.voteItem, closed && { backgroundColor: '#ddd' }]}>
        <View style={styles.userInfoRow}>
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

        <Text style={styles.title}>{item.title}{closed && <Text> (마감)</Text>}</Text>
        <Text style={styles.meta}>카테고리: {item.categoryName}</Text>
        <Text style={styles.meta}>마감일: {new Date(item.finishTime).toLocaleDateString()}</Text>
        <Text numberOfLines={2} style={styles.content}>{item.content}</Text>

        {item.images.length > 0 && (
          <View style={styles.imageContainer}>
            {item.images.map((img) => (
              <Image key={img.id} source={{ uri: `${IMAGE_BASE_URL}${img.imageUrl}` }} style={styles.image} />
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

          <TouchableOpacity style={styles.reactionItem} onPress={() => navigation.navigate('CommentScreen', { voteId: item.voteId })}>
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
      <View style={styles.searchBarContainer}>
        <View style={styles.inlineToggleContainer}>
          <TouchableOpacity
            style={[styles.inlineToggleButton, searchType === 'vote' && styles.activeInlineToggle]}
            onPress={() => setSearchType('vote')}
          >
            <Text style={[styles.inlineToggleText, searchType === 'vote' && styles.activeToggleText]}>투표</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.inlineToggleButton, searchType === 'user' && styles.activeInlineToggle]}
            onPress={() => setSearchType('user')}
          >
            <Text style={[styles.inlineToggleText, searchType === 'user' && styles.activeToggleText]}>유저</Text>
          </TouchableOpacity>
        </View>
        <Ionicons name="search" size={20} color="#888" style={{ marginHorizontal: 8 }} />
        <TextInput
          placeholder="검색어를 입력하세요"
          style={styles.searchInput}
          value={searchKeyword}
          onChangeText={handleSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : searchType === 'user' ? (
        <FlatList
          data={userResults}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.userItem}>
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
          )}
          contentContainerStyle={styles.container}
        />
      ) : (
        <FlatList
          data={votes}
          keyExtractor={(item, index) =>
            item?.voteId !== undefined ? item.voteId.toString() : `vote-${index}`
          }
          renderItem={renderVoteItem}
          contentContainerStyle={styles.container}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  inlineToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#ddd',
    borderRadius: 20,
    overflow: 'hidden',
  },
  inlineToggleButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#ddd',
  },
  activeInlineToggle: {
    backgroundColor: '#007bff',
  },
  inlineToggleText: {
    fontSize: 12,
    color: '#333',
  },
  activeToggleText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  container: { padding: 16 },
  voteItem: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    elevation: 2,
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
  title: { fontSize: 18, fontWeight: 'bold' },
  meta: { fontSize: 12, color: '#888' },
  content: { fontSize: 14, marginVertical: 8 },
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
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f2f2f2',
    marginBottom: 8,
    borderRadius: 8,
  },

  simpleVoteItem: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 12,
    borderColor: '#ddd',
    borderWidth: 1,
  },
  simpleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  simpleMeta: {
    fontSize: 12,
    color: '#666',
  },
});

export default SearchScreen;
