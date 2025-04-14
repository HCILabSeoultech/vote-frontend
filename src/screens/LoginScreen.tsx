import React, { useState } from 'react';
import { View, Text, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import InputField from '../components/InputField';
import Button from '../components/Button';
import { login } from '../api/auth';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Login'>;
};

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      await login({ username, password });
      Alert.alert("로그인 성공", "메인 페이지로 이동합니다.");
      navigation.navigate('Main');
    } catch (error) {
      Alert.alert("로그인 실패", "아이디 또는 비밀번호가 잘못되었습니다.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>로그인</Text>
      <View style={styles.form}>
        <InputField placeholder="아이디" value={username} onChangeText={setUsername} />
        <InputField placeholder="비밀번호" value={password} onChangeText={setPassword} secureTextEntry />
        <Button title="로그인" onPress={handleLogin} />
      </View>
      <TouchableOpacity onPress={() => navigation.navigate('SignupStep1Screen')}>
        <Text style={styles.link}>회원가입</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  form: {
    width: 280, // 고정 너비
    gap: 3, // RN 최신 버전에서 지원, 아니면 marginBottom 사용
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  link: {
    marginTop: 20,
    color: 'blue',
  },
});

export default LoginScreen;
