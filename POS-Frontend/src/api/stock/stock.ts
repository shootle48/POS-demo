import axios from "axios";

// Base URL ของ API
const API_BASE_URL = import.meta.env.VITE_API_URL;

interface SellProductParams {
  barcode: string;
  quantity: number;
  salePrice: number;
  userId: string;
  orderId: string;
}


// ดึงข้อมูล stock ตาม token
export const getStockData = async (token: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/stocks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.data; // คืนค่าเฉพาะข้อมูลสต็อก
  } catch (error: any) {
    console.error("Error fetching stock data:", error);
    throw new Error(error.response?.data?.message || "Error fetching stock data");
  }
};

export const getStockByBarcode = async (barcode: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/stocks/${barcode}`);

    // เช็คสถานะการตอบกลับจาก API ถ้าสำเร็จ
    if (response.status === 200) {
      return response.data.stockQuantity; // คืนค่าจำนวนสินค้าที่มีในสต็อก
    } else {
      console.error("เกิดข้อผิดพลาดในการดึงข้อมูลสต็อก");
      return; // คืนค่า 0 ถ้าผลลัพธ์ไม่สำเร็จ
    }
  } catch (error) {
    console.error('Error fetching stock by barcode:', error);
    throw new Error('ไม่สามารถค้นหาสินค้าได้'); // แสดงข้อผิดพลาดเมื่อไม่สามารถดึงข้อมูลได้
  }
};

// ดึง Stock ตาม Product ID
export const getStockByProductId = async (productId: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}?productId=${productId}`);
    return response.data;
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการดึง Stock ของสินค้า:", error);
    throw error;
  }
};


export const createOrder = async (orderData: any) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/orders`, orderData);
    return response.data;
  } catch (error: any) {
    console.error("❌ createOrder error:", error);
    return { success: false, message: error.response?.data?.message || "API error" };
  }
};

// api/stock/stock.ts
export const updateStock = async (
  barcode: string,
  updateData: {
    quantity?: number;
    supplier?: string;
    location?: string;
    threshold?: number;
    status?: string;
  }
) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No token found");

  console.log("📦 [updateStock] Barcode:", barcode);
  console.log("📦 [updateStock] Data:", updateData);

  try {
    const response = await axios.patch(`${API_BASE_URL}/stocks/${barcode}`, updateData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
  } catch (error: any) {
    console.error("เกิดข้อผิดพลาดในการอัปเดตสต็อก:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "เกิดข้อผิดพลาดในการอัปเดตสต็อก");
  }
};


export const addStock = async (data: {
  productId: string;
  quantity: number;
  supplier?: string;
  location?: string;
  threshold?: number;
}, token: string) => {
  try {
    // เพิ่ม headers เพื่อส่ง token ไปด้วย
    const config = {
      headers: {
        'Authorization': `Bearer ${token}`,  // ส่ง token ผ่าน Authorization header
        'Content-Type': 'application/json',  // ถ้าต้องการใช้ JSON
      },
    };

    // ส่งข้อมูลไปยัง API
    const response = await axios.post(`${API_BASE_URL}/orders/create`, data, config);
    return response.data;
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการเพิ่ม Stock:', error);
    throw error;
  }
};

// ฟังก์ชันเพื่อดึงรายการสินค้าทั้งหมด
export const getProducts = async () => {
  const token = localStorage.getItem('token'); // ดึง token จาก localStorage

  if (!token) {
    throw new Error('No token found');
  }

  try {
    // ส่ง token ไปใน Authorization header
    const response = await axios.get(`${API_BASE_URL}/products/get`, {
      headers: {
        'Authorization': `Bearer ${token}` // ใส่ token ใน header
      }
    });

    return response.data; // ส่งข้อมูลที่ได้จาก API กลับมา
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error; // ส่งข้อผิดพลาดออกไปหากเกิดการผิดพลาด
  }
};

// Delete Stock by Barcode
export const deleteStock = async (barcode: string) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No token found");

  try {
    const response = await axios.delete(`${API_BASE_URL}/stocks/${barcode}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
  } catch (error: any) {
    console.error("❌ Error deleting stock:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "เกิดข้อผิดพลาดในการลบสต็อก");
  }
};