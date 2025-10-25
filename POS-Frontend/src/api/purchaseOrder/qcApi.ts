// src/api/purchaseOrder/qcApi.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/* =========================================================
   🧪 CREATE QC RECORD
   → ใช้ตอนสร้างเอกสาร QC ครั้งแรก (ของเข้าคลัง)
========================================================= */
export const createQCRecord = async (formData: FormData, token: string) => {
    try {
        const res = await axios.post(`${API_URL}/qc/create`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
                Authorization: `Bearer ${token}`,
            },
        });
        return res.data;
    } catch (error: any) {
        console.error("❌ createQCRecord Error:", error.response?.data || error.message);
        return { success: false, message: error.response?.data?.message || "Error creating QC record" };
    }
};

/* =========================================================
   🧾 GET QC RECORDS BY BATCH NUMBER
   → ใช้ดึงข้อมูล QC ของล็อตนั้น (ในหน้า QCInspectionPage)
========================================================= */
export const getQCByBatch = async (batchNumber: string, token: string) => {
    try {
        const res = await axios.get(`${API_URL}/qc/${batchNumber}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data;
    } catch (error: any) {
        console.error("❌ getQCByBatch Error:", error.response?.data || error.message);
        return { success: false, message: error.response?.data?.message || "Error fetching QC data" };
    }
};

/* =========================================================
   🧰 UPDATE QC RECORD (รายล็อต)
   → ใช้เมื่อเจ้าหน้าที่ QC ตรวจล็อตนั้นเสร็จ
========================================================= */
export const updateQCRecord = async (
    qcId: string,
    data: { status?: string; remarks?: string },
    token: string
) => {
    try {
        const res = await axios.put(`${API_URL}/qc/${qcId}`, data, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data;
    } catch (error: any) {
        console.error("❌ updateQCRecord Error:", error.response?.data || error.message);
        return { success: false, message: error.response?.data?.message || "Error updating QC record" };
    }
};

/* =========================================================
   📦 UPDATE QC STATUS (ทั้งใบ PO)
   → ใช้ตอนสรุปผล QC ทั้งใบ (เช่นกด “ผ่านทั้งหมด”)
========================================================= */
export const updateQCStatus = async (
    poId: string,
    data: { qcStatus: string },
    token: string
) => {
    try {
        const res = await axios.patch(`${API_URL}/qc/update/${poId}`, data, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data;
    } catch (error: any) {
        console.error("❌ updateQCStatus Error:", error.response?.data || error.message);
        return { success: false, message: error.response?.data?.message || "Error updating PO QC status" };
    }
};

/* =========================================================
   🗑️ DELETE QC RECORD
   → ใช้เมื่อต้องการลบข้อมูล QC ที่ไม่ถูกต้อง
========================================================= */
export const deleteQCRecord = async (qcId: string, token: string) => {
    try {
        const res = await axios.delete(`${API_URL}/qc/${qcId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data;
    } catch (error: any) {
        console.error("❌ deleteQCRecord Error:", error.response?.data || error.message);
        return { success: false, message: error.response?.data?.message || "Error deleting QC record" };
    }
};
