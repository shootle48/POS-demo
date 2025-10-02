import { Request, Response } from "express";
import Receipt, { IReceipt } from "../models/Receipt";

// 📌 ฟังก์ชันดึงใบเสร็จทั้งหมด
export const getAllReceipts = async (req: Request, res: Response): Promise<void> => {
    try {
        const receipts = await Receipt.find().sort({ timestamp: -1 });

        const formattedReceipts = receipts.map(receipt => {
            const date = receipt.timestamp;
            return {
                ...receipt.toObject(),
                formattedDate: {
                    thai: date.toLocaleString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                    iso: date.toISOString()
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
        const now = new Date();
        
        // Calculate start dates
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Query with proper date handling
        const todayReceipts = await Receipt.find({ 
            timestamp: { $gte: startOfToday } 
        }).sort({ timestamp: 1 });

        const weekReceipts = await Receipt.find({ 
            timestamp: { $gte: startOfWeek } 
        }).sort({ timestamp: 1 });

        const monthReceipts = await Receipt.find({ 
            timestamp: { $gte: startOfMonth } 
        }).sort({ timestamp: 1 });

        // ปรับฟังก์ชัน calcSummary ให้จัดการ Date object อย่างถูกต้อง
        const calcSummary = (receipts: IReceipt[]) => ({
            totalPrice: receipts.reduce((sum, r) => sum + (r.totalPrice || 0), 0),
            amountPaid: receipts.reduce((sum, r) => sum + (r.amountPaid || 0), 0),
            changeAmount: receipts.reduce((sum, r) => sum + (r.changeAmount || 0), 0),
            profit: receipts.reduce((sum, r) => sum + (r.profit || 0), 0),
            count: receipts.length,
            details: receipts.map(r => {
                const date = new Date(r.timestamp);
                return {
                    employeeName: r.employeeName,
                    timestamp: date,
                    formattedDate: {
                        thai: date.toLocaleString('th-TH', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'long',
                            hour: '2-digit',
                            minute: '2-digit',
                        }),
                        iso: date.toISOString()
                    },
                    items: r.items.map(i => ({
                        name: i.name,
                        quantity: i.quantity,
                        subtotal: i.subtotal
                    }))
                };
            })
        });

        // Debug logs
        console.log('Today receipts:', todayReceipts.length);
        console.log('Week receipts:', weekReceipts.length);
        console.log('Month receipts:', monthReceipts.length);

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