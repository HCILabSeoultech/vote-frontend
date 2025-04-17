import React, { useState, useEffect } from 'react';
import {
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Image, 
  Platform,
  SafeAreaView,
  ScrollView,
  Modal,
  FlatList
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import InputField from '../components/InputField';
import Button from '../components/Button';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { SERVER_URL } from '../constant/config';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'SignupStep2Screen'>;
  route: RouteProp<RootStackParamList, 'SignupStep2Screen'>;
};

// 한국 지역 목록
const koreanRegions = [
  '서울특별시',
  '부산광역시',
  '대구광역시',
  '인천광역시',
  '광주광역시',
  '대전광역시',
  '울산광역시',
  '세종특별자치시',
  '경기도',
  '강원도',
  '충청북도',
  '충청남도',
  '전라북도',
  '전라남도',
  '경상북도',
  '경상남도',
  '제주특별자치도'
];

const SignupStep2Screen: React.FC<Props> = ({ navigation, route }) => {
  const { userData } = route.params;
  const [userDataState, setUserData] = useState({ ...userData });
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState(new Date());
  const [gender, setGender] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [showAddressPicker, setShowAddressPicker] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('갤러리 접근 권한이 필요합니다!');
      }
    })();
  }, []);

  const handleImageSelect = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setProfileImagePreview(uri);

        const formData = new FormData();
        formData.append('file', {
          uri,
          name: 'profile.jpg',
          type: 'image/jpeg',
        } as any);

        const response = await fetch(`${SERVER_URL}/image/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error('업로드 실패');
        }

        const imageUrl = await response.text();
        setUserData(prev => ({ ...prev, profileImage: imageUrl }));
      }
    } catch (e) {
      console.log('이미지 업로드 실패:', e);
      Alert.alert('이미지 업로드 실패', '프로필 이미지 업로드 중 오류가 발생했습니다.');
    }
  };

  const handleNext = () => {
    if (!name.trim()) {
      Alert.alert('입력 오류', '이름을 입력해주세요.');
      return;
    }
    if (!gender) {
      Alert.alert('입력 오류', '성별을 선택해주세요.');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // 오늘 날짜의 00:00 기준으로 설정
    if (birthdate.getTime() >= today.getTime()) {
      Alert.alert('입력 오류', '생년월일은 오늘보다 이전 날짜여야 합니다.');
      return;
      
    }
    if (!address) {
      Alert.alert('입력 오류', '지역을 선택해주세요.');
      return;
    }

    const profileImage = userDataState.profileImage || 'default.jpg';

    navigation.navigate('SignupStep3Screen', {
      userData: {
        ...userDataState,
        name,
        gender,
        birthdate: birthdate.toISOString().split('T')[0],
        profileImage,
        address,
      },
    });
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}년 ${month}월 ${day}일`;
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
              <Text style={styles.progressText}>2/3 단계</Text>
            </View>
            <Text style={styles.title}>프로필 입력</Text>
            <Text style={styles.subtitle}>회원님의 기본 정보를 입력해주세요</Text>
          </View>

          <View style={styles.formContainer}>
            <TouchableOpacity onPress={handleImageSelect} style={styles.imageContainer}>
              {profileImagePreview ? (
                <View>
                  <Image source={{ uri: profileImagePreview }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => {
                      setProfileImagePreview(null);
                      setUserData(prev => ({ ...prev, profileImage: undefined }));
                    }}
                  >
                    <Text style={styles.removeText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.placeholder}>
                  <Text style={styles.placeholderText}>프로필 사진 추가</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>이름</Text>
              <InputField 
                placeholder="이름을 입력해주세요" 
                value={name} 
                onChangeText={setName}
                containerStyle={styles.inputField}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>성별</Text>
              <View style={styles.genderContainer}>
                {['male', 'female'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setGender(g)}
                    style={[styles.genderButton, gender === g && styles.genderButtonSelected]}
                  >
                    <Text style={[styles.genderText, gender === g && styles.genderTextSelected]}>
                      {g === 'male' ? '남자' : '여자'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>생년월일</Text>
              <TouchableOpacity 
                onPress={() => setShowDatePicker(true)} 
                style={styles.datePickerButton}
              >
                <Text style={styles.datePickerText}>{formatDate(birthdate)}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={birthdate}
                  mode="date"
                  display="spinner"
                  onChange={(e, selectedDate) => {
                    if (selectedDate) setBirthdate(selectedDate);
                    setShowDatePicker(Platform.OS === 'ios');
                  }}
                  maximumDate={new Date()}
                />
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>지역</Text>
              <TouchableOpacity 
                onPress={() => setShowAddressPicker(true)} 
                style={styles.addressPickerButton}
              >
                <Text style={styles.addressPickerText}>
                  {address ? address : '지역을 선택해주세요'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Button 
              title="다음" 
              onPress={handleNext} 
              style={styles.nextButton}
              textStyle={styles.nextButtonText}
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

      {/* 지역 선택 모달 */}
      <Modal
        visible={showAddressPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddressPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>지역 선택</Text>
              <TouchableOpacity onPress={() => setShowAddressPicker(false)}>
                <Text style={styles.modalCloseText}>닫기</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={koreanRegions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.regionItem}
                  onPress={() => {
                    setAddress(item);
                    setShowAddressPicker(false);
                  }}
                >
                  <Text style={[
                    styles.regionItemText,
                    address === item && styles.selectedRegionText
                  ]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#F0F4FF',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    width: '66.66%',
    height: '100%',
    backgroundColor: '#5E72E4',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: 24,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  placeholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#718096',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  removeButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#F56565',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F56565',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  removeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
  },
  inputField: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
  },
  genderButtonSelected: {
    backgroundColor: '#5E72E4',
    borderColor: '#5E72E4',
    shadowColor: '#5E72E4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  genderText: {
    color: '#718096',
    fontSize: 14,
    fontWeight: '600',
  },
  genderTextSelected: {
    color: 'white',
  },
  datePickerButton: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
  },
  datePickerText: {
    color: '#2D3748',
    fontSize: 14,
  },
  addressPickerButton: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
  },
  addressPickerText: {
    color: '#2D3748',
    fontSize: 14,
  },
  buttonContainer: {
    marginTop: 16,
  },
  nextButton: {
    backgroundColor: '#5E72E4',
    height: 56,
    borderRadius: 12,
    shadowColor: '#5E72E4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  backButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  backButtonText: {
    color: '#718096',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#5E72E4',
    fontWeight: '600',
  },
  regionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  regionItemText: {
    fontSize: 16,
    color: '#2D3748',
  },
  selectedRegionText: {
    color: '#5E72E4',
    fontWeight: 'bold',
  },
});

export default SignupStep2Screen;