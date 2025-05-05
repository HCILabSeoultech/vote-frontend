export interface Comment {
    id: number;
    userId: number;
    username: string;
    content: string;
    createdAt: string;
    profileImage: string;
    likeCount: number;
    isLiked: boolean;
    parentId: number | null;
    replies?: Comment[];
    name: string;
  }