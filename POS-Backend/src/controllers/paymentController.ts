import { Request, Response } from "express";
import mongoose from "mongoose";
import Receipt from "../models/Receipt";
import Stock from "../models/Stock";
import StockTransaction from "../models/StockTransaction";
import Payment from "../models/Payment";
import { verifyToken } from "../utils/auth";

/* ============================================================
   🧾 สร้างการชำระเงิน (ทั้งขายและคืนสินค้า)
============================================================ */
export const createPayment = async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const token = req.header("Authorization")?.split(" ")[1];
        if (!token) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const decoded = verifyToken(token);
        if (typeof decoded === "string" || !("userId" in decoded)) {
            res.status(401).json({ success: false, message: "Invalid token" });
            return;
        }

        // ✅ รับค่าจาก body
        const {
            saleId,
            employeeName,
            paymentMethod,
            amountReceived,
            items,
            discount = 0, // ✅ เพิ่มส่วนลด
        } = req.body;

        if (!saleId || !employeeName || !paymentMethod || !amountReceived || !items?.length) {
            res.status(400).json({ success: false, message: "ข้อมูลไม่ครบถ้วน" });
            return;
        }

        // 💰 ดึงข้อมูลสินค้าและคำนวณกำไร
        const calculatedItems = await Promise.all(
            items.map(async (item: any) => {
                const stock = await Stock.findOne({ barcode: item.barcode });
                const costPrice = stock?.costPrice || 0;
                const profit = (item.price - costPrice) * item.quantity;
                return { ...item, profit };
            })
        );

        // ✅ คำนวณยอดรวมก่อนหักส่วนลด
        const subtotal = calculatedItems.reduce((sum, i) => sum + i.subtotal, 0);

        // ✅ คำนวณยอดรวมหลังหักส่วนลด
        const totalPrice = Math.max(subtotal - discount, 0);

        // ✅ คำนวณกำไรทั้งหมด
        const totalProfit = calculatedItems.reduce((sum, i) => sum + (i.profit || 0), 0);

        // 💵 คำนวณเงินทอน (เฉพาะการขายเงินสด)
        const changeAmount =
            paymentMethod === "เงินสด" && amountReceived ? amountReceived - totalPrice : 0;

        // ✅ 1. สร้าง Payment
        const [newPayment] = await Payment.create(
            [
                {
                    saleId,
                    employeeName,
                    paymentMethod,
                    type: "SALE",
                    amountReceived,
                    amount: totalPrice, // ✅ ใช้ยอดหลังหักส่วนลด
                    discount, // ✅ เพิ่มส่วนลด
                    profit: totalProfit,
                    status: "สำเร็จ",
                },
            ],
            { session }
        );

        // ✅ 2. สร้าง Receipt (ใช้ calculatedItems ที่มี profit ด้วย)
        const [newReceipt] = await Receipt.create(
            [
                {
                    paymentId: newPayment._id,
                    employeeName,
                    items: calculatedItems,
                    totalPrice,
                    discount, // ✅ บันทึกส่วนลดในใบเสร็จ
                    paymentMethod,
                    amountPaid: amountReceived,
                    changeAmount,
                    profit: totalProfit,
                    timestamp: new Date(),
                },
            ],
            { session }
        );

        // ✅ 3. อัปเดต Payment ให้เชื่อม Receipt
        await Payment.updateOne(
            { _id: newPayment._id },
            { $set: { receiptId: newReceipt._id } },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: "✅ บันทึกการขายและใบเสร็จสำเร็จ",
            payment: newPayment,
            receipt: newReceipt,
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("❌ Error in createPayment:", error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการบันทึก", error });
    }
};

/* ============================================================
   💳 ดึงข้อมูลการชำระเงินทั้งหมด
============================================================ */
export const getAllPayments = async (_: Request, res: Response): Promise<void> => {
    try {
        const payments = await Payment.find().populate("receiptId").sort({ createdAt: -1 });
        if (!payments.length) {
            res.status(404).json({ success: false, message: "ไม่พบข้อมูลการชำระเงิน" });
            return;
        }
        res.status(200).json({ success: true, data: payments });
    } catch (error) {
        console.error("Error retrieving all payments:", error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูลการชำระเงิน", error });
    }
};

/* ============================================================
   🔁 คืนสินค้า (ทั้งใบหรือบางรายการ)
============================================================ */
export const processRefund = async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const token = req.header("Authorization")?.split(" ")[1];
        if (!token) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const decoded = verifyToken(token);
        if (typeof decoded === "string" || !("userId" in decoded)) {
            res.status(401).json({ success: false, message: "Invalid token" });
            return;
        }

        // ✅ รองรับรับ items จาก body (คืนบางรายการ)
        const { saleId, reason, paymentMethod, items } = req.body;
        if (!saleId) {
            res.status(400).json({ success: false, message: "กรุณาระบุรหัสการขายหรือรหัสใบเสร็จ" });
            return;
        }
        if (!paymentMethod) {
            res.status(400).json({ success: false, message: "กรุณาระบุวิธีคืนเงิน" });
            return;
        }

        // ✅ ดึงใบเสร็จต้นฉบับ
        const isObjectId = mongoose.Types.ObjectId.isValid(saleId);
        const receipt = isObjectId
            ? await Receipt.findById(saleId).session(session)
            : await Receipt.findOne({ saleId }).session(session);

        if (!receipt) {
            res.status(404).json({ success: false, message: "ไม่พบใบเสร็จนี้" });
            return;
        }

        // 🚫 ป้องกันคืนซ้ำ
        if (receipt.isReturn || receipt.returnReceiptId) {
            res.status(400).json({
                success: false,
                message: "⚠️ ใบเสร็จนี้ได้ทำรายการคืนสินค้าไปแล้ว ไม่สามารถคืนซ้ำได้",
            });
            return;
        }


        const payment = await Payment.findById(receipt.paymentId).session(session);
        if (!payment) {
            res.status(404).json({ success: false, message: "ไม่พบข้อมูลการชำระเงินต้นทาง" });
            return;
        }

        // ✅ ใช้เฉพาะสินค้าที่เลือกมาคืน
        const refundItems = items && items.length > 0 ? items : receipt.items;

        // 💰 คำนวณยอดคืน/กำไรจากรายการที่เลือก
        const refundAmount = refundItems.reduce((sum: number, i: any) => sum + Math.abs(i.subtotal), 0);
        const refundProfit = refundItems.reduce((sum: number, i: any) => sum + Math.abs(i.profit || 0), 0);

        // 📦 คืนสินค้าเข้าสต็อกเฉพาะรายการที่เลือก
        for (const item of refundItems) {
            const stock = await Stock.findOne({ barcode: item.barcode }).session(session);
            if (stock) {
                stock.totalQuantity += item.quantity;
                await stock.save({ session });
                await stock.updateStatus();

                await StockTransaction.create(
                    [
                        {
                            stockId: stock._id,
                            productId: stock.productId,
                            userId: decoded.userId,
                            type: "RETURN",
                            quantity: item.quantity,
                            costPrice: stock.costPrice,
                            salePrice: item.price,
                            source: "CUSTOMER",
                            notes: `คืนสินค้า ${reason || "ไม่ระบุเหตุผล"}`,
                            referenceId: receipt._id,
                        },
                    ],
                    { session }
                );
            }
        }

        // 💳 สร้าง Payment ประเภท REFUND
        const [refundPayment] = await Payment.create(
            [
                {
                    saleId: payment.saleId,
                    employeeName: receipt.employeeName,
                    paymentMethod,
                    type: "REFUND",
                    amountReceived: refundAmount,
                    amount: -refundAmount,
                    profit: -refundProfit,
                    status: "สำเร็จ",
                    notes: reason || "คืนสินค้าบางรายการ",
                },
            ],
            { session }
        );

        // 🧾 สร้าง Receipt คืนสินค้าใหม่
        const [returnReceipt] = await Receipt.create(
            [
                {
                    paymentId: refundPayment._id,
                    originalReceiptId: receipt._id,
                    employeeName: receipt.employeeName,
                    items: refundItems.map((i: any) => ({
                        ...i,
                        subtotal: -Math.abs(i.subtotal),
                        profit: -(i.profit || 0),
                    })),
                    totalPrice: -refundAmount,
                    paymentMethod,
                    amountPaid: refundAmount,
                    changeAmount: 0,
                    isReturn: true,
                    returnReason: reason,
                    timestamp: new Date(),
                    profit: -refundProfit,
                },
            ],
            { session }
        );

        // 🔗 เชื่อม Payment ↔ Receipt
        refundPayment.receiptId = returnReceipt._id as any;
        await refundPayment.save({ session });

        // 🔗 เชื่อมใบเสร็จต้นฉบับ (บันทึก reference แต่ไม่บังคับว่าคืนครบทั้งใบ)
        await Receipt.updateOne(
            { _id: receipt._id },
            { $set: { returnReceiptId: returnReceipt._id } },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: "✅ คืนสินค้าสำเร็จ (บางรายการหรือทั้งใบ)",
            data: {
                originalReceipt: receipt,
                returnReceipt,
                refundPayment,
            },
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("❌ processRefund Error:", error);
        res.status(500).json({ success: false, message: "Server error", error });
    }
};