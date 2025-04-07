export type Comment = {
    id: number;
    username: string;
    content: string;
    createdAt: string;
    profileImage: string;
    likeCount: number;
    parentId: number | null;
  }