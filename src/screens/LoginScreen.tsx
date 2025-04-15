import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Alert, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  ScrollView,
  Image
} from 'react-native';
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
    // 아이디/비밀번호 찾기 화면으로 이동
    // 실제 구현 시 해당 화면으로 네비게이션 처리
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
            {/* 로고 이미지 - 실제 앱 로고로 교체 필요 */}
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>LOGO</Text>
            </View>
            <Text style={styles.title}>로그인</Text>
            <Text style={styles.subtitle}>계정 정보를 입력해주세요</Text>
          </View>
          
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>아이디</Text>
              <InputField 
                placeholder="아이디를 입력해주세요" 
                value={username} 
                onChangeText={setUsername}
                autoCapitalize="none"
                containerStyle={styles.inputField}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>비밀번호</Text>
              <InputField 
                placeholder="비밀번호를 입력해주세요" 
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
          </View>
          
          <View style={styles.footerContainer}>
            <View style={styles.linksContainer}>
              <TouchableOpacity 
                onPress={() => navigation.navigate('SignupStep1Screen')}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>회원가입</Text>
              </TouchableOpacity>
              
              <View style={styles.divider} />
              
              <TouchableOpacity 
                onPress={handleFindAccount}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>아이디/비밀번호 찾기</Text>
              </TouchableOpacity>
            </View>
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
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#5C6BC0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#757575',
  },
  formContainer: {
    width: '100%',
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 6,
  },
  inputField: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    height: 48,
  },
  loginButton: {
    backgroundColor: '#5C6BC0',
    height: 52,
    borderRadius: 8,
    marginTop: 24,
    shadowColor: '#3F51B5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerContainer: {
    marginBottom: 24,
  },
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  linkText: {
    color: '#5C6BC0',
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },
});

export default LoginScreen;