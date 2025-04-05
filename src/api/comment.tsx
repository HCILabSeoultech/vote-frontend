import axios from 'axios';

const API_URL = 'http://localhost:8080/comment';

export const fetchComments = async (voteId: number, token?: string) => {
  const headers = token
    ? { Authorization: `Bearer ${token}` }
    : undefined;

  const response = await axios.get(`${API_URL}/${voteId}`, { headers });
  return response.data;
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

 