import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import InputField from '../components/InputField';
import Button from '../components/Button';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { UserData } from '../types/UserData';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Signup'>;
};

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
  });

  const handleChange = (key: keyof UserData, value: string) => {
    setUserData(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    navigation.navigate('CategorySelection', { userData });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>회원가입</Text>
      <View style={styles.form}>
        {(Object.keys(userData) as (keyof UserData)[]).map(key => (
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  form: {
    width: 280, // 고정 너비
    gap: 1,     // RN 최신버전에서 지원 (안 되면 대신 marginBottom)
  },
});

export default SignupScreen;
