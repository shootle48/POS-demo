import { Request, Response } from "express";
import Receipt, { IReceipt } from "../models/Receipt";

// 📌 ฟังก์ชันดึงใบเสร็จทั้งหมด
export const getAllReceipts = async (req: Request, res: Response): Promise<void> => {
    try {
        // Get all receipts and sort by timestamp in descending order (newest first)
        const receipts = await Receipt.find().sort({ timestamp: -1 });

        // Transform receipts to include formatted dates
        const formattedReceipts = receipts.map(receipt => {
            const unixTimestamp = receipt.timestamp;
            const date = new Date(unixTimestamp * 1000); // Convert seconds to milliseconds

            return {
                ...receipt.toObject(),
                formattedDate: {
                    thai: date.toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                    iso: date.toISOString(),
                    unix: unixTimestamp
                }
            };
        });

        res.status(200).json({ 
            success: true, 
            receipts: formattedReceipts,
            count: receipts.length
        });
    } catch (error) {
        console.error('Error in getAllReceipts:', error);
        res.status(500).json({ 
            success: false, 
            message: "เกิดข้อผิดพลาดในการดึงข้อมูล", 
            error: error instanceof Error ? error.message : error 
        });
    }
};

// 📌 ฟังก์ชันดึงใบเสร็จตาม `saleId`
export const getReceiptByPaymentId = async (req: Request, res: Response): Promise<void> => {
    try {
        const { paymentId } = req.params;
        const receipt = await Receipt.findOne({ paymentId });

        if (!receipt) {
            res.status(404).json({ success: false, message: "ไม่พบใบเสร็จ" });
            return;
        }

        res.status(200).json({ success: true, receipt });
    } catch (error) {
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการดึงใบเสร็จ", error });
    }
};

// 📌 ฟังก์ชันลบใบเสร็จตาม `saleId`
export const deleteReceipt = async (req: Request, res: Response): Promise<void> => {
    try {
        const { paymentId } = req.params;
        const deletedReceipt = await Receipt.findOneAndDelete({ paymentId });
        
        if (!deletedReceipt) {
            res.status(404).json({ success: false, message: "ไม่พบใบเสร็จ" });
            return;
        }
        
        res.status(200).json({ success: true, message: "ลบใบเสร็จสำเร็จ" });
    } catch (error) {
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการลบใบเสร็จ", error });
    }
};

export const getReceiptSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const now = Math.floor(Date.now() / 1000); // Current UNIX timestamp in seconds
        const secondsInDay = 86400;
        
        // Calculate start timestamps
        const startOfToday = Math.floor(now / secondsInDay) * secondsInDay;
        
        // For week, first get current day (0 = Sunday, 6 = Saturday)
        const currentDay = new Date().getDay();
        const startOfWeek = startOfToday - (currentDay * secondsInDay);
        
        // For month, get first day of current month
        const currentDate = new Date();
        const startOfMonth = Math.floor(new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            1
        ).getTime() / 1000);

        // Debug logs
        console.log('Query timestamps:', {
            startOfToday,
            startOfWeek,
            startOfMonth,
            now
        });

        // Query with UNIX timestamps
        const todayReceipts = await Receipt.aggregate([
            {
                $match: {
                    timestamp: { $gte: startOfToday }
                }
            }
        ]);

        const weekReceipts = await Receipt.aggregate([
            {
                $match: {
                    timestamp: { $gte: startOfWeek }
                }
            }
        ]);

        const monthReceipts = await Receipt.aggregate([
            {
                $match: {
                    timestamp: { $gte: startOfMonth }
                }
            }
        ]);

        // เพิ่ม logging เพื่อดูผลลัพธ์
        console.log('Query results:', {
            todayCount: todayReceipts.length,
            weekCount: weekReceipts.length,
            monthCount: monthReceipts.length
        });

        // คงส่วน calcSummary ไว้เหมือนเดิม
        const calcSummary = (receipts: IReceipt[]) => ({
            totalPrice: receipts.reduce((sum, r) => sum + (r.totalPrice || 0), 0),
            amountPaid: receipts.reduce((sum, r) => sum + (r.amountPaid || 0), 0),
            changeAmount: receipts.reduce((sum, r) => sum + (r.changeAmount || 0), 0),
            count: receipts.length,
            details: receipts.map(r => ({
                employeeName: r.employeeName,
                timestamp: r.timestamp,
                items: r.items.map(i => ({
                    name: i.name,
                    quantity: i.quantity,
                    subtotal: i.subtotal
                }))
            }))
        });

        res.status(200).json({
            success: true,
            today: calcSummary(todayReceipts),
            thisWeek: calcSummary(weekReceipts),
            thisMonth: calcSummary(monthReceipts),
        });

    } catch (error) {
        console.error('Error in getReceiptSummary:', error);
        res.status(500).json({
            success: false,
            message: "เกิดข้อผิดพลาดในการดึงข้อมูล summary",
            error: error instanceof Error ? error.message : error
        });
    }
};