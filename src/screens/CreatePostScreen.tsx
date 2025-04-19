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
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createVotePost } from '../api/post';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../types/TabParam';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SERVER_URL } from '../constant/config';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

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
  const [step, setStep] = useState(1);
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

  const validateStep1 = () => {
    if (!title.trim()) {
      Alert.alert('입력 필요', '제목을 입력해주세요');
      return false;
    }
    if (!content.trim()) {
      Alert.alert('입력 필요', '내용을 입력해주세요');
      return false;
    }
    if (!categoryId) {
      Alert.alert('입력 필요', '카테고리를 선택해주세요');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (options.some(opt => !opt.text.trim())) {
      Alert.alert('입력 필요', '모든 옵션을 입력해주세요');
      return false;
    }
    if (optionType === 'image' && options.some(opt => !opt.image)) {
      Alert.alert('입력 필요', '모든 옵션의 이미지를 선택해주세요');
      return false;
    }
    if (finishTime <= new Date()) {
      Alert.alert('마감일 오류', '마감일은 현재 시간보다 미래여야 합니다');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handlePrevStep = () => {
    setStep(1);
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    if (!categoryId) {
      Alert.alert('입력 필요', '카테고리를 선택해주세요');
      return;
    }

    try {
      const data = {
        categoryId: categoryId as number,
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
      setStep(1);

      Alert.alert('작성 완료', `게시물 ID: ${result.postId}`, [
        { text: '확인', onPress: () => navigation.navigate('홈') },
      ]);
    } catch {
      Alert.alert('작성 실패', '게시물 작성 중 오류 발생');
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: step === 1 ? '50%' : '100%' }]} />
      </View>
      <View style={styles.stepTextContainer}>
        <Text style={[styles.stepText, step === 1 && styles.activeStepText]}>STEP 1</Text>
        <Text style={[styles.stepText, step === 2 && styles.activeStepText]}>STEP 2</Text>
      </View>
    </View>
  );

  const renderStep1 = () => (
    <Animated.View 
      entering={FadeIn.duration(300)}
      style={styles.stepContainer}
    >
      <View style={styles.inputGroup}>
        <Text style={styles.label}>제목</Text>
        <TextInput 
          value={title} 
          onChangeText={setTitle} 
          style={styles.input} 
          placeholder="제목을 입력하세요" 
          placeholderTextColor="#A0AEC0"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>내용</Text>
        <TextInput 
          value={content} 
          onChangeText={setContent} 
          multiline 
          style={[styles.input, styles.contentInput]} 
          placeholder="내용을 입력하세요" 
          placeholderTextColor="#A0AEC0"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>게시글 이미지</Text>
        <View style={styles.imageUploadContainer}>
          <TouchableOpacity
            onPress={handleSelectImage}
            style={styles.imageUploadButton}
          >
            <Feather name="image" size={24} color="#FFFFFF" />
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
      </View>

      <View style={styles.inputGroup}>
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
      </View>

      <TouchableOpacity
        style={styles.nextButton}
        onPress={handleNextStep}
      >
        <Text style={styles.nextButtonText}>다음</Text>
        <Feather name="arrow-right" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View 
      entering={FadeInRight.duration(300)}
      style={styles.stepContainer}
    >
      <View style={styles.inputGroup}>
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
            <Feather 
              name="type" 
              size={20} 
              color={optionType === 'text' ? "#FFFFFF" : "#4A5568"} 
            />
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
            <Feather 
              name="image" 
              size={20} 
              color={optionType === 'image' ? "#FFFFFF" : "#4A5568"} 
            />
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
      </View>

      <View style={styles.inputGroup}>
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
                  <Feather name="trash-2" size={16} color="#E53E3E" />
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
              placeholderTextColor="#A0AEC0"
            />

            {optionType === 'image' && (
              <View style={styles.imageOptionContainer}>
                <TouchableOpacity
                  onPress={() => handleSelectOptionImage(i)}
                  style={styles.imageUploadButton}
                >
                  <Feather name="image" size={20} color="#FFFFFF" />
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
            <Feather name="plus-circle" size={20} color="#4A5568" />
            <Text style={styles.addOptionText}>옵션 추가</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>마감일</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Feather name="calendar" size={20} color="#4A5568" />
          <Text style={styles.dateButtonText}>마감일 선택</Text>
        </TouchableOpacity>
        <Text style={styles.dateText}>
          {finishTime.toLocaleString()}
        </Text>
      </View>

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

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.prevButton}
          onPress={handlePrevStep}
        >
          <Feather name="arrow-left" size={20} color="#4A5568" />
          <Text style={styles.prevButtonText}>이전</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitText}>작성하기</Text>
          <Feather name="check" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#2D3748" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>투표 만들기</Text>
        <View style={styles.headerRight} />
      </View>

      {renderStepIndicator()}

      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {step === 1 ? renderStep1() : renderStep2()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
  },
  headerRight: {
    width: 40,
  },
  stepIndicatorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  progressBar: {
    height: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: 1.5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1499D9',
    borderRadius: 1.5,
  },
  stepTextContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
  },
  stepText: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
  },
  activeStepText: {
    color: '#1499D9',
  },
  container: {
    padding: 16,
  },
  stepContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
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
    fontSize: 15,
    backgroundColor: '#F7FAFC',
    color: '#2D3748',
  },
  contentInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  optionTypeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  optionTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  optionTypeButtonSelected: {
    backgroundColor: '#1499D9',
    borderColor: '#1499D9',
  },
  optionTypeText: {
    fontSize: 14,
    color: '#4A5568',
  },
  optionTypeTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  optionContainer: {
    marginBottom: 12,
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
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5568',
  },
  removeButton: {
    padding: 4,
  },
  optionInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    color: '#2D3748',
  },
  imageOptionContainer: {
    marginTop: 8,
    gap: 8,
  },
  imageUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1499D9',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  imageUploadText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  optionImage: {
    width: '100%',
    height: 320,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  addOptionText: {
    color: '#4A5568',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedCategoryButton: {
    backgroundColor: '#1499D9',
    borderColor: '#1499D9',
  },
  categoryButtonText: {
    color: '#4A5568',
    fontSize: 13,
  },
  selectedCategoryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  dateButtonText: {
    color: '#4A5568',
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    textAlign: 'center',
    color: '#4A5568',
    marginTop: 6,
    fontSize: 13,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  prevButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  prevButtonText: {
    color: '#4A5568',
    fontSize: 14,
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1499D9',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1499D9',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  imageUploadContainer: {
    gap: 8,
  },
  postImage: {
    width: '100%',
    height: 320,
    borderRadius: 8,
    resizeMode: 'cover',
  },
});

export default CreatePostScreen;
