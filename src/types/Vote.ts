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
  