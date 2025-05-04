import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Alert
} from 'react-native';
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

  // Reset error message when inputs change
  useEffect(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
  
    // 아이디가 바뀐 경우에만 확인 상태를 초기화
    setIsChecked(false);
  }, [username]);

  // Calculate password strength
  useEffect(() => {
    if (password.length === 0) {
      setPasswordStrength(0);
      return;
    }
    
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    setPasswordStrength(strength);
  }, [password]);

  const handleCheckDuplicate = async () => {
    if (!emailRegex.test(username)) {
      Alert.alert('유효하지 않은 이메일', '올바른 이메일 형식으로 입력해주세요.');
      setIsChecked(false);
      return;
    }
  
    setIsLoading(true);
    try {
      const isAvailable = await checkUsernameDuplicate(username);
      if (isAvailable) {
        setIsChecked(true);
        Alert.alert('사용 가능', '사용 가능한 이메일입니다!');
      } else {
        setIsChecked(false);
        Alert.alert('중복된 이메일', '이미 존재하는 이메일입니다.');
      }
    } catch {
      Alert.alert('중복된 이메일', '이미 존재하는 이메일입니다.');
    } finally {
      setIsLoading(false);
    }
  };
  

  const handleNext = () => {
    if (!isChecked) {
      Alert.alert('입력 오류', '아이디 중복 확인을 해주세요.');
      return;
    }
  
    if (!passwordRegex.test(password)) {
      Alert.alert(
        '비밀번호 조건 불충분',
        '비밀번호는 영문 대소문자, 숫자, 특수문자를 포함한 8자 이상이어야 합니다.'
      );
      return;
    }
  
    if (password !== passwordConfirm) {
      Alert.alert('비밀번호 불일치', '비밀번호가 일치하지 않습니다.');
      return;
    }
  
    navigation.navigate('SignupStep2Screen', {
      userData: { username, password },
    });
  };
  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return '#E0E0E0';
    if (passwordStrength <= 2) return '#FF5252';
    if (passwordStrength <= 4) return '#FFC107';
    return '#4CAF50';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength <= 2) return '약함';
    if (passwordStrength <= 4) return '보통';
    return '강함';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={styles.progressFill} />
                </View>
                <Text style={styles.progressText}>1/3 단계</Text>
              </View>
              <Text style={styles.subtitle}>아이디와 비밀번호를 설정해주세요</Text>
            </View>
            
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>아이디</Text>
                <View style={styles.usernameContainer}>
                  <View style={styles.usernameInputWrapper}>
                    <InputField
                      placeholder="이메일을 입력해주세요"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                    />
                  </View>
                  <TouchableOpacity 
                    style={[
                      styles.checkButton,
                      isChecked ? styles.checkedButton : {}
                    ]} 
                    onPress={handleCheckDuplicate}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.checkButtonText}>
                        {isChecked ? '확인됨' : '중복확인'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
                {username.length > 0 && !emailRegex.test(username) && (
                  <Text style={styles.hintText}>
                    올바른 이메일 형식으로 입력해주세요
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>비밀번호</Text>
                <InputField
                  placeholder="비밀번호를 입력해주세요"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="off"
                  textContentType="oneTimeCode"
                  importantForAutofill="no"
                />
                
                {password.length > 0 && (
                  <View style={styles.passwordStrengthContainer}>
                    <View style={styles.strengthBars}>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <View 
                          key={level}
                          style={[
                            styles.strengthBar, 
                            { 
                              backgroundColor: passwordStrength >= level 
                                ? getPasswordStrengthColor() 
                                : '#E0E0E0' 
                            }
                          ]}
                        />
                      ))}
                    </View>
                    <Text 
                      style={[
                        styles.strengthText, 
                        { color: getPasswordStrengthColor() }
                      ]}
                    >
                      {getPasswordStrengthText()}
                    </Text>
                  </View>
                )}
                
                <Text style={styles.hintText}>
                  영문 대소문자, 숫자, 특수문자를 포함한 8자 이상
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>비밀번호 확인</Text>
                <InputField
                  placeholder="비밀번호를 다시 입력해주세요"
                  value={passwordConfirm}
                  onChangeText={setPasswordConfirm}
                  secureTextEntry
                  autoComplete="off"
                  textContentType="oneTimeCode"
                  importantForAutofill="no"
                />
                {passwordConfirm.length > 0 && password !== passwordConfirm && (
                  <Text style={styles.hintText}>
                    비밀번호가 일치하지 않습니다
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <Button 
                title="다음" 
                onPress={handleNext} 
                style={styles.nextButton}
                textStyle={styles.nextButtonText}
              />
              <TouchableOpacity 
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <Text style={styles.backButtonText}>이전으로</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    backgroundColor: '#fff',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBar: {
    width: '80%',
    height: 3,
    backgroundColor: '#F0F4FF',
    borderRadius: 1.5,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    width: '33.33%',
    height: '100%',
    backgroundColor: '#1499D9',
    borderRadius: 1.5,
  },
  progressText: {
    fontSize: 14,
    color: '#1499D9',
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    letterSpacing: 0.5,
    textAlign: 'center',
    fontWeight: '500',
  },
  formContainer: {
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  usernameInputWrapper: {
    flex: 1,
  },
  checkButton: {
    backgroundColor: '#1499D9',
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
    elevation: 0,
    shadowColor: 'transparent',
  },
  checkedButton: {
    backgroundColor: '#1499D9',
  },
  checkButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  hintText: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  strengthBars: {
    flexDirection: 'row',
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E2E8F0',
    marginRight: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
    width: 32,
    letterSpacing: 0.5,
  },
  buttonContainer: {
    marginTop: 8,
  },
  nextButton: {
    backgroundColor: '#1499D9',
    height: 48,
    borderRadius: 12,
    elevation: 0,
    shadowColor: 'transparent',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    color: '#fff',
  },
  backButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  backButtonText: {
    color: '#A0AEC0',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});

export default SignupStep1Screen;