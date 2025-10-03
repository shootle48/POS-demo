import express from "express";
import {
    getAllReceipts,
    getReceiptByPaymentId,
    deleteReceipt,
    getReceiptSummary
} from "../controllers/receiptController";

const router = express.Router();

router.get("/sales-summary", getReceiptSummary);          // 🔹 ดึงใบเสร็จทั้งหมด
router.get("/", getAllReceipts);          // 🔹 ดึงใบเสร็จทั้งหมด
router.get("/paymentId/:paymentId", getReceiptByPaymentId); // 🔹 ดึงใบเสร็จจาก saleId
router.delete("/:paymentId", deleteReceipt);   // 🔹 ลบใบเสร็จตาม saleId

export default router;