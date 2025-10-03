import { Router } from "express";
import {
    createPurchaseOrder,
    getPurchaseOrders,
    getPurchaseOrderById,
    confirmPurchaseOrder,
    cancelPurchaseOrder,
    updateQCStatus,
    returnPurchaseOrder,
} from "../controllers/purchaseOrderController";

const router = Router();

// สร้าง Purchase Order
router.post("/purchase-orders", createPurchaseOrder);

// ดึง Purchase Orders ทั้งหมด
router.get("/purchase-orders", getPurchaseOrders);

// ดึง PO ตาม ID
router.get("/purchase-orders/:id", getPurchaseOrderById);

// ยืนยันรับสินค้า (ยังไม่เข้า stock)
router.patch("/purchase-orders/:id/confirm", confirmPurchaseOrder);

// อัปเดตสถานะ QC (ผ่าน / ไม่ผ่าน)
router.patch("/purchase-orders/:id/qc", updateQCStatus);

// ยกเลิก PO
router.patch("/purchase-orders/:id/cancel", cancelPurchaseOrder);
router.patch("/purchase-orders/:id/returnPO", returnPurchaseOrder);

export default router;
