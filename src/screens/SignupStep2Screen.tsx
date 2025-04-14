import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, Image, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import InputField from '../components/InputField';
import Button from '../components/Button';
import { signup } from '../api/auth';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { SignupRequest } from '../types/Auth';
import { SERVER_URL } from '../constant/config';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'SignupStep2Screen'>;
  route: RouteProp<RootStackParamList, 'SignupStep2Screen'>;
};

const SignupStep2Screen: React.FC<Props> = ({ navigation, route }) => {
  const { userData } = route.params;
  const [userDataState, setUserData] = useState({ ...userData });
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState(new Date());
  const [gender, setGender] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);

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

    const profileImage = userDataState.profileImage || 'default.jpg';

    navigation.navigate('SignupStep3Screen', {
      userData: {
        ...userDataState,
        name,
        gender,
        birthdate: birthdate.toISOString().split('T')[0],
        profileImage,
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>2단계: 프로필 입력</Text>

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
                <Text style={styles.removeText}>X</Text>
            </TouchableOpacity>
            </View>
        ) : (
            <View style={styles.placeholder}>
            <Text style={{ color: '#666' }}>이미지 선택</Text>
            </View>
        )}
        </TouchableOpacity>

      <InputField placeholder="이름" value={name} onChangeText={setName} />

      <Text style={styles.label}>성별</Text>
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

      <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.birthdateButton}>
        <Text>생년월일: {birthdate.toLocaleDateString()}</Text>
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

      <Button title="다음" onPress={handleNext} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginVertical: 20 },
  imageContainer: { marginBottom: 30, alignItems: 'center' },
  image: { width: 120, height: 120, borderRadius: 60 },
  placeholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: { fontWeight: 'bold', marginTop: 10 },
  genderContainer: { flexDirection: 'row', marginVertical: 10 },
  genderButton: { padding: 10, marginHorizontal: 10, borderRadius: 20, borderWidth: 1 },
  genderButtonSelected: { backgroundColor: '#007bff', borderColor: '#007bff' },
  genderText: { color: '#000' },
  genderTextSelected: { color: '#fff' },
  birthdateButton: { marginTop: 10, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 10 },
  removeButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#ff4d4d',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  removeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  
});

export default SignupStep2Screen;
