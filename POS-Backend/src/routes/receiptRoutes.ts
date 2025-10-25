import express from "express";
import {
    getAllReceipts,
    getReceiptByPaymentId,
    deleteReceipt,
    getReceiptSummary,
    getReceiptBySaleId,
} from "../controllers/receiptController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/sales-summary", authMiddleware, getReceiptSummary);          // 🔹 ดึงใบเสร็จทั้งหมด
router.get("/getReceipt", authMiddleware, getAllReceipts);          // 🔹 ดึงใบเสร็จทั้งหมด
router.get("/paymentId/:paymentId", authMiddleware, getReceiptByPaymentId); // 🔹 ดึงใบเสร็จจาก saleId
router.delete("/:paymentId", authMiddleware, deleteReceipt);   // 🔹 ลบใบเสร็จตาม saleId
router.get("/receipt/:saleId", authMiddleware, getReceiptBySaleId);

export default router;