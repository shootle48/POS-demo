// src/api/stocklot/stockLotApi.ts
import { IStockLot } from "../../types/stockLotTypes";

/* ==========================================
   📦 API สำหรับจัดการข้อมูล StockLot
========================================== */
const API_BASE_URL = import.meta.env.VITE_API_URL;


/* ✅ ดึงล็อตทั้งหมด */
export const getStockLots = async (token: string) => {
    const url = `${API_BASE_URL}/stocklots`;
    console.log("📡 Fetching:", url);
    console.log("🔧 API_BASE_URL =", API_BASE_URL);

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
};

/* ✅ ค้นหาด้วย barcode */
export const getStockLotsByBarcode = async (barcode: string, token: string) => {
    const res = await fetch(`${API_BASE_URL}/stocklots/barcode/${barcode}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
};

/* ✅ อัปเดตวันหมดอายุ */
export const updateExpiryDate = async (lotId: string, expiryDate: string, token: string) => {
    const res = await fetch(`${API_BASE_URL}/stocklots/${lotId}/expiry`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ expiryDate }),
    });
    return res.json();
};

/* ✅ อัปเดตสถานะ QC */
export const updateQCStatus = async (lotId: string, qcStatus: string, notes: string, token: string) => {
    const res = await fetch(`${API_BASE_URL}/stocklots/${lotId}/qc`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ qcStatus, notes }),
    });
    return res.json();
};

/* ✅ ปิดล็อต */
export const deactivateStockLot = async (lotId: string, token: string) => {
    const res = await fetch(`${API_BASE_URL}/stocklots/${lotId}/deactivate`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
};
