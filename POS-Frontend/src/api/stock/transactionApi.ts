import axios from "axios";

// Base URL ของ API
const API_BASE_URL = import.meta.env.VITE_API_URL;

// ดึง Transaction ทั้งหมด
export const getStockTransactions = async (token: string) => {
    const res = await axios.get(`${API_BASE_URL}/stock/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};

// ดึง Transaction ตาม Product
export const getTransactionsByProduct = async (productId: string, token: string) => {
    const res = await axios.get(`${API_BASE_URL}/stock/product/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};

// ดึง Transaction ตาม Stock
export const getTransactionsByStock = async (stockId: string, token: string) => {
    const res = await axios.get(`${API_BASE_URL}/stock/stock/${stockId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};


// สร้าง Transaction ใหม่ (RESTOCK, SALE, RETURN, ADJUSTMENT)
export const createTransaction = async (
    data: {
        stockId: string;
        productId: string;
        type: "RESTOCK" | "SALE" | "RETURN" | "ADJUSTMENT";
        quantity: number;
        referenceId?: string;
        costPrice?: number;
        salePrice?: number;
        notes?: string;
    },
    token: string
) => {
    const res = await axios.post(`${API_BASE_URL}/stock/create`, data, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};

