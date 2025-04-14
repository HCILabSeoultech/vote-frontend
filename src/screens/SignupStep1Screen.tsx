import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import InputField from '../components/InputField';
import Button from '../components/Button';
import { checkUsernameDuplicate } from '../api/auth';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'SignupStep1Screen'>;
};

const SignupStep1Screen: React.FC<Props> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const usernameRegex = /^[a-z0-9]{6,15}$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

  const handleCheckDuplicate = async () => {
    if (!usernameRegex.test(username)) {
      setErrorMessage('아이디는 소문자와 숫자로 구성되며 6~15자여야 합니다.');
      setIsChecked(false);
      return;
    }

    try {
      const isAvailable = await checkUsernameDuplicate(username);
      if (isAvailable) {
        setIsChecked(true);
        setErrorMessage('사용 가능한 아이디입니다!');
      } else {
        setIsChecked(false);
        setErrorMessage('이미 존재하는 아이디입니다.');
      }
    } catch {
      setErrorMessage('중복 확인 실패: 서버 오류');
    }
  };

  const handleNext = () => {
    if (!isChecked) {
      setErrorMessage('아이디 중복 확인을 해주세요.');
      return;
    }

    if (!passwordRegex.test(password)) {
      setErrorMessage('비밀번호는 영문 대소문자, 숫자, 특수문자를 포함한 8자 이상이어야 합니다.');
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 성공
    navigation.navigate('SignupStep2Screen', {
      userData: { username, password },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>1단계: 아이디 & 비밀번호</Text>

      <InputField
        placeholder="아이디"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Button title="아이디 중복 확인" onPress={handleCheckDuplicate} />

      <InputField
        placeholder="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="off"
        textContentType="oneTimeCode"
        importantForAutofill="no"
      />
      <InputField
        placeholder="비밀번호 확인"
        value={passwordConfirm}
        onChangeText={setPasswordConfirm}
        secureTextEntry
        autoComplete="off"
        textContentType="oneTimeCode"
        importantForAutofill="no"
      />

      {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

      <Button title="다음" onPress={handleNext} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  errorText: { color: 'red', marginTop: 10, textAlign: 'center' },
});

export default SignupStep1Screen;
