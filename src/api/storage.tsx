import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SERVER_URL } from '../constant/config';


const API_URL = `${SERVER_URL}`

const getTokenHeader = async () => {
  const token = await AsyncStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

export const getStoragePosts = async (type: 'voted' | 'liked' | 'bookmarked', page: number = 0, size: number = 10) => {
  const headers = await getTokenHeader();
  const res = await axios.get(`${API_URL}/storage/${type}?page=${page}&size=${size}`, headers);
  return res.data;
};