import React, { useEffect, useState } from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getVoteById, reuploadVotePost } from '../api/post';
import { SafeAreaView } from 'react-native-safe-area-context';

type ReuploadVoteScreenRouteProp = RouteProp<RootStackParamList, 'ReuploadVoteScreen'>;
type ReuploadVoteScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ReuploadVoteScreen'>;

const ReuploadVoteScreen = () => {
  const route = useRoute<ReuploadVoteScreenRouteProp>();
  const navigation = useNavigation<ReuploadVoteScreenNavigationProp>();
  const { voteId } = route.params;

  const [originData, setOriginData] = useState<any>(null);
  const [finishTime, setFinishTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const fetchVote = async () => {
      try {
        const data = await getVoteById(voteId);
        setOriginData(data);
        setFinishTime(new Date(data.finishTime));
      } catch (err) {
        Alert.alert('불러오기 실패', '게시글 정보를 가져오는 중 오류 발생');
      }
    };
    fetchVote();
  }, [voteId]);

  const handleSubmit = async () => {
    try {
      await reuploadVotePost(voteId, {
        finishTime: finishTime.toISOString(), 
      });
  
      Alert.alert('재업로드 완료', '새로운 투표가 생성되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert('실패', err.message || '재업로드 중 오류 발생');
    }
  };

  if (!originData) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>제목</Text>
        <Text style={styles.readonly}>{originData.title}</Text>

        <Text style={styles.label}>내용</Text>
        <Text style={[styles.readonly, { minHeight: 80 }]}>{originData.content}</Text>

        <Text style={styles.label}>투표 옵션</Text>
        {originData.voteOptions.map((opt: any, idx: number) => (
          <Text key={idx} style={styles.readonly}>- {opt.content}</Text>
        ))}

        <Text style={styles.label}>마감일</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateButtonText}>📅 마감일 선택</Text>
        </TouchableOpacity>
        <Text style={styles.centeredText}>{finishTime.toLocaleString()}</Text>

        {showDatePicker && (
          <DateTimePicker
            value={finishTime}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, date) => {
              setShowDatePicker(false);
              if (date) setFinishTime(date);
            }}
          />
        )}

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>재업로드</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 30,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 6,
  },
  readonly: {
    fontSize: 14,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    marginBottom: 8,
    color: '#333',
  },
  dateButton: {
    padding: 10,
    backgroundColor: '#eee',
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  dateButtonText: {
    fontSize: 14,
  },
  centeredText: {
    textAlign: 'center',
    marginVertical: 8,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#007bff',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    resizeMode: 'cover',
    marginBottom: 10,
  },
});

export default ReuploadVoteScreen;
