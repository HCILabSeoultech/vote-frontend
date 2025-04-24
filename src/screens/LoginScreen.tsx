import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Alert, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  ScrollView,
  Image,
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
      Alert.alert("로그인 성공", "메인 페이지로 이동합니다.");
      navigation.navigate('Main');
    } catch (error) {
      Alert.alert("로그인 실패", "아이디 또는 비밀번호가 잘못되었습니다.");
    }
  };

  const handleFindAccount = () => {
    Alert.alert("안내", "아이디/비밀번호 찾기 기능은 준비 중입니다.");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <View style={styles.logoInnerCircle}>
                <Logo width={100} height={100} />
              </View>
            </View>
            <Text style={styles.title}>VOTY</Text>
            <Text style={styles.subtitle}>Just Vote What You Like</Text>
          </View>
          
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <InputField 
                placeholder="아이디" 
                value={username} 
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <InputField 
                placeholder="비밀번호" 
                value={password} 
                onChangeText={setPassword} 
                secureTextEntry
              />
            </View>
            
            <Button 
              title="로그인" 
              onPress={handleLogin} 
              style={styles.loginButton}
              textStyle={styles.loginButtonText}
            />

            <TouchableOpacity 
              onPress={handleFindAccount}
              style={styles.findAccountButton}
            >
              <Text style={styles.findAccountText}>아이디/비밀번호 찾기</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>계정이 없으신가요?</Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('SignupStep1Screen')}
              style={styles.signupButton}
            >
              <Text style={styles.signupText}>회원가입</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 24,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#1499D9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  logoInnerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1499D9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1499D9',
    marginBottom: 4,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    color: '#718096',
    letterSpacing: 0.5,
  },
  formContainer: {
    width: '100%',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 12,
  },
  loginButton: {
    backgroundColor: '#1499D9',
    height: 40,
    borderRadius: 10,
    marginTop: 16,
    shadowColor: '#1499D9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  loginButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  findAccountButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 6,
  },
  findAccountText: {
    color: '#718096',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  footerContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  footerText: {
    color: '#718096',
    fontSize: 12,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  signupButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F0F4FF',
    borderRadius: 8,
  },
  signupText: {
    color: '#1499D9',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default LoginScreen;