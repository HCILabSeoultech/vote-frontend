import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  Alert,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createVotePost } from '../api/post';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../types/TabParam';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SERVER_URL } from '../constant/config';

const categories = [
  { id: 1, name: '운동' },
  { id: 2, name: '음식' },
  { id: 3, name: '패션' },
  { id: 4, name: '여행' },
  { id: 5, name: '정치' },
  { id: 6, name: '기술' },
];

const CreatePostScreen: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [finishTime, setFinishTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();

  const handleSelectImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('권한 필요', '사진을 업로드하려면 갤러리 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      const image = result.assets[0];
      const uri = image.uri;

      const formData = new FormData();
      formData.append('file', {
        uri,
        name: 'image.jpg',
        type: 'image/jpeg',
      } as any);

      try {
        const uploadRes = await fetch(`${SERVER_URL}/image/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        });

        const imageUrlRes = await uploadRes.text();
        setImageUrl(imageUrlRes);
      } catch (err) {
        Alert.alert('이미지 업로드 실패');
      }
    }
  };

  const handleSubmit = async () => {
    if (!categoryId) {
      Alert.alert('카테고리를 선택해주세요');
      return;
    }

    const filledOptions = options.filter(opt => opt.trim() !== '');
    if (filledOptions.length < 2) {
      Alert.alert('옵션을 두 개 이상 입력해주세요');
      return;
    }

    try {
      const data = {
        categoryId,
        title,
        content,
        finishTime: finishTime.toISOString(),
        options: filledOptions,
        imageUrls: imageUrl ? [imageUrl] : [],
      };

      const result = await createVotePost(data);

      setTitle('');
      setContent('');
      setOptions(['', '']);
      setCategoryId(null);
      setImageUrl(null);
      setFinishTime(new Date());

      Alert.alert('작성 완료', `게시물 ID: ${result.postId}`, [
        {
          text: '확인',
          onPress: () => navigation.navigate('홈'),
        },
      ]);
    } catch {
      Alert.alert('작성 실패', '게시물 작성 중 오류 발생');
    }
  };

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      Alert.alert('옵션은 최소 2개 이상 필요합니다.');
      return;
    }
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>제목</Text>
        <TextInput placeholder="제목을 입력하세요" value={title} onChangeText={setTitle} style={styles.input} />

        <Text style={styles.label}>내용</Text>
        <TextInput
          placeholder="내용을 입력하세요"
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={4}
          style={[styles.input, { height: 100 }]}
        />

        <Text style={styles.label}>투표 옵션</Text>
        {options.map((opt, index) => (
          <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <TextInput
              placeholder={`옵션 ${index + 1}`}
              value={opt}
              onChangeText={(value) => handleOptionChange(index, value)}
              style={[styles.input, { flex: 1, marginRight: 8 }]}
            />
            {options.length > 2 && (
              <TouchableOpacity onPress={() => handleRemoveOption(index)}>
                <Text style={{ fontSize: 18, color: 'red' }}>❌</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity style={styles.addOptionButton} onPress={handleAddOption}>
          <Text style={styles.addOptionText}>➕ 옵션 추가</Text>
        </TouchableOpacity>

        <Text style={styles.label}>카테고리 선택</Text>
        <View style={styles.categoryWrapper}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryButton, categoryId === cat.id && styles.selected]}
              onPress={() => setCategoryId(cat.id)}
            >
              <Text style={categoryId === cat.id ? styles.selectedText : styles.unselectedText}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>마감일</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateButtonText}>📅 마감일 선택</Text>
        </TouchableOpacity>

        <Text style={styles.centeredText}>{finishTime.toLocaleString()}</Text>
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

        <Text style={styles.label}>이미지 첨부</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={handleSelectImage}>
          <Text style={styles.uploadButtonText}>🖼 이미지 선택</Text>
        </TouchableOpacity>

        {imageUrl && (
          <Image source={{ uri: `${SERVER_URL}${imageUrl}` }} style={styles.image} />
        )}

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>투표 생성</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 30,
    paddingVertical: 5,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 1,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  categoryWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 1,
  },
  categoryButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#eee',
    margin: 4,
  },
  selected: {
    backgroundColor: '#007bff',
  },
  selectedText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  unselectedText: {
    color: '#333',
  },
  dateButton: {
    padding: 10,
    backgroundColor: '#eee',
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 2,
  },
  dateButtonText: {
    fontSize: 14,
  },
  uploadButton: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 1,
  },
  uploadButtonText: {
    fontSize: 14,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    resizeMode: 'cover',
    marginBottom: 10,
  },
  centeredText: {
    textAlign: 'center',
    marginVertical: 8,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#007bff',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 10,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addOptionButton: {
    alignItems: 'center',
    marginVertical: 10,
  },
  addOptionText: {
    fontSize: 14,
    color: '#007bff',
  },
});

export default CreatePostScreen;
