import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CreateVoteRequest, VotePageResponse, VoteResponse} from '../types/Vote';

const API_URL = 'http://localhost:8080/vote'; 

//투표 생성
export const createVotePost = async (voteData: CreateVoteRequest): Promise<{ status: string; postId: string }> => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('JWT 토큰이 없습니다.');

    const res = await axios.post(`${API_URL}/create`, voteData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return res.data;
  } catch (err: any) {
    console.error('투표 생성 실패:', err.response?.data || err.message);
    throw err;
  }
};

//투표 불러오기(메인페이지)
export const getMainPageVotes = async (page = 0, size = 10): Promise<VotePageResponse> => {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('JWT 토큰이 없습니다.');
  
    const res = await axios.get(`${API_URL}/load-main-page-votes?page=${page}&size=${size}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  
    return res.data;
  };
  
  //투표 참여
export const selectVoteOption = async (voteId: number, optionId: number) => {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('JWT 토큰이 없습니다.');

  return await axios.post(
    `${API_URL}/select`,
    {
      voteId,
      optionId,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
};

// 단일 투표 조회
export const getVoteById = async (voteId: number): Promise<VoteResponse> => {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('JWT 토큰이 없습니다.');

  const response = await axios.get(`${API_URL}/${voteId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

//좋아요 개수 Top10
export const getTopLikedVotes = async (): Promise<VoteResponse[]> => {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('JWT 토큰이 없습니다.');

  const response = await axios.get(`${API_URL}/top-liked`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};
