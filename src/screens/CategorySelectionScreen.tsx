import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
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

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSignup = async () => {
    const dataToSend = {
      ...userData,
      interestCategory: selectedCategories,
      profileImage: 'default.jpg',
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

  return (
    <View style={styles.container}>
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
}  

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center', // 전체 중앙 배치
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  categoryListWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  flatListContent: {
    alignItems: 'center',
  },
  categoryButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    margin: 6,
    borderWidth: 1,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  selected: {
    backgroundColor: '#add8e6',
  },
});


export default CategorySelectionScreen;
