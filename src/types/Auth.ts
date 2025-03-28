export interface LoginRequest {
    username: string;
    password: string;
  }
  
  export interface LoginResponse {
    status: string;
    token: string;
  }
  
  export interface SignupRequest {
    username: string;
    password: string;
    name: string;
    gender: string;
    phone: string;
    birthdate: string;
    address: string;
    introduction: string;
    profileImage: string;
    interestCategory: number[];
  }
  