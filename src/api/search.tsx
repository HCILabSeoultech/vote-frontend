import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VoteResponse, SearchVoteResponse } from '../types/Vote';
import { UserDocument } from '../types/UserData'; 

import { SERVER_URL } from '../constant/config';

const API_URL = `${SERVER_URL}/search`;

// 게시글 검색
export const searchVotes = async (keyword: string): Promise<SearchVoteResponse[]> => {
    const token = await AsyncStorage.getItem('token');
    const response = await axios.get(`${API_URL}/vote`, {
      params: { keyword },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
};

// 유저 검색
export const searchUsers = async (keyword: string): Promise<UserDocument[]> => {
    const token = await AsyncStorage.getItem('token');
    const response = await axios.get(`${API_URL}/user`, {
      params: { keyword },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
};

// 게시글 자동완성
export const suggestVotes = async (keyword: string): Promise<string[]> => {
  const response = await axios.get(`${API_URL}/vote/suggest`, {
    params: { keyword },
  });
  return response.data;
};

// 유저 자동완성
export const suggestUsers = async (keyword: string): Promise<string[]> => {
  const response = await axios.get(`${API_URL}/user/suggest`, {
    params: { keyword },
  });
  return response.data;
};

