import express from "express";
import { createPayment, getAllPayments, processRefund  } from "../controllers/paymentController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/create", authMiddleware, createPayment); // บันทึกการชำระเงิน
router.get("/getPayment", authMiddleware, getAllPayments); // ดึงข้อมูลการชำระเงินทั้งหมด
router.post("/refund", authMiddleware, processRefund ); // route สำหรับคืนสินค้า

export default router;
