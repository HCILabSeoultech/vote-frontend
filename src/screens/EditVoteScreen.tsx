import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getVoteById, updateVotePost } from '../api/post';
import * as ImagePicker from 'expo-image-picker';
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

type EditVoteScreenRouteProp = RouteProp<RootStackParamList, 'EditVoteScreen'>;
type EditVoteScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EditVoteScreen'>;

const EditVoteScreen = () => {
  const route = useRoute<EditVoteScreenRouteProp>();
  const navigation = useNavigation<EditVoteScreenNavigationProp>();
  const { voteId } = route.params;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [finishTime, setFinishTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const fetchVote = async () => {
      try {
        const data = await getVoteById(voteId);
        setTitle(data.title);
        setContent(data.content);
        setOptions(data.voteOptions.map((opt: any) => opt.content));
        setCategoryId(data.categoryId);
        setImageUrl(data.images.length > 0 ? data.images[0].imageUrl : null);
        setFinishTime(new Date(data.finishTime));
      } catch (err) {
        Alert.alert('불러오기 실패', '게시글 정보를 가져오는 중 오류 발생');
      }
    };
    fetchVote();
  }, [voteId]);

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleAddOption = () => {
    setOptions([...options, '']);
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
    try {
      const filledOptions = options.filter((opt) => opt.trim() !== '');
      const updateData = {
        title,
        content,
        categoryId,
        finishTime: finishTime.toISOString(),
        options: filledOptions,
        imageUrls: imageUrl ? [imageUrl] : [],
      };
      await updateVotePost(voteId, updateData);
      Alert.alert('수정 완료', '게시물이 수정되었습니다.', [
        {
          text: '확인',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch {
      Alert.alert('수정 실패', '게시글 수정 중 오류 발생');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={styles.container}>

        <Text style={styles.label}>제목</Text>
        <TextInput value={title} onChangeText={setTitle} style={styles.input} />

        <Text style={styles.label}>내용</Text>
        <TextInput
          value={content}
          onChangeText={setContent}
          style={[styles.input, { height: 100 }]}
          multiline
        />

        <Text style={styles.label}>투표 옵션</Text>
        {options.map((opt, idx) => (
          <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <TextInput
              value={opt}
              onChangeText={(val) => handleOptionChange(idx, val)}
              style={[styles.input, { flex: 1, marginRight: 8 }]}
            />
            {options.length > 2 && (
              <TouchableOpacity onPress={() => handleRemoveOption(idx)}>
                <Text style={{ fontSize: 18, color: 'red' }}>❌</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity onPress={handleAddOption} style={styles.addOptionButton}>
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
              <Text style={categoryId === cat.id ? styles.selectedText : styles.unselectedText}>
                {cat.name}
              </Text>
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

        <Text style={styles.label}>이미지</Text>
        <TouchableOpacity style={styles.dateButton} onPress={handleSelectImage}>
          <Text style={styles.dateButtonText}>🖼 이미지 선택</Text>
        </TouchableOpacity>
        {imageUrl && (
          <Image source={{ uri: `${SERVER_URL}${imageUrl}` }} style={styles.image} />
        )}

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>수정 완료</Text>
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

export default EditVoteScreen;
