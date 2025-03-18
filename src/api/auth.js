import axios from 'axios';

const API_URL = 'http://localhost:8080/auth';

export const signup = async (userData) => {
  try {
    const response = await axios.post(`${API_URL}/signup`, userData);
    return response.data;
  } catch (error) {
    console.error("Signup Error:", error.response?.data || error.message);
    throw error;
  }
};