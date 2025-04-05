export type Comment = {
    id: number;
    username: string;
    content: string;
    createdAt: string;
    likeCount: number;
    parentId: number | null;
  }