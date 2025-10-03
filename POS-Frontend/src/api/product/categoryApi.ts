import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export const getCategories = async (token: string) => {
  const response = await axios.get(`${API_BASE_URL}/category/all`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const getProductsByCategory = async (token: string, category: string) => {
  const response = await axios.get(`${API_BASE_URL}/category/${category}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};


export interface CategoryData {
  name: string;
  description?: string;
}

export const createCategory = async (data: CategoryData): Promise<any> => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No token found");

  try {
    const response = await axios.post(`${API_BASE_URL}/category/create`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("Error response:", error.response.data);
      throw new Error(error.response.data.message || "Failed to create category");
    } else if (error.request) {
      console.error("No response received:", error.request);
      throw new Error("No response from server");
    } else {
      console.error("Error setting up request:", error.message);
      throw new Error(error.message);
    }
  }
};


// อัปเดต category
export const updateCategory = async (id: string, data: any) => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No token found');

  try {
    const response = await axios.put(`${API_BASE_URL}/category/${id}`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error updating category:", error);
    throw error;
  }
};

// ลบ category
export const deleteCategory = async (id: string) => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No token found');

  try {
    const response = await axios.delete(`${API_BASE_URL}/category/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
};
