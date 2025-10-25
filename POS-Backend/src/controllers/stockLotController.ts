import { Request, Response } from "express";
import StockLot from "../models/StockLot";
import Stock from "../models/Stock";
import StockTransaction from "../models/StockTransaction";
import mongoose from "mongoose";
import Product from "../models/Product";
import User from "../models/User";
import Employee from "../models/Employee";
import { verifyToken } from "../utils/auth";


//หาค่า ownerId จาก userId (รองรับ admin / employee)
const getOwnerId = async (userId: string): Promise<string> => {
    let user = await User.findById(userId);
    if (!user) {
        user = await Employee.findById(userId);
    }
    if (!user) throw new Error("User not found");

    if (user.role === "admin") {
        return user._id.toString();
    } else if (user.role === "employee") {
        if (!user.adminId) throw new Error("Employee does not have admin assigned");
        return user.adminId.toString();
    } else {
        throw new Error("Invalid user role");
    }
};

/* ===================================================
   📦 ดึงข้อมูล StockLot ทั้งหมดของ user (owner)
=================================================== */
export const getStockLots = async (req: Request, res: Response): Promise<void> => {
    try {
        // ✅ ตรวจสอบ token
        const token = req.header("Authorization")?.split(" ")[1];
        if (!token) {
            res.status(401).json({ success: false, message: "Unauthorized, no token provided" });
            return;
        }

        const decoded = verifyToken(token);
        if (typeof decoded === "string" || !("userId" in decoded)) {
            res.status(401).json({ success: false, message: "Invalid token" });
            return;
        }

        const ownerId = await getOwnerId(decoded.userId);

        // ✅ ดึงข้อมูลล็อตทั้งหมดของ owner
        const stockLots = await StockLot.find({ userId: ownerId })
            .populate({
                path: "productId",
                populate: { path: "category" },
            })
            .populate("supplierId")
            .populate("location")
            .sort({ updatedAt: -1 });

        res.status(200).json({ success: true, data: stockLots });
    } catch (error) {
        console.error("Get StockLots Error:", error);
        res.status(500).json({ success: false, message: "Server error while fetching stock lots" });
    }
};

/* ===================================================
   🔎 กรองล็อตสินค้า
=================================================== */
export const filterStockLots = async (req: Request, res: Response): Promise<void> => {
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

        const ownerId = await getOwnerId(decoded.userId);
        const { status, qcStatus, warehouseId, supplierId } = req.query;

        const filter: any = { userId: ownerId };
        if (status) filter.status = status;
        if (qcStatus) filter.qcStatus = qcStatus;
        if (warehouseId) filter.location = warehouseId;
        if (supplierId) filter.supplierId = supplierId;

        const stockLots = await StockLot.find(filter)
            .populate("productId")
            .populate("supplierId", "name")
            .populate("location", "name")
            .sort({ updatedAt: -1 });

        res.status(200).json({ success: true, data: stockLots });
    } catch (error) {
        console.error("Filter StockLot Error:", error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการกรองล็อตสินค้า" });
    }
};


/* ===================================================
   🔍 ค้นหา StockLot ด้วย Barcode (สินค้าเดียว)
=================================================== */
export const getStockLotsByBarcode = async (req: Request, res: Response): Promise<void> => {
    try {
        const token = req.header("Authorization")?.split(" ")[1];
        if (!token) {
            res.status(401).json({ success: false, message: "Unauthorized, no token provided" });
            return;
        }

        const decoded = verifyToken(token);
        if (typeof decoded === "string" || !("userId" in decoded)) {
            res.status(401).json({ success: false, message: "Invalid token" });
            return;
        }

        const ownerId = await getOwnerId(decoded.userId);
        const { barcode } = req.params;

        // ✅ หา product จาก barcode
        const product = await Product.findOne({ barcode });
        if (!product) {
            res.status(404).json({ success: false, message: "ไม่พบสินค้าในระบบ" });
            return;
        }

        // ✅ ดึงล็อตทั้งหมดของสินค้านี้ (เฉพาะของ owner นี้)
        const stockLots = await StockLot.find({
            productId: product._id,
            userId: ownerId,
        })
            .populate("supplierId", "name")
            .populate("location", "name")
            .sort({ createdAt: -1 });

        const totalQuantity = stockLots.reduce((sum, lot) => sum + lot.quantity, 0);

        res.status(200).json({
            success: true,
            product: {
                _id: product._id,
                name: product.name,
                barcode: product.barcode,
                imageUrl: product.imageUrl,
                salePrice: product.salePrice,
                costPrice: product.costPrice,
            },
            totalLots: stockLots.length,
            totalQuantity,
            lots: stockLots,
        });
    } catch (error) {
        console.error("Get StockLotsByBarcode Error:", error);
        res.status(500).json({ success: false, message: "Server error while fetching stock lots by barcode" });
    }
};

/* ===================================================
   🗓️ อัปเดตวันหมดอายุของล็อต
=================================================== */
export const updateExpiryDate = async (req: Request, res: Response): Promise<void> => {
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

        const { lotId } = req.params;
        const { expiryDate } = req.body;

        const updated = await StockLot.findByIdAndUpdate(
            lotId,
            { expiryDate },
            { new: true }
        );

        if (!updated) {
            res.status(404).json({ success: false, message: "ไม่พบล็อตสินค้าที่ต้องการอัปเดต" });
            return;
        }

        res.status(200).json({ success: true, message: "อัปเดตวันหมดอายุสำเร็จ", data: updated });
    } catch (error) {
        console.error("Update Expiry Date Error:", error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการอัปเดตวันหมดอายุ" });
    }
};

/* ===================================================
   🧪 อัปเดตสถานะ QC ของล็อตสินค้า
=================================================== */
export const updateQCStatus = async (req: Request, res: Response): Promise<void> => {
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

        const { lotId } = req.params;
        const { qcStatus, notes } = req.body;

        const updated = await StockLot.findByIdAndUpdate(
            lotId,
            { qcStatus, notes },
            { new: true }
        );

        if (!updated) {
            res.status(404).json({ success: false, message: "ไม่พบล็อตสินค้า" });
            return;
        }

        res.status(200).json({
            success: true,
            message: `อัปเดตสถานะ QC เป็น "${qcStatus}" สำเร็จ`,
            data: updated,
        });
    } catch (error) {
        console.error("Update QC Error:", error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการอัปเดตสถานะ QC" });
    }
};

/* ===================================================
   🚫 ปิดล็อตสินค้า (Deactivate Stock Lot)
=================================================== */
export const deactivateStockLot = async (req: Request, res: Response): Promise<void> => {
    try {
        // ✅ ตรวจสอบ token และดึง userId
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

        const userId = decoded.userId;
        const { lotId } = req.params;
        const { reason = "พบสินค้าชำรุดหลัง QC", status = "สินค้าเสียหาย" } = req.body;

        // 🔍 1. หา lot
        const lot = await StockLot.findById(lotId);
        if (!lot) {
            res.status(404).json({ success: false, message: "ไม่พบล็อตสินค้าที่ต้องการปิด" });
            return;
        }

        // 🧩 ถ้าปิดไปแล้ว ไม่ให้ปิดซ้ำ
        if (!lot.isActive) {
            res.status(400).json({ success: false, message: "ล็อตนี้ถูกปิดไปแล้ว" });
            return;
        }

        // 🧮 2. คำนวณจำนวนที่เหลือในล็อต
        const lotQty = lot.remainingQty ?? lot.quantity ?? 0;

        // 📦 3. ลดจำนวนใน stock รวม
        const stock = await Stock.findOne({
            productId: lot.productId,
            location: lot.location,
        });

        if (stock) {
            const oldQty = stock.totalQuantity ?? 0;
            const newQty = Math.max(oldQty - lotQty, 0);
            stock.totalQuantity = newQty;
            await stock.save();

            console.log(`📉 ลดจำนวนใน Stock: ${oldQty} → ${newQty}`);
        }

        // 🧾 4. บันทึก StockTransaction (LOT_DEACTIVATE)
        await StockTransaction.create({
            stockId: stock?._id || new mongoose.Types.ObjectId(),
            stockLotId: lot._id,
            productId: lot.productId,
            userId,
            type: "LOT_DEACTIVATE",
            quantity: -Math.abs(lotQty),
            reference: `ปิดล็อต: ${lot.batchNumber || lot._id}`,
            notes: reason,
            source: "SELF",
            location: lot.location,
            costPrice: lot.costPrice ?? undefined,
        });

        // 🧍‍♂️ 5. ปรับสถานะใน StockLot
        lot.isActive = false;
        lot.status = status;
        lot.reason = reason;
        lot.closedBy = userId;
        lot.closedAt = new Date();
        await lot.save();

        // ✅ 6. ตอบกลับ
        res.status(200).json({
            success: true,
            message: "✅ ปิดล็อตสำเร็จ และลดจำนวนสต็อกออกแล้ว",
            data: {
                lotId: lot._id,
                batchNumber: lot.batchNumber,
                status: lot.status,
                reason: lot.reason,
                remainingQty: lot.remainingQty,
            },
        });
    } catch (error) {
        console.error("❌ Deactivate StockLot Error:", error);
        res.status(500).json({
            success: false,
            message: "เกิดข้อผิดพลาดในการปิดล็อต",
            error: error instanceof Error ? error.message : String(error),
        });
    }
};