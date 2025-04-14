import axios from 'axios';
import { LoginRequest, LoginResponse, SignupRequest } from '../types/Auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL } from '../constant/config';

const API_URL = `${SERVER_URL}/auth`;
// const API_URL = 'http://10.50.107.197:8080/auth';

// 로그인 함수
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  try {
    const response = await axios.post<LoginResponse>(`${API_URL}/login`, credentials);
    //토큰 저장
    const token = response.data.token;
    await AsyncStorage.setItem('token', token);

    return response.data;
  } catch (error: any) {
    console.error("Login Error:", error.response?.data || error.message);
    throw error;
  }
};

// 회원가입 함수
export const signup = async (userData: SignupRequest): Promise<any> => {
  try {
    const response = await axios.post(`${API_URL}/signup`, userData);
    return response.data;
  } catch (error: any) {
    console.error("Signup Error:", error.response?.data || error.message);
    throw error;
  }
};

// 아이디 중복 확인 
export const checkUsernameDuplicate = async (username: string): Promise<boolean> => {
  try {
    const response = await axios.get(`${API_URL}/check-username`, {
      params: { username },
    });
    return response.data.available; // { available: true } or { available: false }
  } catch (error: any) {
    console.error('Username Check Error:', error.response?.data || error.message);
    throw error;
  }
};

// 전화번호 중복 확인 
export const checkPhoneDuplicate = async (phone: string): Promise<boolean> => {
  try {
    const response = await axios.get(`${API_URL}/check-phone`, {
      params: { phone },
    });
    return response.data.available; // { available: true } or { available: false }
  } catch (error: any) {
    console.error('Phone Check Error:', error.response?.data || error.message);
    throw error;
  }
};



