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
import { Feather } from '@expo/vector-icons';

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

const formatDisplayDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}년 ${month}월 ${day}일 ${hour}:${minute}`;
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
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#2D3748" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>투표 재업로드</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Feather name="refresh-ccw" size={32} color="#1499D9" />
          </View>
          <Text style={styles.title}>마감일 재설정</Text>
          <Text style={styles.description}>
            새로운 마감일을 선택해주세요.{'\n'}
            마감일은 현재 시간보다 미래여야 합니다.
          </Text>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Feather name="calendar" size={20} color="#1499D9" />
            <Text style={styles.dateButtonText}>마감일 선택하기</Text>
          </TouchableOpacity>

          <View style={styles.selectedDateContainer}>
            <Feather name="clock" size={16} color="#718096" />
            <Text style={styles.selectedDate}>
              {formatDisplayDate(finishTime)}
            </Text>
          </View>

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
            <Text style={styles.submitText}>재업로드</Text>
            <Feather name="check" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EBF8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    alignSelf: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2D3748',
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#718096',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  dateButton: {
    backgroundColor: '#EBF8FF',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  dateButtonText: {
    color: '#1499D9',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 6,
  },
  selectedDate: {
    color: '#718096',
    fontSize: 15,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#1499D9',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReuploadVoteScreen; 