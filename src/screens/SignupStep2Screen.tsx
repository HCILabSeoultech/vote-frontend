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
  FlatList,
  ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import ImageCropPicker from 'react-native-image-crop-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import InputField from '../components/InputField';
import Button from '../components/Button';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { SERVER_URL, IMAGE_BASE_URL } from '../constant/config';

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
  const [tempBirthdate, setTempBirthdate] = useState(new Date());
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('갤러리 접근 권한이 필요합니다!');
      }
    })();
  }, []);

  const deleteImageFromS3 = async (imageUrl: string) => {
    try {
      await fetch(`${SERVER_URL}/image/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: imageUrl }),
      });
    } catch (err) {
      // 에러는 무시 (필수 아님)
    }
  };

  const handleImageSelect = async () => {
    try {
      const image = await ImageCropPicker.openPicker({
        width: 300,
        height: 300,
        cropping: true,
        cropperCircleOverlay: true,
        mediaType: 'photo',
        compressImageQuality: 0.8,
      });

      if (image) {
        setIsUploading(true);
        if (userDataState.profileImage && userDataState.profileImage !== 'default.jpg') {
          await deleteImageFromS3(userDataState.profileImage);
        }
        setProfileImagePreview(image.path);

        const formData = new FormData();
        formData.append('file', {
          uri: image.path,
          name: 'profile.jpg',
          type: image.mime,
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
    } catch (e: any) {
      if (e.message !== 'User cancelled image selection') {
        Alert.alert('이미지 업로드 실패', '프로필 이미지 업로드 중 오류가 발생했습니다.');
      }
    } finally {
      setIsUploading(false);
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

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempBirthdate(selectedDate);
    }
  };

  const handleDateConfirm = () => {
    setBirthdate(tempBirthdate);
    setShowDatePicker(false);
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
            <Text style={styles.subtitle}>회원님의 기본 정보를 입력해주세요</Text>
          </View>

          <View style={styles.formContainer}>
            <TouchableOpacity onPress={handleImageSelect} style={styles.imageContainer}>
              {profileImagePreview ? (
                <View>
                  <Image 
                    source={{ 
                      uri: userDataState.profileImage 
                        ? (userDataState.profileImage.includes('votey-image.s3.ap-northeast-2.amazonaws.com')
                            ? userDataState.profileImage.replace('https://votey-image.s3.ap-northeast-2.amazonaws.com', IMAGE_BASE_URL)
                            : userDataState.profileImage.startsWith('http')
                              ? userDataState.profileImage
                              : `${IMAGE_BASE_URL}${userDataState.profileImage}`)
                        : `${IMAGE_BASE_URL}/images/default.png`
                    }} 
                    style={styles.image} 
                  />
                  {isUploading && (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="large" color="#1499D9" />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={async () => {
                      if (userDataState.profileImage && userDataState.profileImage !== 'default.jpg') {
                        await deleteImageFromS3(userDataState.profileImage);
                      }
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
                <View style={styles.datePickerContainer}>
                  <DateTimePicker
                    value={tempBirthdate}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                  />
                  <View style={styles.datePickerButtons}>
                    <TouchableOpacity 
                      style={styles.datePickerCancelButton} 
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={styles.datePickerCancelText}>취소</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.datePickerConfirmButton} 
                      onPress={handleDateConfirm}
                    >
                      <Text style={styles.datePickerConfirmText}>확인</Text>
                    </TouchableOpacity>
                  </View>
                </View>
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
    width: '66.66%',
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
  imageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F7FAFC',
  },
  placeholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#A0AEC0',
    fontSize: 10,
    textAlign: 'center',
    paddingHorizontal: 10,
    letterSpacing: 0.5,
  },
  removeButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF5252',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
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
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
    elevation: 0,
    shadowColor: 'transparent',
  },
  genderButtonSelected: {
    backgroundColor: '#1499D9',
    borderColor: '#1499D9',
  },
  genderText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  genderTextSelected: {
    color: 'white',
  },
  datePickerButton: {
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  datePickerText: {
    color: '#1A202C',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  addressPickerButton: {
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  addressPickerText: {
    color: '#1A202C',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  buttonContainer: {
    marginTop: 8,
  },
  nextButton: {
    backgroundColor: '#1499D9',
    height: 48,
    borderRadius: 12,
    elevation: 0,
    shadowColor: 'transparent',
  },
  nextButtonText: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
    letterSpacing: 0.5,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#1499D9',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  regionItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  regionItemText: {
    fontSize: 16,
    color: '#1A202C',
    letterSpacing: 0.5,
  },
  selectedRegionText: {
    color: '#1499D9',
    fontWeight: 'bold',
  },
  datePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  datePickerCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
  },
  datePickerCancelText: {
    color: '#718096',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  datePickerConfirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1499D9',
  },
  datePickerConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
  },
});

export default SignupStep2Screen;