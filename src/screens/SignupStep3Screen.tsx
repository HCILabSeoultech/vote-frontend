import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, FlatList,
} from 'react-native';
import InputField from '../components/InputField';
import Button from '../components/Button';
import { signup } from '../api/auth';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { SignupRequest } from '../types/Auth';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'SignupStep3Screen'>;
  route: RouteProp<RootStackParamList, 'SignupStep3Screen'>;
};

const categories = [
  { id: 1, name: '운동' },
  { id: 2, name: '음식' },
  { id: 3, name: '패션' },
  { id: 4, name: '여행' },
  { id: 5, name: '정치' },
  { id: 6, name: '기술' },
];

const SignupStep3Screen: React.FC<Props> = ({ navigation, route }) => {
  const { userData } = route.params;
  const [introduction, setIntroduction] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  const toggleCategory = (id: number) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSignup = async () => {
    if (!phone.trim()) {
      Alert.alert('입력 오류', '전화번호를 입력해주세요.');
      return;
    }
    if (!/^010\d{8}$/.test(phone)) {
        Alert.alert('입력 오류', '전화번호는 010으로 시작하는 숫자 11자리여야 합니다.');
        return;
    }
    if (selectedCategories.length === 0) {
    Alert.alert('입력 오류', '관심 카테고리를 하나 이상 선택해주세요.');
    return;
    }

    const finalData: SignupRequest = {
      username: userData.username ?? '',
      password: userData.password ?? '',
      name: userData.name ?? '',
      gender: userData.gender ?? '',
      phone,
      birthdate: userData.birthdate ?? '',
      address: userData.address ?? '',
      profileImage: userData.profileImage ?? '',
      introduction,
      interestCategory: selectedCategories,
    };

    try {
      await signup(finalData);
      Alert.alert('회원가입 완료', '로그인 페이지로 이동합니다.');
      navigation.navigate('Login');
    } catch (error: any) {
      const code = error?.response?.data?.errorCode;
      if (code === 'ALREADY_EXIST_NAME') {
        Alert.alert('중복 아이디입니다.');
      } else if (code === 'ALREADY_EXIST_PHONE') {
        Alert.alert('중복 전화번호입니다.');
      } else {
        Alert.alert('회원가입 실패', '잠시 후 다시 시도해주세요.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>3단계: 자기소개 & 전화번호 & 카테고리</Text>

      <InputField
        placeholder="전화번호 (- 없이 입력)"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <InputField
        placeholder="자기소개 (최대 200자)"
        value={introduction}
        onChangeText={setIntroduction}
      />

      <Text style={styles.subtitle}>관심 카테고리 선택</Text>
      <FlatList
        data={categories}
        numColumns={3}
        contentContainerStyle={styles.categoryList}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => toggleCategory(item.id)}
            style={[styles.categoryButton,
              selectedCategories.includes(item.id) && styles.selected]}
          >
            <Text>{item.name}</Text>
          </TouchableOpacity>
        )}
        keyExtractor={item => item.id.toString()}
      />

      <Button title="회원가입 완료" onPress={handleSignup} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  subtitle: { fontWeight: 'bold', marginVertical: 12 },
  categoryList: { alignItems: 'center' },
  categoryButton: {
    padding: 10,
    margin: 6,
    borderWidth: 1,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  selected: { backgroundColor: '#aee1f9' },
});

export default SignupStep3Screen;