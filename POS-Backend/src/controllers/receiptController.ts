import { Response } from "express";
import Receipt, { IReceipt } from "../models/Receipt";
import Payment from "../models/Payment";
import mongoose from "mongoose";
import { AuthRequest } from "../middlewares/authMiddleware";
import { resolveOwnerContext } from "../utils/tenant";

// 📌 ดึงใบเสร็จทั้งหมด + populate ข้อมูลการชำระเงิน
export const getAllReceipts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { ownerObjectId } = await resolveOwnerContext(req);
        const receipts = await Receipt.find({ userId: ownerObjectId })
            .populate({
                path: "paymentId",
                model: "Payment",
                select: "saleId paymentMethod amount status createdAt employeeName",
            })
            .sort({ timestamp: -1 }); // ✅ เรียงจากใหม่ไปเก่า

        res.status(200).json({ success: true, receipts });
    } catch (error) {
        if (
            error instanceof Error &&
            (error.message.includes("Owner") || error.message.includes("Invalid owner"))
        ) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        res.status(500).json({
            success: false,
            message: "เกิดข้อผิดพลาดในการดึงข้อมูลใบเสร็จทั้งหมด",
            error,
        });
    }
};

// 📌 ดึงใบเสร็จตาม paymentId + populate
export const getReceiptByPaymentId = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { ownerObjectId } = await resolveOwnerContext(req);
        const { paymentId } = req.params;

        // ✅ ตรวจว่าเป็น ObjectId ที่ถูกต้องไหม
        const isObjectId = mongoose.Types.ObjectId.isValid(paymentId);

        let receipt;

        if (isObjectId) {
            // 🔍 ถ้าเป็น ObjectId → หาโดยตรงจาก Receipt
            receipt = await Receipt.findOne({ paymentId, userId: ownerObjectId })
                .populate({
                    path: "paymentId",
                    model: "Payment",
                    select: "saleId paymentMethod amount status createdAt employeeName",
                });
        } else {
            // 🔍 ถ้าไม่ใช่ ObjectId → ไปหา Payment ที่มี saleId นี้ก่อน
            const payment = await Payment.findOne({ saleId: paymentId, userId: ownerObjectId });
            if (!payment) {
                res.status(404).json({ success: false, message: "ไม่พบข้อมูลการชำระเงินนี้" });
                return;
            }

            receipt = await Receipt.findOne({ paymentId: payment._id, userId: ownerObjectId })
                .populate({
                    path: "paymentId",
                    model: "Payment",
                    select: "saleId paymentMethod amount status createdAt employeeName",
                });
        }

        if (!receipt) {
            res.status(404).json({ success: false, message: "ไม่พบใบเสร็จ" });
            return;
        }

        res.status(200).json({ success: true, receipt });
    } catch (error) {
        console.error("❌ getReceiptByPaymentId error:", error);
        if (
            error instanceof Error &&
            (error.message.includes("Owner") || error.message.includes("Invalid owner"))
        ) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        res.status(500).json({
            success: false,
            message: "เกิดข้อผิดพลาดในการดึงใบเสร็จ",
            error,
        });
    }
};


// 📊 สรุปยอด (คงเดิม)
export const getReceiptSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { ownerObjectId } = await resolveOwnerContext(req);
        const now = new Date();

        // ช่วงเวลา
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now);
        const diffToMonday = (startOfWeek.getDay() + 6) % 7;
        startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Fields ที่ต้องการ
        const queryFields = "employeeName items totalPrice amountPaid changeAmount timestamp";

        // Query receipts
        const todayReceipts = await Receipt.find({ timestamp: { $gte: startOfToday }, userId: ownerObjectId }).select(queryFields);
        const weekReceipts = await Receipt.find({ timestamp: { $gte: startOfWeek }, userId: ownerObjectId }).select(queryFields);
        const monthReceipts = await Receipt.find({ timestamp: { $gte: startOfMonth }, userId: ownerObjectId }).select(queryFields);

        // รวมยอด
        const calcSummary = (receipts: IReceipt[]) => ({
            totalPrice: receipts.reduce((sum, r) => sum + (r.totalPrice || 0), 0),
            amountPaid: receipts.reduce((sum, r) => sum + (r.amountPaid || 0), 0),
            changeAmount: receipts.reduce((sum, r) => sum + (r.changeAmount || 0), 0),
            count: receipts.length,
            details: receipts.map((r) => ({
                employeeName: r.employeeName,
                timestamp: r.timestamp,
                items: r.items.map((i) => ({
                    name: i.name,
                    quantity: i.quantity,
                    subtotal: i.subtotal,
                })),
            })),
        });

        res.status(200).json({
            success: true,
            today: calcSummary(todayReceipts),
            thisWeek: calcSummary(weekReceipts),
            thisMonth: calcSummary(monthReceipts),
        });
    } catch (error) {
        if (
            error instanceof Error &&
            (error.message.includes("Owner") || error.message.includes("Invalid owner"))
        ) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        res.status(500).json({
            success: false,
            message: "เกิดข้อผิดพลาดในการดึงข้อมูล summary",
            error,
        });
    }
};

export const getReceiptBySaleId = async (req: AuthRequest, res: Response) => {
    try {
        const { ownerObjectId } = await resolveOwnerContext(req);
        const { saleId } = req.params;

        // ✅ ตรวจว่าเป็น ObjectId ไหม
        const isObjectId = mongoose.Types.ObjectId.isValid(saleId);

        let receipt;

        // 🧾 1. ถ้าเป็น ObjectId → หาโดย _id หรือ paymentId
        if (isObjectId) {
            receipt = await Receipt.findOne({
                userId: ownerObjectId,
                $or: [{ _id: saleId }, { paymentId: saleId }],
                isReturn: false,
            }).populate("paymentId");
        }
        // 🧾 2. ถ้าเป็นเลข saleId แบบ string → หาโดย saleId จาก Payment
        else {
            const payment = await Payment.findOne({ saleId, userId: ownerObjectId });
            if (!payment) {
                res.status(404).json({ success: false, message: "ไม่พบข้อมูลการขายนี้" });
                return;
            }

            receipt = await Receipt.findOne({
                userId: ownerObjectId,
                paymentId: payment._id,
                isReturn: false,
            }).populate("paymentId");
        }

        if (!receipt) {
            res.status(404).json({ success: false, message: "ไม่พบใบเสร็จนี้" });
            return;
        }

        res.status(200).json({ success: true, receipt });
    } catch (error) {
        console.error("❌ getReceiptBySaleId error:", error);
        if (
            error instanceof Error &&
            (error.message.includes("Owner") || error.message.includes("Invalid owner"))
        ) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// 📌 ลบใบเสร็จตาม paymentId
export const deleteReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { ownerObjectId } = await resolveOwnerContext(req);
        const { paymentId } = req.params;
        const deletedReceipt = await Receipt.findOneAndDelete({ paymentId, userId: ownerObjectId });

        if (!deletedReceipt) {
            res.status(404).json({ success: false, message: "ไม่พบใบเสร็จ" });
            return;
        }

        res.status(200).json({ success: true, message: "ลบใบเสร็จสำเร็จ" });
    } catch (error) {
        if (
            error instanceof Error &&
            (error.message.includes("Owner") || error.message.includes("Invalid owner"))
        ) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        res.status(500).json({
            success: false,
            message: "เกิดข้อผิดพลาดในการลบใบเสร็จ",
            error,
        });
    }
};

