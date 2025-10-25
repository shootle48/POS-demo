import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL;

// ดึงรายการใบเสร็จทั้งหมด
export const fetchReceipts = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      return [];
    }
    const response = await axios.get(`${API_BASE_URL}/receipts/getReceipt`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.success ? response.data.receipts : [];
  } catch (error) {
    console.error("Error fetching receipts:", error);
    return [];
  }
};

// ดึงข้อมูลใบเสร็จตาม `saleId`
export async function fetchReceiptById(paymentId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/receipts/paymentId/${paymentId}`);
    if (!response.ok) {
      throw new Error("ไม่สามารถดึงข้อมูลใบเสร็จได้");
    }
    return await response.json();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
  }
}

// ลบใบเสร็จตาม `saleId`
export const deleteReceipt = async (saleId: string) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/receipts/${saleId}`);
    return response.status === 200;
  } catch (error) {
    console.error("Error deleting receipt:", error);
    return false;
  }
};

export const fetchSalesSummary = async (
  date: Date,
  filter: "daily" | "weekly" | "monthly" | "yearly"
) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      return { success: false, data: null };
    }
    const response = await axios.get(`${API_BASE_URL}/dashboard/stats`, {
      params: { date: date.toISOString(), filter },
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching sales summary:", error);
    return { success: false, data: null };
  }
};

// ✅ ดึงใบเสร็จจาก saleId (สำหรับคืนสินค้า)
export const fetchReceiptBySaleId = async (saleId: string) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_BASE_URL}/receipts/receipt/${saleId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching receipt by saleId:", error);
    return { success: false, message: "ไม่สามารถดึงข้อมูลใบเสร็จได้" };
  }
};