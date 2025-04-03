import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:8080';

export const getMyPage = async (page: number = 0, size: number = 10) => {
    const token = await AsyncStorage.getItem('token');
  
    const res = await axios.get(`${API_URL}/user/mypage?page=${page}&size=${size}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  
    return res.data;
  };