import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL } from '../constant/config';

export const checkFollow = async (followerId: number, followingId: number): Promise<boolean> => {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('JWT 토큰이 없습니다.');

  const response = await fetch(
    `${SERVER_URL}/follow/check?followerId=${followerId}&followingId=${followingId}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();
  return data.isFollowing;
};

export const followUser = async (followingId: number): Promise<any> => {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('JWT 토큰이 없습니다.');

  const response = await fetch(`${SERVER_URL}/follow`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ followingId }),
  });

  return response.json();
};

export const unfollowUser = async (followingId: number): Promise<any> => {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('JWT 토큰이 없습니다.');

  const response = await fetch(`${SERVER_URL}/follow`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ followingId }),
  });

  return response.json();
};
