import { SERVER_URL } from '../constant/config';

const API_URL = `${SERVER_URL}/comment-like`;


//댓글 좋아요
export const toggleCommentLike = async (commentId: number, token: string) => {
    const res = await fetch(`${API_URL}/${commentId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  
    if (!res.ok) throw new Error('좋아요 실패');
    return res.json(); // { isLiked: true/false, likeCount: number }
  };