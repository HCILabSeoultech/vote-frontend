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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMainPageVotes, selectVoteOption } from '../api/post';
import { VoteResponse } from '../types/Vote';
import { useIsFocused } from '@react-navigation/native';

const IMAGE_BASE_URL = 'http://localhost:8080';

const SavedScreen: React.FC = () => {
  const [votes, setVotes] = useState<VoteResponse[]>([]);
  const [page, setPage] = useState(0);
  const [isLast, setIsLast] = useState(false);
  const [loading, setLoading] = useState(false);
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

      await selectVoteOption(voteId, optionId); // 
      Alert.alert('투표 완료', '투표가 성공적으로 저장되었습니다.');
    } catch (error) {
      console.error('투표 실패:', error);
      Alert.alert('에러', '투표 중 오류가 발생했습니다.');
    }
  };

  const renderItem = ({ item }: { item: VoteResponse }) => {
    const closed = isVoteClosed(item.finishTime);

    return (
      <View
        style={[
          styles.voteItem,
          closed && { backgroundColor: '#ddd' }, 
        ]}
      >
        <Text style={styles.title}>
          {item.title} {closed && ' (마감)'} 
        </Text>
        <Text style={styles.meta}>
          작성자: {item.username} | 카테고리: {item.categoryName}
        </Text>
        <Text style={styles.meta}>
          마감일: {new Date(item.finishTime).toLocaleDateString()}
        </Text>

        <Text numberOfLines={2} style={styles.content}>
          {item.content}
        </Text>

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
            {item.voteOptions.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.optionButton,
                  closed && { backgroundColor: '#eee', borderColor: '#ccc' }, 
                ]}
                onPress={() => handleVote(item.voteId, opt.id)}
                disabled={closed}
              >
                <Text style={styles.optionButtonText}>{opt.content}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.reactionRow}>
          <TouchableOpacity style={styles.reactionItem}>
            <Text style={styles.reactionIcon}>
              {item.isLiked ? '❤️' : '🤍'}
            </Text>
            <Text style={styles.reactionText}>{item.likeCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.reactionItem}>
            <Text style={styles.reactionIcon}>💬</Text>
            <Text style={styles.reactionText}>{item.commentCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.reactionItem}>
            <Text style={styles.reactionIcon}>
              {item.isBookmarked ? '🔖' : '📄'}
            </Text>
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
  meta: { fontSize: 12, color: '#888', marginTop: 2 },
  content: { fontSize: 14, marginVertical: 8 },
  imageContainer: { marginTop: 8 },
  image: { width: '100%', height: 200, borderRadius: 8, marginTop: 8 },
  optionContainer: { marginTop: 12 },
  optionButton: {
    backgroundColor: '#ffffff',
    borderColor: '#888',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginVertical: 6,
    alignItems: 'center',
  },
  optionButtonText: { fontSize: 16, color: '#333' },
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
});

export default SavedScreen;
