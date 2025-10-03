import axios from "axios";

// Base URL ของ API
const API_BASE_URL = import.meta.env.VITE_API_URL;

export const createPurchaseOrder = async (data: any, token: string) => {
    const res = await axios.post(`${API_BASE_URL}/purchase-orders`, data, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};

// ดึง Purchase Orders ทั้งหมด
export const getPurchaseOrders = async (token: string) => {
    const res = await axios.get(`${API_BASE_URL}/purchase-orders`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};

// ดึง PO ตาม ID
export const getPurchaseOrderById = async (id: string, token: string) => {
    const res = await axios.get(`${API_BASE_URL}/purchase-orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};

// Confirm PO (PATCH)
export const confirmPurchaseOrder = async (id: string, token: string) => {
    const res = await axios.patch(
        `${API_BASE_URL}/purchase-orders/${id}/confirm`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
};

// Update QC Status (PATCH)
export const updateQCStatus = async (
    id: string,
    qcStatus: "รอตรวจสอบ" | "ผ่าน" | "ไม่ผ่าน",
    token: string
) => {
    const res = await axios.patch(
        `${API_BASE_URL}/purchase-orders/${id}/qc`,
        { qcStatus },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
};

// Return PO (PATCH)
export const returnPurchaseOrder = async (poId: string, token: string) => {
    const res = await axios.patch(
        `${API_BASE_URL}/purchase-orders/${poId}/returnPO`,
        {}, // body ว่าง
        {
            headers: { Authorization: `Bearer ${token}` },
        }
    );
    return res.data;
};

// Cancel PO (PATCH)
export const cancelPurchaseOrder = async (poId: string, token: string) => {
    const res = await axios.patch(
        `${API_BASE_URL}/purchase-orders/${poId}/cancel`, // ใช้ params
        {}, // body ว่าง
        {
            headers: { Authorization: `Bearer ${token}` },
        }
    );
    return res.data;
};
