import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CreateVoteRequest, VotePageResponse, VoteResponse, VoteStatistics} from '../types/Vote';

import { SERVER_URL } from '../constant/config';

const API_URL = `${SERVER_URL}/vote`; 
// const API_URL = 'http://10.50.107.197:8080/vote';


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

//투표 삭제
export const deleteVote = async (voteId: number) => {
  const token = await AsyncStorage.getItem('token');
  const res = await axios.delete(`${API_URL}/${voteId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
};

//투표 재업로드
export const reuploadVotePost = async (voteId: number, data: any) => {
  const token = await AsyncStorage.getItem('token');
  const res = await fetch(`${API_URL}/${voteId}/reupload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || '서버 오류');
  }

  return res.json();
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

//투표 취소
export const cancelVote = async (voteId: number) => {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('JWT 토큰이 없습니다.');

  const response = await axios.post(`${API_URL}/cancel`, {
    voteId
  }, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
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
export const getTopLikedVotes = async (size: number = 30): Promise<VoteResponse[]> => {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('JWT 토큰이 없습니다.');

  const response = await axios.get(`${API_URL}/top-liked`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: {
      size
    }
  });

  return response.data;
};

//카테고리별 인기글
export const getVotesByCategory = async (categoryId: number, page: number = 0, size: number = 30): Promise<{ content: VoteResponse[]; last: boolean; number: number }> => {
  const token = await AsyncStorage.getItem('token');
  const response = await axios.get(`${API_URL}/category/${categoryId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: {
      page,
      size,
    },
  });
  return response.data;
};

// 투표 통계 (성별)
export const getVoteStatisticsByGender = async (voteId: number) => {
  const token = await AsyncStorage.getItem('token');
  const response = await axios.get(`${API_URL}/${voteId}/statistics/gender`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
  });
  return response.data;
};

// 투표 통계 (연령대)
export const getVoteStatisticsByAge = async (voteId: number) => {
  const token = await AsyncStorage.getItem('token');
  const response = await axios.get(`${API_URL}/${voteId}/statistics/age`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
  });
  return response.data;
};

// 투표 통계 (지역)
export const getVoteStatisticsByRegion = async (voteId: number) => {
  const token = await AsyncStorage.getItem('token');
  const response = await axios.get(`${API_URL}/${voteId}/statistics/region`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
  });
  return response.data;
};
