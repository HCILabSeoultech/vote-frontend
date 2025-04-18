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


  const usernameRegex = /^[a-z0-9]{6,15}$/;
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
    if (!usernameRegex.test(username)) {
      Alert.alert('유효하지 않은 아이디', '아이디는 소문자와 숫자로 구성되며 6~15자여야 합니다.');
      setIsChecked(false);
      return;
    }
  
    setIsLoading(true);
    try {
      const isAvailable = await checkUsernameDuplicate(username);
      if (isAvailable) {
        setIsChecked(true);
        Alert.alert('사용 가능', '사용 가능한 아이디입니다!');
      } else {
        setIsChecked(false);
        Alert.alert('중복된 아이디', '이미 존재하는 아이디입니다.');
      }
    } catch {
      Alert.alert('중복된 아이디', '이미 존재하는 아이디입니다.');
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
              <Text style={styles.title}>계정 만들기</Text>
              <Text style={styles.subtitle}>아이디와 비밀번호를 설정해주세요</Text>
            </View>
            
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>아이디</Text>
                <View style={styles.usernameContainer}>
                  <View style={styles.usernameInputWrapper}>
                    <InputField
                      placeholder="소문자와 숫자 6-15자"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                      containerStyle={[
                        styles.inputField, 
                        isChecked ? styles.checkedInputField : {}
                      ]}
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
                {username.length > 0 && !usernameRegex.test(username) && (
                  <Text style={styles.hintText}>
                    소문자와 숫자로만 6-15자 사이로 입력해주세요
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
                  containerStyle={styles.inputField}
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
                  containerStyle={[
                    styles.inputField,
                    passwordConfirm.length > 0 && password === passwordConfirm 
                      ? styles.matchedInputField 
                      : passwordConfirm.length > 0 
                        ? styles.unmatchedInputField 
                        : {}
                  ]}
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
                title="다음 단계로" 
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
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBar: {
    width: '80%',
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressFill: {
    width: '33.33%',
    height: '100%',
    backgroundColor: '#1499D9',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#757575',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: 16,
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
  checkedInputField: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
  },
  matchedInputField: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
  },
  unmatchedInputField: {
    borderColor: '#FF5252',
    backgroundColor: '#FFEBEE',
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernameInputWrapper: {
    flex: 1,
  },
  checkButton: {
    backgroundColor: '#1499D9',
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    minWidth: 80,
  },
  checkedButton: {
    backgroundColor: '#1499D9',
  },
  checkButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  hintText: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  strengthBars: {
    flexDirection: 'row',
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
    marginRight: 3,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    width: 32,
  },
  buttonContainer: {
    marginTop: 8,
  },
  nextButton: {
    backgroundColor: '#6200EE',
    height: 52,
    borderRadius: 8,
    shadowColor: '#6200EE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  backButtonText: {
    color: '#757575',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SignupStep1Screen;