import axios from 'axios';
import { SERVER_URL } from '../constant/config';

const API_URL = `${SERVER_URL}/comment`;

//댓글조회
export const fetchComments = async (voteId: number, page = 0, token?: string) => {
  const headers = token
    ? { Authorization: `Bearer ${token}` }
    : undefined;

  try {
    const response = await axios.get(`${API_URL}/${voteId}?page=${page}&size=10`, {
      headers,
    })
    return response.data
  } catch (error) {
    console.error("댓글 조회 실패:", error)
    throw error
  }
};

//댓글달기
export const postComment = async (
    voteId: number,
    content: string,
    parentId?: number,
    token?: string
  ) => {
    const headers = token
      ? { Authorization: `Bearer ${token}` }
      : undefined;
  
    const response = await axios.post(
      `${API_URL}/${voteId}`,
      { content, parentId },
      { headers }
    );
  
  return response.data;
};

//댓글 수정
export const editComment = async (
  commentId: number,
  content: string,
  token: string
) => {
  const res = await axios.put(
    `${API_URL}/${commentId}`,
    { content },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.data;
};

//댓글 삭제
export const deleteComment = async (
  commentId: number,
  token: string
) => {
  await axios.delete(`${API_URL}/${commentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

 