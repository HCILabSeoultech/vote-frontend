export type CreateVoteRequest = {
  categoryId: number;
  title: string;
  content: string;
  finishTime: string;
  options: {
    content: string;
    optionImage: string | null;
  }[];
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
  optionImage: string;
};

// 글 작성용 옵션 타입
export type VoteOptionRequest = {
  content: string;
  optionImage?: string | null;
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

export interface SearchVoteResponse {
  id: number;
  title: string;
  username: string;
  category: string;
}

export interface StatOption {
  [key: string]: number;
}

export interface StatData {
  stat: StatOption;
}

export interface GenderStatistics {
  [key: string]: StatData;
}

export interface AgeStatistics {
  [key: string]: StatData;
}

export interface RegionStatistics {
  regions: {
    [key: string]: {
      totalVotes: number;
      participationRate: number;
    };
  };
}

export interface VoteStatistics {
  gender: GenderStatistics;
  age: AgeStatistics;
  region: RegionStatistics;
}

export interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity: number) => string;
  }[];
}
  