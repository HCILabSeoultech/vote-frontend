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
                <Text style={styles.logoText}>VOTE</Text>
              </View>
            </View>
            <Text style={styles.title}>환영합니다</Text>
            <Text style={styles.subtitle}>투표를 시작해보세요</Text>
          </View>
          
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <InputField 
                placeholder="아이디" 
                value={username} 
                onChangeText={setUsername}
                autoCapitalize="none"
                containerStyle={styles.inputField}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <InputField 
                placeholder="비밀번호" 
                value={password} 
                onChangeText={setPassword} 
                secureTextEntry
                containerStyle={styles.inputField}
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
    padding: 24,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#5E72E4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoInnerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#5E72E4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
  },
  formContainer: {
    width: '100%',
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputField: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
  },
  loginButton: {
    backgroundColor: '#5E72E4',
    height: 56,
    borderRadius: 12,
    marginTop: 24,
    shadowColor: '#5E72E4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  findAccountButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  findAccountText: {
    color: '#718096',
    fontSize: 14,
    fontWeight: '500',
  },
  footerContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  footerText: {
    color: '#718096',
    fontSize: 14,
    marginBottom: 8,
  },
  signupButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  signupText: {
    color: '#5E72E4',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginScreen;