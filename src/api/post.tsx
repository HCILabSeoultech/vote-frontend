import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL = 'http://localhost:8080'; 

export type CreateVoteRequest = {
  categoryId: number;
  title: string;
  content: string;
  finishTime: string;
  options: string[];
  imageUrls: string[];
};

export type VoteImage = {
    id: number;
    imageUrl: string;
  };
  
  export type VoteOption = {
    id: number;
    content: string;
  };

export type VoteResponse = {
    voteId: number;
    title: string;
    content: string;
    username: string;
    categoryName: string;
    createdAt: string;
    finishTime: string;
    likeCount: number;
    commentCount: number;
    isLiked: boolean;
    isBookmarked: boolean;
    images: VoteImage[];
    voteOptions: VoteOption[];
  };

  export type VotePageResponse = {
    content: VoteResponse[];
    last: boolean;
    number: number;
  };

//투표 생성
export const createVotePost = async (voteData: CreateVoteRequest): Promise<{ status: string; postId: string }> => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('JWT 토큰이 없습니다.');

    const res = await axios.post(`${SERVER_URL}/vote/create`, voteData, {
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
  
    const res = await axios.get(`${SERVER_URL}/vote/load-main-page-votes?page=${page}&size=${size}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  
    return res.data;
  };
  