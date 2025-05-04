import React, { useState } from 'react';
import {
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  SafeAreaView,
  ScrollView
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
        Alert.alert('이미 존재하는 전화번호입니다.');
      } else {
        Alert.alert('회원가입 실패', '잠시 후 다시 시도해주세요.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={styles.progressFill} />
              </View>
              <Text style={styles.progressText}>3/3 단계</Text>
            </View>
            <Text style={styles.subtitle}>회원님의 추가 정보를 입력해주세요</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>전화번호</Text>
              <InputField
                placeholder="전화번호 (- 없이 입력)"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <Text style={styles.helperText}>
                010으로 시작하는 11자리 숫자를 입력해주세요
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>자기소개</Text>
              <InputField
                placeholder="자기소개 (최대 200자)"
                value={introduction}
                onChangeText={setIntroduction}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                style={{
                  paddingTop: 12,
                  minHeight: 100,
                  backgroundColor: '#F7FAFC',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  borderRadius: 8,
                  paddingHorizontal: 12
                }}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>관심 카테고리</Text>
              <Text style={styles.helperText}>
                하나 이상의 카테고리를 선택해주세요
              </Text>
              <View style={styles.categoryContainer}>
                {categories.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => toggleCategory(item.id)}
                    style={[
                      styles.categoryButton,
                      selectedCategories.includes(item.id) && styles.selectedCategory
                    ]}
                  >
                    <Text style={[
                      styles.categoryText,
                      selectedCategories.includes(item.id) && styles.selectedCategoryText
                    ]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Button 
              title="회원가입 완료" 
              onPress={handleSignup} 
              style={styles.signupButton}
              textStyle={styles.signupButtonText}
            />
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>이전으로</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    backgroundColor: '#fff',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBar: {
    width: '80%',
    height: 3,
    backgroundColor: '#F0F4FF',
    borderRadius: 1.5,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1499D9',
    borderRadius: 1.5,
  },
  progressText: {
    fontSize: 14,
    color: '#1499D9',
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    letterSpacing: 0.5,
    textAlign: 'center',
    fontWeight: '500',
  },
  formContainer: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  helperText: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
    elevation: 0,
    shadowColor: 'transparent',
  },
  selectedCategory: {
    backgroundColor: '#1499D9',
    borderColor: '#1499D9',
  },
  categoryText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  selectedCategoryText: {
    color: 'white',
  },
  buttonContainer: {
    marginTop: 8,
  },
  signupButton: {
    backgroundColor: '#1499D9',
    height: 48,
    borderRadius: 12,
    elevation: 0,
    shadowColor: 'transparent',
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    color: '#fff',
  },
  backButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  backButtonText: {
    color: '#A0AEC0',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});

export default SignupStep3Screen;