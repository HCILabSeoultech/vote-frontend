export interface UserData {
  username: string;
  password: string;
  name: string;
  gender: string;
  phone: string;
  birthdate: string;
  address: string;
  introduction: string;
  profileImage: string;
}

export interface UserDocument {
  id: number;
  username: string;
  profileImage: string;
}  