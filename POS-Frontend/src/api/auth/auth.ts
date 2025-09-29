// services/auth.ts
import axios from 'axios';

// กำหนด URL ของ API
const API_BASE_URL = process.env.REACT_APP_API_URL;

// ฟังก์ชันสำหรับการลงทะเบียนผู้ใช้ใหม่
export const registerUser = async (email: string, password: string, username: string, firstName: string, lastName: string, nameStore: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      nameStore,
      email,
      password,
      username,
      firstName,
      lastName
    });

    return response.data;  // ส่งข้อมูลที่ได้รับจาก API
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Registration failed');
  }
};
// auth.ts
export const handleGoogleRegister = async (googleToken: string) => {
  try {
    const response = await fetch('http://localhost:5000/api/auth/google-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ googleToken }),
    });

    const data = await response.json();
    console.log('Register Response:', data);

    if (data.token) {
      localStorage.setItem('authToken', data.token); // เก็บ Token ไว้ใน Local Storage
    }

    return data;
  } catch (error) {
    console.error('Register Error:', error);
    throw error;
  }
};

// ฟังก์ชันสำหรับการล็อกอินผู้ใช้
export const loginUser = async (email: string, password: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password
    });

    return response.data;  // ส่งข้อมูลที่ได้รับจาก API
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }
};


export const renewToken = async (token: string) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/renew-token`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data.token; // คืน token ใหม่
  } catch (error: any) {
    console.error("❌ renewToken error:", error);
    return null;
  }
};
// auth.ts

export const googleLogin = async (googleToken: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/google-login`, {
      googleToken
    });

    return response.data;  // ส่งข้อมูลที่ได้รับจาก API
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Login failed');
  }
}

export const handleSuccess = async (response: any) => {
  console.log('Google Token:', response.credential);

  try {
    const res = await fetch('http://localhost:5000/api/auth/google/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: response.credential,
      }),
    });

    const data = await res.json();
    console.log('Backend Response:', data); // ข้อมูลผู้ใช้ที่ได้จาก backend
  } catch (error) {
    console.error('Error verifying token with backend:', error);
  }
};
