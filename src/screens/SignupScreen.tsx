import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import InputField from '../components/InputField';
import Button from '../components/Button';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { UserData } from '../types/UserData';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Signup'>;
};

const SERVER_URL = 'http://localhost:8080';

const SignupScreen: React.FC<Props> = ({ navigation }) => {
  const [userData, setUserData] = useState<UserData>({
    username: '',
    password: '',
    name: '',
    gender: '',
    phone: '',
    birthdate: '',
    address: '',
    introduction: '',
    profileImage: '',
  });

  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('갤러리 접근 권한이 필요합니다!');
      }
    })();
  }, []);

  const handleChange = (key: keyof UserData, value: string) => {
    setUserData(prev => ({ ...prev, [key]: value }));
  };

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

        // 이미지 서버에 업로드
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

        const imageUrl = await response.text(); // 예: "/image/uuid.jpg"
        setUserData(prev => ({ ...prev, profileImage: imageUrl }));
      }
    } catch (e) {
      console.log('이미지 업로드 실패:', e);
      Alert.alert('이미지 업로드 실패', '프로필 이미지 업로드 중 오류가 발생했습니다.');
    }
  };

  const handleNext = () => {
    navigation.navigate('CategorySelection', { userData });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>회원가입</Text>

      {/* 프로필 이미지 */}
      <TouchableOpacity onPress={handleImageSelect} style={styles.imageContainer}>
        {profileImagePreview ? (
          <Image source={{ uri: profileImagePreview }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={{ color: '#666' }}>이미지 선택</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* 입력 필드 */}
      <View style={styles.form}>
        {(Object.keys(userData) as (keyof UserData)[])
          .filter(key => !['gender', 'birthdate', 'profileImage'].includes(key))
          .map(key => (
            <InputField
              key={key}
              placeholder={key}
              value={userData[key]}
              onChangeText={(value: string) => handleChange(key, value)}
              secureTextEntry={key === 'password'}
            />
          ))}

        <Button title="다음" onPress={handleNext} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center', // 수직 중앙 정렬
    alignItems: 'center',     // 수평 중앙 정렬
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  imageContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  placeholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 300,
    gap: 12,
  },
});

export default SignupScreen;
