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
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [finishTime, setFinishTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();

  const handleSelectMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('권한 필요', '미디어 업로드를 위해 갤러리 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];

      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.type === 'video' ? 'video.mp4' : 'image.jpg',
        type: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
      } as any);

      try {
        const uploadRes = await fetch(`${SERVER_URL}/image/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        });

        const uploadedUrl = await uploadRes.text();
        setMediaUrl(uploadedUrl);
      } catch (err) {
        Alert.alert('업로드 실패', '파일 업로드 중 오류 발생');
      }
    }
  };

  const handleSubmit = async () => {
    if (!categoryId) return Alert.alert('카테고리를 선택해주세요');

    const filledOptions = options.filter(opt => opt.trim() !== '');
    if (filledOptions.length < 2) return Alert.alert('옵션은 두 개 이상 입력해주세요');

    try {
      const data = {
        categoryId,
        title,
        content,
        finishTime: finishTime.toISOString(),
        options: filledOptions,
        imageUrls: mediaUrl ? [mediaUrl] : [],
      };

      const result = await createVotePost(data);

      setTitle('');
      setContent('');
      setOptions(['', '']);
      setCategoryId(null);
      setMediaUrl(null);
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>제목</Text>
        <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="제목을 입력하세요" />

        <Text style={styles.label}>내용</Text>
        <TextInput value={content} onChangeText={setContent} multiline style={[styles.input, { height: 100 }]} placeholder="내용을 입력하세요" />

        <Text style={styles.label}>투표 옵션</Text>
        {options.map((opt, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <TextInput
              value={opt}
              onChangeText={val => {
                const newOpts = [...options];
                newOpts[i] = val;
                setOptions(newOpts);
              }}
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              placeholder={`옵션 ${i + 1}`}
            />
            {options.length > 2 && (
              <TouchableOpacity onPress={() => setOptions(prev => prev.filter((_, idx) => idx !== i))}>
                <Text style={{ fontSize: 18, color: 'red' }}>❌</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity style={styles.addOptionButton} onPress={() => setOptions([...options, ''])}>
          <Text style={styles.addOptionText}>➕ 옵션 추가</Text>
        </TouchableOpacity>

        <Text style={styles.label}>카테고리 선택</Text>
        <View style={styles.categoryWrapper}>
          {categories.map(cat => (
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

        <Text style={styles.label}>미디어 첨부</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={handleSelectMedia}>
          <Text style={styles.uploadButtonText}>🖼/🎥 이미지 또는 영상 선택</Text>
        </TouchableOpacity>
        {mediaUrl && (
          <Image source={{ uri: `${SERVER_URL}${mediaUrl}` }} style={styles.image} />
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