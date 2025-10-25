import { Request, Response } from "express";
import mongoose from "mongoose";
import QC from "../models/QualityControl";
import Product from "../models/Product";
import Stock from "../models/Stock";
import StockLot from "../models/StockLot";
import Supplier from "../models/Supplier";
import Warehouse from "../models/Warehouse";
import PurchaseOrder from "../models/PurchaseOrder";
import StockTransaction from "../models/StockTransaction";
import cloudinary from "../utils/cloudinary";
import { verifyToken } from "../utils/auth";
import { updateStockTotalFromLots } from "../utils/qcHelpers";
import { ReturnDocument } from "mongodb";

/* =========================================================
   Helpers
========================================================= */
function getUserIdFromReq(req: Request): string | null {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return null;
    const decoded = verifyToken(token);
    if (typeof decoded === "string" || !("userId" in decoded)) return null;
    return decoded.userId as string;
}

/* =========================================================
   CREATE QC RECORD (แนบรูป + อัปเดตวันหมดอายุใน StockLot)
========================================================= */
/* =========================================================
   CREATE QC RECORD (แนบรูป + อัปเดตวันหมดอายุใน StockLot)
========================================================= */
export const createQCRecord = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = getUserIdFromReq(req);
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const {
            batchNumber,
            productId,
            supplierId,
            warehouseId,
            temperature,
            humidity,
            status,
            issues,
            remarks,
            expiryDate,
            totalQuantity,
            failedQuantity,
            passedQuantity,
        } = req.body;

        if (!batchNumber || !productId || !supplierId || !warehouseId) {
            res.status(400).json({ success: false, message: "Missing required fields" });
            return;
        }

        const [product, supplier, warehouse] = await Promise.all([
            Product.findById(productId),
            Supplier.findById(supplierId),
            Warehouse.findById(warehouseId),
        ]);

        if (!product || !supplier || !warehouse) {
            res.status(404).json({
                success: false,
                message: "Product / Supplier / Warehouse not found",
            });
            return;
        }

        const lot = await StockLot.findOne({ batchNumber });
        if (!lot) {
            res.status(404).json({ success: false, message: "ไม่พบล็อตสินค้าที่ตรงกับ batchNumber" });
            return;
        }

        /* =====================================================
           ✅ Upload attachments (รองรับหลายไฟล์)
        ===================================================== */
        let attachments: { url: string; public_id: string }[] = [];

        if (req.files && Object.keys(req.files).length > 0) {
            const filesArray = Array.isArray(req.files)
                ? req.files
                : Object.values(req.files).flat();

            for (const file of filesArray as Express.Multer.File[]) {
                const result = await new Promise<{ url: string; public_id: string }>(
                    (resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: "qc", resource_type: "image" },
                            (err, result) => {
                                if (err || !result) {
                                    console.error("❌ Upload error:", err);
                                    return reject(err);
                                }
                                resolve({
                                    url: result.secure_url,
                                    public_id: result.public_id,
                                });
                            }
                        );
                        uploadStream.end(file.buffer);
                    }
                );
                attachments.push(result);
            }
        }

        // ✅ บันทึกข้อมูล QC
        const qcRecord = await QC.create({
            batchNumber,
            productId,
            supplierId,
            warehouseId,
            userId,
            temperature,
            humidity,
            status: status || "รอตรวจสอบ",
            issues: issues || [],
            remarks,
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            totalQuantity: Number(totalQuantity) || 0,
            failedQuantity: Number(failedQuantity) || 0,
            passedQuantity: Number(passedQuantity) || 0,
            attachments,
        });

        // ✅ Sync สถานะกับ StockLot
        lot.qcStatus = status || "รอตรวจสอบ";
        lot.status = "รอตรวจสอบ QC";
        if (expiryDate) lot.expiryDate = expiryDate;

        // ✅ เพิ่ม returnStatus (เพื่อใช้บน UI)
        switch (status) {
            case "ผ่าน":
                lot.returnStatus = null;
                break;
            case "ไม่ผ่าน":
                lot.returnStatus = "รอคืนสินค้า";
                break;
            case "ผ่านบางส่วน":
            case "ตรวจบางส่วน":
                lot.returnStatus = "ยังไม่คืน";
                break;
            default:
                lot.returnStatus = null;
        }

        await lot.save();

        const updatedLot = await StockLot.findOne({ batchNumber });

        res.status(201).json({
            success: true,
            message: "✅ บันทึกข้อมูลการตรวจสอบคุณภาพสำเร็จ และอัปโหลดรูปเรียบร้อย",
            data: { qcRecord, updatedLot },
        });
    } catch (error) {
        console.error("❌ createQCRecord Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


/* =========================================================
   ดึงข้อมูล QC ตาม batchNumber (แนบ expiryDate ถ้ามี)
========================================================= */
export const getQCByBatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const { batchNumber } = req.params;

        // ✅ ดึงข้อมูล QC ของ batch นั้น
        const qcRecord = await QC.find({ batchNumber })
            .populate("productId", "name barcode")
            .populate("supplierId", "companyName code")
            .populate("warehouseId", "name location")
            .populate("userId", "username email");

        if (!qcRecord || qcRecord.length === 0) {
            res.status(404).json({
                success: false,
                message: "ไม่พบข้อมูล QC สำหรับล็อตนี้",
            });
            return;
        }

        // ✅ ตรวจสอบว่ามี StockLot แล้วหรือยัง (อาจยังไม่สร้าง)
        const lot = await StockLot.findOne(
            { batchNumber: new RegExp(`^${batchNumber}$`, "i") },
            "expiryDate"
        );

        // ✅ แนบ expiryDate เฉพาะกรณีที่มี lot
        const enriched = qcRecord.map((record) => ({
            ...record.toObject(),
            expiryDate: lot?.expiryDate || record.expiryDate || null,
        }));

        res.status(200).json({
            success: true,
            message: "ดึงข้อมูล QC สำเร็จ",
            data: enriched,
        });
    } catch (error) {
        console.error("❌ getQCByBatch Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


export const updateQCStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // ✅ ตรวจ token
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

        const userId = (decoded as any).userId;
        const po = await PurchaseOrder.findById(id);
        if (!po) {
            res.status(404).json({ success: false, message: "ไม่พบใบสั่งซื้อ" });
            return;
        }

        po.updatedBy = userId;

        // 🧩 Helper
        const normalizeQCStatus = (v: string) => (v === "รอตรวจ" ? "รอตรวจสอบ" : v);
        const mapQCToPOStatus = (qc: string): string => {
            switch (qc) {
                case "ผ่าน": return "QC ผ่าน";
                case "ไม่ผ่าน": return "ไม่ผ่าน QC - รอส่งคืนสินค้า";
                case "ผ่านบางส่วน":
                case "ตรวจบางส่วน": return "QC ผ่านบางส่วน";
                default: return "รอดำเนินการ";
            }
        };

        let passedCount = 0;
        let failedCount = 0;
        let partialCount = 0;
        let restockedCount = 0;
        const totalCount = po.items?.length || 0;

        const updatedLots: any[] = [];
        const stockTransactions: any[] = [];

        // 🔁 Loop ผ่านทุกสินค้าใน PO
        for (const item of po.items as any[]) {
            const lot = await StockLot.findOne({ batchNumber: item.batchNumber });
            if (!lot) continue;

            const qcStatus = lot.qcStatus || "รอตรวจสอบ";

            // 🔒 ถ้าล็อตถูกเติมแล้ว → ข้าม
            if (lot.isStocked) {
                item.qcStatus = qcStatus;
                if (qcStatus === "ผ่าน") passedCount++;
                if (qcStatus === "ไม่ผ่าน") failedCount++;
                if (qcStatus === "ผ่านบางส่วน") partialCount++;
                continue;
            }

            const stock = await Stock.findById(lot.stockId);
            if (!stock) continue;

            // ✅ ฟังก์ชันช่วยอัปเดตสถานะ stock ตาม threshold
            const updateStockStatus = async (stk: any) => {
                if (stk.totalQuantity <= 0) {
                    stk.status = "สินค้าหมด";
                    stk.isActive = false;
                } else if (stk.threshold && stk.totalQuantity <= stk.threshold) {
                    stk.status = "สินค้าเหลือน้อย";
                    stk.isActive = true;
                } else {
                    stk.status = "สินค้าพร้อมขาย";
                    stk.isActive = true;
                }
                await stk.save();
            };

            /* =========================================================
               ✅ 1. ผ่านทั้งหมด
            ========================================================== */
            if (qcStatus === "ผ่าน") {
                const existingLots = await StockLot.find({
                    productId: lot.productId,
                    location: lot.location,
                    isStocked: true,
                    isActive: true,
                    qcStatus: "ผ่าน",
                    _id: { $ne: lot._id },
                });

                // ถ้าไม่มีล็อตก่อนหน้า → เซตใหม่แทนการบวก
                if (existingLots.length === 0) {
                    stock.totalQuantity = lot.quantity;
                } else {
                    stock.totalQuantity = (stock.totalQuantity ?? 0) + lot.quantity;
                }

                stock.lastRestocked = new Date();
                await updateStockStatus(stock);

                // ✅ Transaction
                const txn = await StockTransaction.create({
                    stockId: stock._id,
                    productId: lot.productId,
                    stockLotId: lot._id,
                    type: "RESTOCK",
                    quantity: lot.quantity,
                    costPrice: lot.costPrice,
                    userId,
                    notes: `นำเข้าสินค้าจาก | PO ${po.purchaseOrderNumber} | รวมสต็อก = ${stock.totalQuantity} ชิ้น`,
                });
                stockTransactions.push(txn);

                // ✅ อัปเดต LOT
                lot.status = "สินค้าพร้อมขาย";
                lot.isActive = true;
                lot.isTemporary = false;
                lot.isStocked = true;
                lot.remainingQty = lot.quantity;
                lot.lastRestocked = new Date();
                lot.returnStatus = null; // ✅ ของใหม่
                await lot.save();

                item.qcStatus = "ผ่าน";
                passedCount++;
                restockedCount++;
                updatedLots.push(lot);
            }

            /* =========================================================
               ⚙️ 2. ผ่านบางส่วน
            ========================================================== */
            else if (qcStatus === "ผ่านบางส่วน") {
                const qcRecord = await QC.findOne({ batchNumber: lot.batchNumber });
                const passedQty = qcRecord?.passedQuantity ?? Math.floor(item.quantity / 2);
                const failedQty = item.quantity - passedQty;

                const existingLots = await StockLot.find({
                    productId: lot.productId,
                    location: lot.location,
                    isStocked: true,
                    isActive: true,
                    qcStatus: "ผ่าน",
                    _id: { $ne: lot._id },
                });

                if (existingLots.length === 0) {
                    stock.totalQuantity = passedQty;
                } else {
                    stock.totalQuantity = (stock.totalQuantity ?? 0) + passedQty;
                }

                stock.lastRestocked = new Date();
                await updateStockStatus(stock);

                // ✅ Transaction
                const txn = await StockTransaction.create({
                    stockId: stock._id,
                    productId: lot.productId,
                    stockLotId: lot._id,
                    type: "RESTOCK",
                    quantity: passedQty,
                    costPrice: lot.costPrice,
                    userId,
                    notes: `นำเข้าสินค้าบางส่วนจาก | PO ${po.purchaseOrderNumber} | รวมสต็อก = ${stock.totalQuantity} ชิ้น`,
                });
                stockTransactions.push(txn);

                // ✅ LOT
                lot.status = "สินค้าพร้อมขาย";
                lot.isActive = true;
                lot.isTemporary = false;
                lot.isStocked = true;
                lot.remainingQty = passedQty;
                lot.lastRestocked = new Date();
                lot.returnStatus = "ยังไม่คืน"; // ✅ ของใหม่
                await lot.save();

                item.qcStatus = "ผ่านบางส่วน";
                item.returnedQuantity = failedQty;
                partialCount++;
                restockedCount++;
                updatedLots.push(lot);
            }

            /* =========================================================
               ❌ 3. ไม่ผ่าน
            ========================================================== */
            else if (qcStatus === "ไม่ผ่าน") {
                lot.status = "รอคัดออก";
                lot.isActive = false;
                lot.isTemporary = true;
                lot.remainingQty = 0;
                lot.returnStatus = "รอคืนสินค้า"; // ✅ ของใหม่
                await lot.save();

                item.qcStatus = "ไม่ผ่าน";
                item.returnedQuantity = item.quantity;
                failedCount++;
                updatedLots.push(lot);
            }

            /* =========================================================
               🕐 4. รอตรวจสอบ
            ========================================================== */
            else {
                item.qcStatus = "รอตรวจสอบ";
                lot.returnStatus = null; // ✅ reset ไว้เฉย ๆ
                await lot.save();
            }
        }

        // ✅ สรุปสถานะรวม
        let newQCStatus = "รอตรวจสอบ";
        if (passedCount === totalCount) newQCStatus = "ผ่าน";
        else if (failedCount === totalCount) newQCStatus = "ไม่ผ่าน";
        else if (partialCount > 0 || (passedCount > 0 && failedCount > 0))
            newQCStatus = "ผ่านบางส่วน";
        else if (passedCount > 0 || failedCount > 0)
            newQCStatus = "ตรวจบางส่วน";

        po.qcStatus = normalizeQCStatus(newQCStatus);
        po.status = mapQCToPOStatus(po.qcStatus);
        po.qcCheckedAt = new Date();
        await po.save();

        // 🚫 ไม่มีสินค้าใดผ่านเลย
        if (passedCount === 0 && failedCount === 0 && partialCount === 0) {
            res.status(400).json({
                success: false,
                message: "⚠️ ยังไม่มีสินค้าผ่าน QC กรุณาตรวจอย่างน้อย 1 รายการก่อนสรุป",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: `✅ สรุป QC สำเร็จ (${passedCount} ผ่าน / ${failedCount} ไม่ผ่าน / ${partialCount} ผ่านบางส่วน / เติม ${restockedCount} ล็อต)`,
            data: { purchaseOrder: po, updatedLots, stockTransactions },
        });
    } catch (error) {
        console.error("❌ Update QC Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while updating QC",
        });
    }
};


/**
 * ลบข้อมูล QC
 * (หมายเหตุ: การลบ QC จะไม่ย้อนสถานะ LOT/Stock อัตโนมัติ เพื่อความปลอดภัยด้านข้อมูล)
 */
export const deleteQCRecord = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const qcRecord = await QC.findByIdAndDelete(id);
        if (!qcRecord) {
            res.status(404).json({ success: false, message: "ไม่พบข้อมูล QC" });
            return;
        }
        res.status(200).json({ success: true, message: "🗑️ ลบข้อมูล QC เรียบร้อย" });
    } catch (error) {
        console.error("❌ deleteQCRecord Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

