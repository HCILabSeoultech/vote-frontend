import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Button from '../components/Button';
import { signup } from '../api/auth';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'CategorySelection'>;
  route: RouteProp<RootStackParamList, 'CategorySelection'>;
};

type Category = {
  id: number;
  name: string;
};

const categories: Category[] = [
  { id: 1, name: '운동' },
  { id: 2, name: '음식' },
  { id: 3, name: '패션' },
  { id: 4, name: '여행' },
  { id: 5, name: '정치' },
  { id: 6, name: '기술' },
];

const CategorySelectionScreen: React.FC<Props> = ({ route, navigation }) => {
  const { userData } = route.params;

  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [gender, setGender] = useState('');
  const [birthdate, setBirthdate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const formatDate = (date: Date) =>
    `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;

  const handleSignup = async () => {
    const dataToSend = {
      ...userData,
      gender,
      birthdate: birthdate.toISOString().split('T')[0],
      interestCategory: selectedCategories,
    };

    try {
      await signup(dataToSend);
      Alert.alert('회원가입 성공');
      navigation.navigate('Login');
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const errorCode = (error as any).response?.data?.errorCode;
        if (errorCode === 'ALREADY_EXIST_NAME') {
          Alert.alert('회원가입 실패', '이미 존재하는 아이디입니다.');
        } else if (errorCode === 'ALREADY_EXIST_PHONE') {
          Alert.alert('회원가입 실패', '이미 존재하는 전화번호입니다.');
        } else {
          Alert.alert('오류', '회원가입 중 문제가 발생했습니다.');
        }
      } else {
        Alert.alert('오류', '예기치 못한 에러가 발생했습니다.');
      }
    }
  };

  const genders = ['male', 'female'];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>성별을 선택하세요</Text>
      <View style={styles.genderContainer}>
        {genders.map(g => {
          const selected = gender === g;
          return (
            <TouchableOpacity
              key={g}
              onPress={() => setGender(g)}
              style={[
                styles.genderButton,
                selected && styles.genderButtonSelected,
              ]}
            >
              <Text style={[styles.genderText, selected && styles.genderTextSelected]}>
                {g === 'male' ? '남자' : '여자'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.birthdateButton}>
        <Text style={styles.birthdateText}>
          {birthdate ? formatDate(birthdate) : '생년월일 선택'}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={birthdate}
          mode="date"
          display="spinner"
          onChange={(event, selectedDate) => {
            if (selectedDate) setBirthdate(selectedDate);
            setShowDatePicker(Platform.OS === 'ios');
          }}
        />
      )}

      <Text style={styles.title}>관심 카테고리를 선택하세요</Text>
      <View style={styles.categoryListWrapper}>
        <FlatList
          data={categories}
          numColumns={3}
          contentContainerStyle={styles.flatListContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategories.includes(item.id) && styles.selected,
              ]}
              onPress={() => toggleCategory(item.id)}
            >
              <Text>{item.name}</Text>
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id.toString()}
        />
      </View>

      <Button title="회원가입 완료" onPress={handleSignup} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center', // 모든 요소를 가로축 중앙 정렬
    justifyContent: 'center', // 세로축 중앙 정렬
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 12,
    textAlign: 'center', // 텍스트 중앙 정렬
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  genderButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    marginHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  genderText: {
    color: '#333',
    textAlign: 'center',
  },
  genderTextSelected: {
    color: '#fff',
  },
  birthdateButton: {
    padding: 10,
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  birthdateText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  categoryListWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  flatListContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    margin: 6,
    borderWidth: 1,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: '#add8e6',
  },
});

export default CategorySelectionScreen;
