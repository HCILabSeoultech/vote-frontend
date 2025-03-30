import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Image,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createVotePost } from '../api/post';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../types/TabParam';

const SERVER_URL = 'http://localhost:8080';

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
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
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

    try {
      const data = {
        categoryId,
        title,
        content,
        finishTime: finishTime.toISOString(),
        options: [option1, option2],
        imageUrls: imageUrl ? [imageUrl] : [],
      };

      const result = await createVotePost(data);

      setTitle('');
      setContent('');
      setOption1('');
      setOption2('');
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

  return (
    <View style={styles.container}>
      <TextInput placeholder="제목" value={title} onChangeText={setTitle} style={styles.input} />
      <TextInput placeholder="내용" value={content} onChangeText={setContent} style={styles.input} />
      <TextInput placeholder="옵션1" value={option1} onChangeText={setOption1} style={styles.input} />
      <TextInput placeholder="옵션2" value={option2} onChangeText={setOption2} style={styles.input} />

      <View style={styles.categoryWrapper}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryButton,
              categoryId === cat.id && styles.selected,
            ]}
            onPress={() => setCategoryId(cat.id)}
          >
            <Text>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Button title="마감일 선택" onPress={() => setShowDatePicker(true)} />
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

      <Text style={styles.centeredText}>마감일: {finishTime.toLocaleString()}</Text>

      {/* 이미지 선택 버튼 */}
      <Button title="이미지 선택" onPress={handleSelectImage} />

      {/* 미리보기 이미지 바로 아래에 출력 */}
      {imageUrl && (
        <Image
          source={{ uri: `${SERVER_URL}${imageUrl}` }}
          style={styles.image}
        />
      )}

      {/* 투표 생성 버튼 */}
      <Button title="투표 생성" onPress={handleSubmit} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center', // 수직 가운데
    alignItems: 'center',     // 수평 가운데
    padding: 20,
    backgroundColor: '#fff',
  },
  categoryWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
    margin: 4,
  },
  selected: {
    backgroundColor: '#add8e6',
  },
  input: {
    borderWidth: 1,
    marginVertical: 5,
    padding: 10,
    borderRadius: 5,
    width: '100%',
  },
  image: {
    width: 300,
    height: 200,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  centeredText: {
    textAlign: 'center',
    marginVertical: 8,
    fontWeight: '600',
  },
});

export default CreatePostScreen;
