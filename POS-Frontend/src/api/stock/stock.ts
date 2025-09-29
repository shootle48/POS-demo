import axios from "axios";

// Base URL ของ API
const API_BASE_URL = process.env.REACT_APP_API_URL;

export const getStockByBarcode = async (barcode: string) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/stocks/barcode/${barcode}`
    );

    // เช็คสถานะการตอบกลับจาก API ถ้าสำเร็จ
    if (response.status === 200) {
      return response.data.stockQuantity; // คืนค่าจำนวนสินค้าที่มีในสต็อก
    } else {
      console.error("เกิดข้อผิดพลาดในการดึงข้อมูลสต็อก");
      return; // คืนค่า 0 ถ้าผลลัพธ์ไม่สำเร็จ
    }
  } catch (error) {
    console.error("Error fetching stock by barcode:", error);
    throw new Error("ไม่สามารถค้นหาสินค้าได้"); // แสดงข้อผิดพลาดเมื่อไม่สามารถดึงข้อมูลได้
  }
};

// 📌 ดึง Stock ตาม Product ID
export const getStockByProductId = async (productId: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}?productId=${productId}`);
    return response.data;
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการดึง Stock ของสินค้า:", error);
    throw error;
  }
};

export const updateStockByBarcode = async (
  barcode: string,
  quantity: number
) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/stocks/barcode`, {
      barcode,
      quantity,
    });

    return response.data; // ส่งผลลัพธ์กลับไปให้ใช้ใน Component
  } catch (error: any) {
    console.error(
      "เกิดข้อผิดพลาดในการอัปเดตสต็อก:",
      error.response?.data || error.message
    );
    return { success: false, message: "เกิดข้อผิดพลาดในการอัปเดตสต็อก" };
  }
};

export const addStock = async (
  data: {
    productId: string;
    quantity: number;
    supplier?: string;
    location?: string;
    threshold?: number;
  },
  token: string
) => {
  try {
    // เพิ่ม headers เพื่อส่ง token ไปด้วย
    const config = {
      headers: {
        Authorization: `Bearer ${token}`, // ส่ง token ผ่าน Authorization header
        "Content-Type": "application/json", // ถ้าต้องการใช้ JSON
      },
    };

    // ส่งข้อมูลไปยัง API
    const response = await axios.post(
      `${API_BASE_URL}/orders/create`,
      data,
      config
    );
    return response.data;
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการเพิ่ม Stock:", error);
    throw error;
  }
};

const API_URL = "http://localhost:5000/api/stocks";

// ✅ ดึงข้อมูล stock ตาม token
export const getStockData = async (token: string) => {
  try {
    const response = await axios.get(API_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.data; // คืนค่าเฉพาะข้อมูลสต็อก
  } catch (error: any) {
    console.error("Error fetching stock data:", error);
    throw new Error(
      error.response?.data?.message || "Error fetching stock data"
    );
  }
};

// ฟังก์ชันเพื่อดึงรายการสินค้าทั้งหมด
export const getProducts = async () => {
  const token = localStorage.getItem("token"); // ดึง token จาก localStorage

  if (!token) {
    throw new Error("No token found");
  }

  try {
    // ส่ง token ไปใน Authorization header
    const response = await axios.get(`${API_BASE_URL}/products/get`, {
      headers: {
        Authorization: `Bearer ${token}`, // ใส่ token ใน header
      },
    });

    return response.data; // ส่งข้อมูลที่ได้จาก API กลับมา
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error; // ส่งข้อผิดพลาดออกไปหากเกิดการผิดพลาด
  }
};

// export const delete
