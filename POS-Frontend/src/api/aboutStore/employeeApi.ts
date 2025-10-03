import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL;

// ดึงพนักงานทั้งหมด (มีอยู่แล้ว)
export const getEmployeesByManager = async (token: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/employee`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch employees");
  }
};

// เพิ่มพนักงานใหม่ (มีอยู่แล้ว)
export const addEmployee = async (
  employee: {
    email: string;
    username: string;
    phoneNumber: string;
    password: string;
    firstName: string;
    lastName: string;
    position: string;
  },
  token: string
) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/employee/register`, employee, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 201) {
      return { success: true, message: "Employee added successfully" };
    } else {
      return { success: false, message: "Failed to add employee" };
    }
  } catch (error) {
    console.error("Error adding employee:", error);
    return { success: false, message: "Error adding employee" };
  }
};

// อัปเดตข้อมูลพนักงาน (มีอยู่แล้ว)
export const updateEmployee = async (
  employeeId: string,
  updatedEmployeeData: {
    email?: string;
    username?: string;
    phoneNumber?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    position?: string;
  },
  token: string
) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/${employeeId}`,
      updatedEmployeeData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.status === 200) {
      return { success: true, message: "Employee updated successfully" };
    } else {
      return { success: false, message: "Failed to update employee" };
    }
  } catch (error) {
    console.error("Error updating employee:", error);
    return { success: false, message: "Error updating employee" };
  }
};

// ดึงข้อมูลพนักงานตาม ID
export const getEmployeeById = async (employeeId: string, token: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/employee/${employeeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch employee");
  }
};

// ลบพนักงาน
export const deleteEmployee = async (employeeId: string, token: string) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/employee/${employeeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 200) {
      return { success: true, message: "Employee deleted successfully" };
    } else {
      return { success: false, message: "Failed to delete employee" };
    }
  } catch (error) {
    console.error("Error deleting employee:", error);
    return { success: false, message: "Error deleting employee" };
  }
};
