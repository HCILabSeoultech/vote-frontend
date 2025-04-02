import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:8080/reaction';

export const toggleLike = async (voteId: number) => {
  const token = await AsyncStorage.getItem('token');
  await axios.post(
    `${API_URL}/like?voteId=${voteId}`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
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
