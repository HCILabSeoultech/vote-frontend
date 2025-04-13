import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SERVER_URL } from '../constant/config';

const API_URL = `${SERVER_URL}/reaction`;

export const toggleLike = async (voteId: number) => {
  const token = await AsyncStorage.getItem('token');
  const res = await axios.post(
    `${API_URL}/like?voteId=${voteId}`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.data;
};

export const toggleBookmark = async (voteId: number) => {
    const token = await AsyncStorage.getItem('token');
    await axios.post(
      `${API_URL}/bookmark?voteId=${voteId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  };
