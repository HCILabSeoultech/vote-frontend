import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Alert, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions
} from 'react-native';
import InputField from '../components/InputField';
import Button from '../components/Button';
import { login } from '../api/auth';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import Logo from '../../assets/mainlogo.svg'; 

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Login'>;
};

const { width } = Dimensions.get('window');

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!username.trim()) {
      Alert.alert("로그인 실패", "아이디를 입력해주세요.");
      return;
    }
    if (!password.trim()) {
      Alert.alert("로그인 실패", "비밀번호를 입력해주세요.");
      return;
    }
    try {
      await login({ username, password });
      navigation.navigate('Main', { refresh: true });
    } catch (error) {
      Alert.alert("로그인 실패", "아이디 또는 비밀번호가 잘못되었습니다.");
    }
  };

  return (
    <SafeAreaView style={styles.igSafeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.igContainer}>
          <View style={styles.igLogoWrap}>
            <Logo width={72} height={72} />
            <Text style={styles.igTitle}>VoteY</Text>
          </View>
          <View style={styles.igForm}>
            <InputField
              placeholder="아이디"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              style={[styles.igInput, { borderBottomWidth: 0, borderWidth: 0 }]}
            />
            <InputField
              placeholder="비밀번호"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={[styles.igInput, { borderBottomWidth: 0, borderWidth: 0 }]}
            />
            <TouchableOpacity onPress={handleLogin} style={styles.igLoginBtn} activeOpacity={0.8}>
              <Text style={styles.igLoginBtnText}>로그인</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('SignupStep1Screen')} style={styles.igSignupWrap} activeOpacity={0.7}>
            <Text style={styles.igSignupText}>계정이 없으신가요? <Text style={styles.igSignupLink}>회원가입</Text></Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert("안내", "아이디/비밀번호 찾기 기능은 준비 중입니다.")} style={styles.igFindWrap} activeOpacity={0.7}>
            <Text style={styles.igFindText}>비밀번호를 잊으셨나요?</Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  igSafeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  igContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#fff',
  },
  igLogoWrap: {
    alignItems: 'center',
    marginBottom: 36,
  },
  igTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1499D9',
    marginTop: 12,
    letterSpacing: 2,
  },
  igForm: {
    width: '100%',
    marginBottom: 28,
  },
  igInput: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 6,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    height: 40,
    justifyContent: 'center',
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'center',
  },
  igInputText: {
    fontSize: 16,
    color: '#222',
    paddingVertical: 0,
    lineHeight: 22,
    textAlignVertical: 'center',
  },
  igLoginBtn: {
    backgroundColor: '#1499D9',
    borderRadius: 12,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 8,
    shadowColor: 'transparent',
  },
  igLoginBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  igSignupWrap: {
    marginTop: 8,
    marginBottom: 0,
  },
  igSignupText: {
    color: '#888',
    fontSize: 14,
  },
  igSignupLink: {
    color: '#1499D9',
    fontWeight: 'bold',
  },
  igFindWrap: {
    marginTop: 18,
  },
  igFindText: {
    color: '#A0AEC0',
    fontSize: 13,
    textAlign: 'center',
  },
});

export default LoginScreen;