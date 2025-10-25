import { Request, Response } from "express";
import Order from "../models/Order";
import Stock from "../models/Stock";
import StockLot from "../models/StockLot";
import StockTransaction from "../models/StockTransaction";

export const createOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { saleId, userId, items, paymentMethod, amount, amountReceived, change } = req.body;

        // ✅ 1. สร้าง Order
        const order = await Order.create({
            saleId,
            userId,
            items,
            paymentMethod,
            amount,
            amountReceived,
            change,
        });

        // ✅ 2. วนลดสต็อกในแต่ละสินค้า
        for (const item of items) {
            const stock = await Stock.findOne({ barcode: item.barcode });
            if (!stock) continue;

            const qtyToDeduct = Number(item.quantity) || 0;
            if (qtyToDeduct <= 0) continue;

            if (stock.totalQuantity < qtyToDeduct) {
                throw new Error(`สินค้า ${item.name} ไม่พอขาย (คงเหลือ ${stock.totalQuantity})`);
            }

            // ✅ ดึง lots ที่เหลือเรียงจากเก่าก่อน (FIFO)
            const lots = await StockLot.find({
                productId: stock.productId,
                remainingQty: { $gt: 0 },
                status: { $in: ["สินค้าพร้อมขาย", "active"] },
            }).sort({ expiryDate: 1, createdAt: 1 });

            let remainingToDeduct = qtyToDeduct;

            for (const lot of lots) {
                if (remainingToDeduct <= 0) break;

                const deductQty = Math.min(lot.remainingQty, remainingToDeduct);

                lot.remainingQty -= deductQty;
                remainingToDeduct -= deductQty;

                // ถ้า lot หมด remainingQty แล้ว อัปเดตสถานะ
                if (lot.remainingQty <= 0) {
                    lot.status = "สินค้าหมด";
                    lot.isClosed = true;
                }

                await lot.save();

                // ✅ สร้าง StockTransaction (ใส่ข้อมูลล็อตลงใน notes เดิม)
                const expiryText = lot.expiryDate
                    ? `วันหมดอายุ: ${new Date(lot.expiryDate).toLocaleDateString("th-TH")}`
                    : "ไม่ระบุวันหมดอายุ";

                await StockTransaction.create({
                    stockId: stock._id,
                    productId: stock.productId,
                    lotId: lot._id,
                    type: "SALE",
                    quantity: deductQty,
                    referenceId: order._id,
                    userId,
                    salePrice: item.price,
                    notes: `ขายล็อต ${lot.batchNumber || lot._id} (${deductQty} ชิ้น) | ${expiryText} | Order: ${saleId}`,
                });

                console.log(`🧾 ตัดล็อต ${lot.batchNumber} ออก ${deductQty} ชิ้น (เหลือ ${lot.remainingQty})`);
            }

            // ⚠️ ถ้า lot ทั้งหมดไม่พอขาย
            if (remainingToDeduct > 0) {
                throw new Error(`สินค้า ${item.name} ในล็อตไม่พอขาย (ขาด ${remainingToDeduct} ชิ้น)`);
            }

            // ✅ อัปเดต Stock หลัก
            stock.totalQuantity -= qtyToDeduct;

            // ✅ อัปเดตสถานะสินค้า
            if (stock.totalQuantity <= 0) {
                stock.status = "สินค้าหมด";
                stock.isActive = false;
            } else if (stock.threshold && stock.totalQuantity <= stock.threshold) {
                stock.status = "สินค้าเหลือน้อย";
            } else {
                stock.status = "สินค้าพร้อมขาย";
            }

            await stock.save();

            console.log(`📦 Stock Updated: ${item.name} (-${qtyToDeduct})`);
        }

        res.status(201).json({
            success: true,
            message: "✅ สร้าง Order และตัดล็อตสำเร็จ (บันทึกหมายเหตุล็อตใน Transaction)",
            data: order,
        });
    } catch (error: any) {
        console.error("❌ Create Order Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Server error while creating order",
        });
    }
};
