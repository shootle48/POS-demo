import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export const getWarehouseByProduct = async (productId: string, token: string) => {
    try {
        const res = await axios.get(`${API_BASE_URL}/stocks/by-product/${productId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data; // ✅ { success, data, message }
    } catch (error: any) {
        console.error("❌ getWarehouseByProduct error:", error.response?.data || error.message);
        throw error.response?.data || { success: false, message: "ไม่สามารถดึงข้อมูลคลังสินค้าได้" };
    }
};

/* =========================================================
   🧾 CREATE PURCHASE ORDER
   สร้างใบสั่งซื้อใหม่ (พร้อม lot อัตโนมัติใน backend)
========================================================= */
export const createPurchaseOrder = async (data: any, token: string) => {
    try {
        // ✅ sanitize รายการสินค้า
        const sanitizedItems = (data.items || []).map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            barcode: item.barcode || "",
            quantity: Number(item.quantity) || 0,
            costPrice: Number(item.costPrice) || 0,
            salePrice: item.salePrice ? Number(item.salePrice) : undefined,
            threshold: Number(item.threshold) || 5,
            expiryDate: item.expiryDate || null,
            notes: item.notes || "",
            units: Array.isArray(item.units) ? item.units : [],
            batchNumber: item.batchNumber || "", // optional
        }));

        const payload = {
            purchaseOrderNumber: data.purchaseOrderNumber,
            supplierId: data.supplierId,
            supplierCompany: data.supplierCompany,
            location: data.location, // warehouseId
            invoiceNumber: data.invoiceNumber || null,
            items: sanitizedItems,
        };

        const res = await axios.post(`${API_BASE_URL}/purchase-orders`, payload, {
            headers: { Authorization: `Bearer ${token}` },
        });

        return res.data;
    } catch (error: any) {
        console.error("❌ createPurchaseOrder error:", error.response?.data || error.message);
        throw error.response?.data || { success: false, message: "ไม่สามารถสร้าง PO ได้" };
    }
};

/* =========================================================
   📜 GET ALL PURCHASE ORDERS
========================================================= */
export const getPurchaseOrders = async (token: string) => {
    try {
        const res = await axios.get(`${API_BASE_URL}/purchase-orders`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data;
    } catch (error: any) {
        console.error("❌ getPurchaseOrders error:", error.response?.data || error.message);
        throw error.response?.data || { success: false, message: "โหลดข้อมูล PO ไม่สำเร็จ" };
    }
};

/* =========================================================
   🔍 GET PURCHASE ORDER BY ID
========================================================= */
export const getPurchaseOrderById = async (id: string, token: string) => {
    try {
        const res = await axios.get(`${API_BASE_URL}/purchase-orders/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data;
    } catch (error: any) {
        console.error("❌ getPurchaseOrderById error:", error.response?.data || error.message);
        throw error.response?.data || { success: false, message: "ไม่พบข้อมูล PO" };
    }
};

export const getAllPurchaseOrders = async (token: string) => {
    try {
        const res = await axios.get(`${API_BASE_URL}/purchase-orders-qc`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data;
    } catch (error: any) {
        console.error("❌ Error fetching purchase orders:", error.message);
        return { success: false, message: "โหลดข้อมูลใบสั่งซื้อไม่สำเร็จ" };
    }
};

/* =========================================================
   ✅ CONFIRM PURCHASE ORDER (รอ QC)
========================================================= */
export const confirmPurchaseOrder = async (id: string, token: string) => {
    try {
        const res = await axios.patch(
            `${API_BASE_URL}/purchase-orders/${id}/confirm`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data;
    } catch (error: any) {
        console.error("❌ confirmPurchaseOrder error:", error.response?.data || error.message);
        throw error.response?.data || { success: false, message: "ยืนยัน PO ไม่สำเร็จ" };
    }
};


/* =========================================================
   🔁 RETURN PURCHASE ORDER (คืนสินค้า)
========================================================= */
export const returnPurchaseOrder = async (id: string, token: string) => {
    try {
        const res = await axios.patch(
            `${API_BASE_URL}/purchase-orders/${id}/returnPo`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data;
    } catch (error: any) {
        console.error("❌ returnPurchaseOrder error:", error.response?.data || error.message);
        throw error.response?.data || { success: false, message: "คืนสินค้าไม่สำเร็จ" };
    }
};

// purchaseOrderApi.ts
export const returnPurchaseItem = async (poId: string, batchNumber: string, quantity: number, token: string) => {
    try {
        const res = await fetch(`${API_BASE_URL}/purchase-orders/${poId}/return-item`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ batchNumber, quantity }),
        });
        return await res.json();
    } catch (err) {
        return { success: false, message: "ไม่สามารถคืนสินค้าได้" };
    }
};


/* =========================================================
   ❌ CANCEL PURCHASE ORDER
========================================================= */
export const cancelPurchaseOrder = async (id: string, token: string) => {
    try {
        const res = await axios.patch(
            `${API_BASE_URL}/purchase-orders/${id}/cancel`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data;
    } catch (error: any) {
        console.error("❌ cancelPurchaseOrder error:", error.response?.data || error.message);
        throw error.response?.data || { success: false, message: "ยกเลิก PO ไม่สำเร็จ" };
    }
};
