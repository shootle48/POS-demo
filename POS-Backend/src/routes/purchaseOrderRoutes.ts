import { Router } from "express";
import {
    createPurchaseOrder,
    getPurchaseOrders,
    getPurchaseOrderById,
    confirmPurchaseOrder,
    cancelPurchaseOrder,
    returnPurchaseOrder,
    returnPurchaseItem
} from "../controllers/purchaseOrderController";
import { getAllPurchaseOrders } from "../controllers/purchaseOrderController";

const router = Router();

// สร้าง Purchase Order
router.post("/purchase-orders", createPurchaseOrder);

// ดึง Purchase Orders ทั้งหมด
router.get("/purchase-orders", getPurchaseOrders);

// ดึง PO ตาม ID
router.get("/purchase-orders/:id", getPurchaseOrderById);
router.get("/purchase-orders-qc", getAllPurchaseOrders);

// ยืนยันรับสินค้า (ยังไม่เข้า stock)
router.patch("/purchase-orders/:id/confirm", confirmPurchaseOrder);
// ยกเลิก PO
router.patch("/purchase-orders/:id/cancel", cancelPurchaseOrder);
router.patch("/purchase-orders/:id/returnPO", returnPurchaseOrder);
router.post("/purchase-orders/:id/return-item", returnPurchaseItem);

export default router;
