import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import InputField from '../components/InputField';
import Button from '../components/Button';
import { signup } from '../api/auth';

const SignupScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [address, setAddress] = useState('');
  const [introduction, setIntroduction] = useState('');

  const handleSignup = async () => {
    const userData = { username, password, name, gender, phone, birthdate, address, introduction, profileImage: "default.jpg" };

    try {
        await signup(userData);
        Alert.alert("회원가입 성공", "회원가입이 완료되었습니다!");
        navigation.navigate("Main");
      } catch (error) {
        if (error.response && error.response.data) {
          const { errorCode, errorMessage } = error.response.data;
  
          if (errorCode === "ALREADY_EXIST_NAME") {
            Alert.alert("회원가입 실패", "이미 존재하는 아이디입니다.");
          } else if (errorCode === "ALREADY_EXIST_PHONE") {
            Alert.alert("회원가입 실패", "이미 존재하는 전화번호입니다.");
          }
        }
      }
    };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>회원가입</Text>
      <InputField placeholder="아이디" value={username} onChangeText={setUsername} />
      <InputField placeholder="비밀번호" value={password} onChangeText={setPassword} secureTextEntry />
      <InputField placeholder="이름" value={name} onChangeText={setName} />
      <InputField placeholder="성별" value={gender} onChangeText={setGender} />
      <InputField placeholder="전화번호" value={phone} onChangeText={setPhone} />
      <InputField placeholder="생년월일 (YYYY-MM-DD)" value={birthdate} onChangeText={setBirthdate} />
      <InputField placeholder="주소" value={address} onChangeText={setAddress} />
      <InputField placeholder="자기소개" value={introduction} onChangeText={setIntroduction} />
      <Button title="회원가입" onPress={handleSignup} />
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});

export default SignupScreen;
