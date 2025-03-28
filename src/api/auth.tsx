import axios from 'axios';
import { LoginRequest, LoginResponse, SignupRequest } from '../types/Auth';

const API_URL = 'http://localhost:8080/auth';

// 로그인 함수
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  try {
    const response = await axios.post<LoginResponse>(`${API_URL}/login`, credentials);
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
