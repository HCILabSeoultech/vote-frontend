import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SERVER_URL } from '../constant/config';

const API_URL = `${SERVER_URL}/user`;

//마이페이지 조회
export const getMyPage = async (page: number = 0, size: number = 10) => {
    const token = await AsyncStorage.getItem('token');
  
    const res = await axios.get(`${API_URL}/mypage?page=${page}&size=${size}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  
  return res.data;
};

//다른 유저의 프로필 조회
export const getUserPage = async (userId: number, page: number) => {
  const token = await AsyncStorage.getItem('token');
  const response = await axios.get(`${API_URL}/${userId}?page=${page}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};  