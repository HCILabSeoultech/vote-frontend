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

const formatToLocalDateTimeString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  const millisecond = String(date.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${millisecond}`;
};


const CreatePostScreen: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [finishTime, setFinishTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [options, setOptions] = useState<{ text: string; image: string | null }[]>([
    { text: '', image: null },
    { text: '', image: null },
  ]);
  const [optionType, setOptionType] = useState<'text' | 'image'>('text');
  const [maxOptions, setMaxOptions] = useState(4);

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

  const handleSelectOptionImage = async (index: number) => {
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
        name: 'option.jpg',
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
        const newOptions = [...options];
        newOptions[index].image = imageUrlRes;
        setOptions(newOptions);
      } catch {
        Alert.alert('옵션 이미지 업로드 실패');
      }
    }
  };

  const handleAddOption = () => {
    if (options.length >= maxOptions) {
      Alert.alert('옵션 제한', `옵션은 최대 ${maxOptions}개까지 추가할 수 있습니다.`);
      return;
    }
    setOptions([...options, { text: '', image: null }]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      Alert.alert('옵션 제한', '옵션은 최소 2개 이상 필요합니다.');
      return;
    }
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('입력 필요', '제목을 입력해주세요');
      return;
    }
    if (!content.trim()) {
      Alert.alert('입력 필요', '내용을 입력해주세요');
      return;
    }
    if (!categoryId) {
      Alert.alert('입력 필요', '카테고리를 선택해주세요');
      return;
    }
    if (options.some(opt => !opt.text.trim())) {
      Alert.alert('입력 필요', '모든 옵션을 입력해주세요');
      return;
    }
    if (optionType === 'image' && options.some(opt => !opt.image)) {
      Alert.alert('입력 필요', '모든 옵션의 이미지를 선택해주세요');
      return;
    }
    if (finishTime <= new Date()) {
      Alert.alert('마감일 오류', '마감일은 현재 시간보다 미래여야 합니다');
      return;
    }

    try {
      const data = {
        categoryId,
        title,
        content,
        finishTime: formatToLocalDateTimeString(finishTime),
        options: options.map(opt => ({
          content: opt.text,
          optionImage: opt.image || null,
        })),
        imageUrls: imageUrl ? [imageUrl] : [],
      };

      const result = await createVotePost(data);

      setTitle('');
      setContent('');
      setOptions([{ text: '', image: null }, { text: '', image: null }]);
      setCategoryId(null);
      setImageUrl(null);
      setFinishTime(new Date());

      Alert.alert('작성 완료', `게시물 ID: ${result.postId}`, [
        { text: '확인', onPress: () => navigation.navigate('홈') },
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

        <Text style={styles.label}>게시글 이미지</Text>
        <View style={styles.imageUploadContainer}>
          <TouchableOpacity
            onPress={handleSelectImage}
            style={styles.imageUploadButton}
          >
            <Text style={styles.imageUploadText}>
              {imageUrl ? '이미지 변경' : '이미지 선택'}
            </Text>
          </TouchableOpacity>
          {imageUrl && (
            <Image
              source={{ uri: `${SERVER_URL}${imageUrl}` }}
              style={styles.postImage}
            />
          )}
        </View>

        <Text style={styles.label}>옵션 타입 선택</Text>
        <View style={styles.optionTypeContainer}>
          <TouchableOpacity
            style={[
              styles.optionTypeButton,
              optionType === 'text' && styles.optionTypeButtonSelected,
            ]}
            onPress={() => {
              setOptionType('text');
              setOptions(options.map(opt => ({ ...opt, image: null })));
            }}
          >
            <Text
              style={[
                styles.optionTypeText,
                optionType === 'text' && styles.optionTypeTextSelected,
              ]}
            >
              텍스트
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.optionTypeButton,
              optionType === 'image' && styles.optionTypeButtonSelected,
            ]}
            onPress={() => setOptionType('image')}
          >
            <Text
              style={[
                styles.optionTypeText,
                optionType === 'image' && styles.optionTypeTextSelected,
              ]}
            >
              텍스트 + 이미지
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>투표 옵션</Text>
        {options.map((opt, i) => (
          <View key={i} style={styles.optionContainer}>
            <View style={styles.optionHeader}>
              <Text style={styles.optionNumber}>옵션 {i + 1}</Text>
              {options.length > 2 && (
                <TouchableOpacity
                  onPress={() => handleRemoveOption(i)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeButtonText}>삭제</Text>
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              value={opt.text}
              onChangeText={val => {
                const newOpts = [...options];
                newOpts[i].text = val;
                setOptions(newOpts);
              }}
              style={styles.optionInput}
              placeholder="옵션 내용을 입력하세요"
            />

            {optionType === 'image' && (
              <View style={styles.imageOptionContainer}>
                <TouchableOpacity
                  onPress={() => handleSelectOptionImage(i)}
                  style={styles.imageUploadButton}
                >
                  <Text style={styles.imageUploadText}>
                    {opt.image ? '이미지 변경' : '이미지 선택'}
                  </Text>
                </TouchableOpacity>
                {opt.image && (
                  <Image
                    source={{ uri: `${SERVER_URL}${opt.image}` }}
                    style={styles.optionImage}
                  />
                )}
              </View>
            )}
          </View>
        ))}

        {options.length < maxOptions && (
          <TouchableOpacity
            style={styles.addOptionButton}
            onPress={handleAddOption}
          >
            <Text style={styles.addOptionText}>➕ 옵션 추가</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>카테고리 선택</Text>
        <View style={styles.categoryContainer}>
          {categories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                categoryId === category.id && styles.selectedCategoryButton,
              ]}
              onPress={() => setCategoryId(category.id)}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  categoryId === category.id && styles.selectedCategoryButtonText,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>마감일</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateButtonText}>📅 마감일 선택</Text>
        </TouchableOpacity>
        <Text style={styles.centeredText}>
          {finishTime.toLocaleString()}
        </Text>

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

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitText}>작성하기</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2D3748',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#F7FAFC',
  },
  optionTypeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  optionTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  optionTypeButtonSelected: {
    backgroundColor: '#5E72E4',
    borderColor: '#5E72E4',
  },
  optionTypeText: {
    fontSize: 16,
    color: '#4A5568',
  },
  optionTypeTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  optionContainer: {
    marginBottom: 16,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  removeButton: {
    padding: 4,
  },
  removeButtonText: {
    color: '#E53E3E',
    fontSize: 14,
  },
  optionInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  imageOptionContainer: {
    gap: 12,
  },
  imageUploadButton: {
    backgroundColor: '#5E72E4',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  imageUploadText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  optionImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  addOptionButton: {
    backgroundColor: '#F7FAFC',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addOptionText: {
    color: '#4A5568',
    fontSize: 16,
    fontWeight: '600',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedCategoryButton: {
    backgroundColor: '#5E72E4',
    borderColor: '#5E72E4',
  },
  categoryButtonText: {
    color: '#4A5568',
    fontSize: 14,
  },
  selectedCategoryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dateButton: {
    backgroundColor: '#F7FAFC',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateButtonText: {
    color: '#4A5568',
    fontSize: 16,
    fontWeight: '600',
  },
  centeredText: {
    textAlign: 'center',
    color: '#4A5568',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#5E72E4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  imageUploadContainer: {
    marginBottom: 16,
    gap: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
});

export default CreatePostScreen;
