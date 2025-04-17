import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  SafeAreaView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { reuploadVotePost } from '../api/post';

interface RouteParams {
  voteId: number;
}

const formatToLocalDateTimeString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  const millisecond = String(date.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${millisecond}`;
};

const ReuploadVoteScreen: React.FC = () => {
  const [finishTime, setFinishTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { voteId } = route.params as RouteParams;

  const handleSubmit = async () => {
    if (finishTime <= new Date()) {
      Alert.alert('마감일 오류', '마감일은 현재 시간보다 미래여야 합니다');
      return;
    }

    try {
      const response = await reuploadVotePost(voteId, {
        finishTime: formatToLocalDateTimeString(finishTime),
      });
      Alert.alert('재업로드 완료', '게시물이 성공적으로 재업로드되었습니다.', [
        { text: '확인', onPress: () => navigation.navigate('Main') },
      ]);
    } catch (error) {
      console.error('재업로드 실패:', error);
      Alert.alert('재업로드 실패', '게시물 재업로드 중 오류가 발생했습니다.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>마감일 선택</Text>
        <Text style={styles.description}>
          새로운 마감일을 선택해주세요. 마감일은 현재 시간보다 미래여야 합니다.
        </Text>

        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateButtonText}>📅 마감일 선택</Text>
        </TouchableOpacity>
        <Text style={styles.selectedDate}>
          {formatToLocalDateTimeString(finishTime)}
        </Text>

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

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitText}>재업로드하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2D3748',
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#4A5568',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  },
  dateButton: {
    backgroundColor: '#F7FAFC',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateButtonText: {
    color: '#4A5568',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedDate: {
    textAlign: 'center',
    color: '#4A5568',
    marginBottom: 32,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#5E72E4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReuploadVoteScreen; 