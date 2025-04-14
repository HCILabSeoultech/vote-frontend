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
      voteCount: number;
    };
  
  export type VoteResponse = {
      voteId: number;
      userId: number;
      categoryId: number;
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
      profileImage?: string;
      images: VoteImage[];
      voteOptions: VoteOption[];

      selectedOptionId?: number;
      totalVotes: number;
    };
  
    export type VotePageResponse = {
      content: VoteResponse[];
      last: boolean;
      number: number;
    };
  