import { Request, Response } from "express";
import mongoose from "mongoose";
import PurchaseOrder from "../models/PurchaseOrder";
import { verifyToken } from "../utils/auth";
import { generateInvoiceNumber } from "../utils/generateInvoice";
import { generateBatchNumber } from "../utils/generateBatch";

import Stock from "../models/Stock";
import StockLot from "../models/StockLot";
import Supplier from "../models/Supplier";
import Warehouse from "../models/Warehouse";
import Product from "../models/Product";
import StockTransaction from "../models/StockTransaction";

import User from "../models/User";
import Employee from "../models/Employee";

/* ========================================================
   🔧 Helper: หา document จาก id หรือชื่อ
======================================================== */
async function ensureObjectIdOrByName(model: any, value: any, nameField: string) {
    if (!value) return null;
    if (mongoose.Types.ObjectId.isValid(value)) {
        return await model.findById(value).lean();
    }
    return await model.findOne({ [nameField]: value }).lean();
}

/* ========================================================
   🔑 Helper: resolve ownerId (string เสมอ)
======================================================== */
async function getOwnerId(userId: string): Promise<string> {
    let user: any = await User.findById(userId).lean();
    if (!user) user = await Employee.findById(userId).lean();
    if (!user) throw new Error("User not found");

    if (user.role === "admin") return user._id.toString();
    if (user.role === "employee") {
        if (!user.adminId) throw new Error("Employee does not have admin assigned");
        return user.adminId.toString();
    }
    throw new Error("Invalid user role");
}

/* ========================================================
   🧰 Scope ที่ “แมตช์ให้เจอให้ได้”
   - รองรับ userId แบบ ObjectId และ string
   - ครอบคลุมกรณีสร้างโดย employee (createdBy = actor)
======================================================== */
function buildPoScope(ownerId: string, actorId?: string) {
    const or: any[] = [
        { userId: new mongoose.Types.ObjectId(ownerId) },
        { userId: ownerId },
    ];
    if (actorId) {
        // PO เก่าๆ ที่ไม่ได้เซ็ต userId แต่มี createdBy เป็นคนกดสร้าง
        or.push({ createdBy: actorId });
        // บางระบบเคยใช้ userId = actorId
        or.push({ userId: actorId });
        // และเผื่อกรณีเป็น ObjectId
        if (mongoose.Types.ObjectId.isValid(actorId)) {
            or.push({ createdBy: new mongoose.Types.ObjectId(actorId) });
            or.push({ userId: new mongoose.Types.ObjectId(actorId) });
        }
    }
    return { $or: or };
}

/* ==========================
   ดึงรายการ Purchase Orders ทั้งหมด (ของ owner)
========================== */
export const getPurchaseOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const raw = req.headers["authorization"];
        const token = typeof raw === "string" ? raw.split(" ")[1] : undefined;
        if (!token) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
        const decoded = verifyToken(token);
        if (typeof decoded === "string" || !("userId" in decoded)) {
            res.status(401).json({ success: false, message: "Invalid token" }); return;
        }
        const actorId = decoded.userId;
        const ownerId = await getOwnerId(actorId);

        const orders = await PurchaseOrder.find(buildPoScope(ownerId, actorId))
            .populate("supplierId")
            .populate("location")
            .populate("createdBy")
            .populate("updatedBy")
            .populate("items.productId", "name barcode")
            .populate("items.stockId")
            .populate("stockLots", "_id batchNumber status qcStatus")
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({ success: true, message: "ดึงรายการ PO สำเร็จ", data: orders || [] });
    } catch (error) {
        console.error("Get PO Error:", error);
        res.status(500).json({ success: false, message: "Server error while fetching POs" });
    }
};

/* ==========================
   📄 ดึงรายละเอียด PO ตาม ID (ของ owner)
========================== */
export const getPurchaseOrderById = async (req: Request, res: Response): Promise<void> => {
    try {
        const raw = req.headers["authorization"];
        const token = typeof raw === "string" ? raw.split(" ")[1] : undefined;
        if (!token) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
        const decoded = verifyToken(token);
        if (typeof decoded === "string" || !("userId" in decoded)) {
            res.status(401).json({ success: false, message: "Invalid token" }); return;
        }
        const actorId = decoded.userId;
        const ownerId = await getOwnerId(actorId);

        const { id } = req.params;

        const po = await PurchaseOrder.findOne({ _id: id, ...buildPoScope(ownerId, actorId) })
            .populate("supplierId", "companyName phoneNumber email")
            .populate("location", "name code")
            .populate("createdBy", "username email role")
            .populate("updatedBy", "username email role")
            .populate("items.productId", "name barcode")
            .populate("items.stockId", "totalQuantity status")
            .populate({
                path: "stockLots",
                populate: [
                    { path: "productId", select: "name barcode" },
                    { path: "stockId", select: "totalQuantity status" },
                    { path: "supplierId", select: "companyName" },
                    { path: "location", select: "name" },
                ],
            })
            .lean();

        if (!po) { res.status(404).json({ success: false, message: "ไม่พบ PurchaseOrder" }); return; }

        res.status(200).json({ success: true, message: "ดึงข้อมูล PO สำเร็จ ✅", data: po });
    } catch (error) {
        console.error("❌ Get PO By ID Error:", error);
        res.status(500).json({ success: false, message: "Server error while fetching PO" });
    }
};

/* ==========================
   📋 ดึงรายการ PO ทั้งหมด (สรุป) ของ owner
========================== */
export const getAllPurchaseOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const raw = req.headers["authorization"];
        const token = typeof raw === "string" ? raw.split(" ")[1] : undefined;
        if (!token) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
        const decoded = verifyToken(token);
        if (typeof decoded === "string" || !("userId" in decoded)) {
            res.status(401).json({ success: false, message: "Invalid token" }); return;
        }
        const actorId = decoded.userId;
        const ownerId = await getOwnerId(actorId);

        const purchaseOrders = await PurchaseOrder.find(buildPoScope(ownerId, actorId))
            .populate("supplierId", "companyName")
            .populate("location", "name code")
            .populate("stockLots", "_id status qcStatus")
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            message: "ดึงรายการใบสั่งซื้อสำเร็จ ✅",
            data: (purchaseOrders || []).map((po: any) => ({
                _id: po._id,
                purchaseOrderNumber: po.purchaseOrderNumber,
                supplierCompany: po?.supplierId?.companyName || "ไม่ระบุ",
                totalLots: (po?.stockLots || []).length || 0,
                qcStatus: po?.qcStatus || "รอตรวจสอบ",
                status: po.status,
                createdAt: po.createdAt,
            })),
        });
    } catch (error) {
        console.error("❌ Get All PO Error:", error);
        res.status(500).json({ success: false, message: "ไม่สามารถดึงข้อมูลใบสั่งซื้อได้", error });
    }
};

/* ========================================================
   🧾 CREATE PURCHASE ORDER → บันทึก userId เป็น "string" (มาตรฐาน)
======================================================== */
export const createPurchaseOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const raw = req.headers["authorization"];
        const token = typeof raw === "string" ? raw.split(" ")[1] : undefined;
        if (!token) { res.status(401).json({ success: false, message: "Unauthorized, no token" }); return; }

        const decoded = verifyToken(token);
        if (typeof decoded === "string" || !("userId" in decoded)) {
            res.status(401).json({ success: false, message: "Invalid token" }); return;
        }
        const actorId = decoded.userId;
        const ownerId = await getOwnerId(actorId); // ← string

        const { purchaseOrderNumber, supplierId, supplierCompany, location, items, invoiceNumber } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            res.status(400).json({ success: false, message: "Items are required" }); return;
        }

        const supplierDoc = await ensureObjectIdOrByName(Supplier, supplierId, "companyName");
        if (!supplierDoc) { res.status(400).json({ success: false, message: "ไม่พบ Supplier" }); return; }

        const warehouseDoc =
            (await ensureObjectIdOrByName(Warehouse, location, "name")) ||
            (await Warehouse.findOne({ name: location }).lean());
        if (!warehouseDoc) { res.status(400).json({ success: false, message: "ไม่พบคลังสินค้า" }); return; }

        const itemsWithTotal = items.map((it: any) => ({
            ...it,
            total: Number(it.quantity || 0) * Number(it.costPrice || 0),
        }));
        const totalAmount = itemsWithTotal.reduce((sum: number, it: any) => sum + Number(it.total || 0), 0);

        const po = await PurchaseOrder.create({
            userId: ownerId, // ⬅ เซ็ตเป็น string ให้สม่ำเสมอ
            purchaseOrderNumber,
            supplierId: (supplierDoc as any)._id,
            supplierCompany: supplierCompany ?? (supplierDoc as any).companyName,
            location: (warehouseDoc as any)._id,
            items: itemsWithTotal,
            totalAmount,
            invoiceNumber: invoiceNumber || generateInvoiceNumber(),
            createdBy: actorId, // คนกดสร้าง (employee/admin)
            status: "รอดำเนินการ",
            stockLots: [],
        });

        res.status(201).json({ success: true, message: "สร้างใบสั่งซื้อสำเร็จ", data: po });
    } catch (error) {
        console.error("❌ Create PO Error:", error);
        res.status(500).json({ success: false, message: "Server error while creating PO" });
    }
};

/* ========================================================
   ✅ CONFIRM PO → ผูก owner บน stock/lot
======================================================== */
export const confirmPurchaseOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const raw = req.headers["authorization"];
        const token = typeof raw === "string" ? raw.split(" ")[1] : undefined;
        if (!token) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
        const decoded = verifyToken(token);
        if (typeof decoded === "string" || !("userId" in decoded)) {
            res.status(401).json({ success: false, message: "Invalid token" }); return;
        }
        const actorId = decoded.userId;
        const ownerId = await getOwnerId(actorId);
        const ownerObjId = new mongoose.Types.ObjectId(ownerId);

        const po = await PurchaseOrder.findOne({ _id: id, ...buildPoScope(ownerId, actorId) });
        if (!po) { res.status(404).json({ success: false, message: "ไม่พบใบสั่งซื้อ" }); return; }
        if (po.status !== "รอดำเนินการ") {
            res.status(400).json({ success: false, message: "PO นี้ถูกยืนยันแล้ว" }); return;
        }

        const supplierDoc = await Supplier.findById(po.supplierId).lean<{ _id: mongoose.Types.ObjectId; companyName: string; code?: string } | null>();
        const warehouseDoc = await Warehouse.findById(po.location).lean<{ _id: mongoose.Types.ObjectId; name: string; code?: string } | null>();
        if (!supplierDoc || !warehouseDoc) {
            res.status(400).json({ success: false, message: "ไม่พบข้อมูล Supplier หรือ Warehouse" }); return;
        }

        const supplierCode = supplierDoc.code ?? "SP00";
        const warehouseCode = warehouseDoc.code ?? "WH00";
        const stockLotIds: mongoose.Types.ObjectId[] = [];

        for (const rawItem of (po.items as any[])) {
            const batchNumber =
                rawItem.batchNumber && String(rawItem.batchNumber).trim() !== ""
                    ? String(rawItem.batchNumber).trim()
                    : await generateBatchNumber(warehouseCode, supplierCode, rawItem.productId.toString());

            const productDoc = await Product.findById(rawItem.productId)
                .select("barcode name")
                .lean<{ _id: mongoose.Types.ObjectId; barcode: string; name: string } | null>();
            if (!productDoc) continue;

            let stock = await Stock.findOne({
                userId: ownerObjId,
                productId: rawItem.productId,
                location: warehouseDoc._id,
            });

            if (!stock) {
                stock = await Stock.create({
                    userId: ownerObjId,
                    productId: rawItem.productId,
                    supplierId: supplierDoc._id,
                    supplierName: supplierDoc.companyName,
                    location: warehouseDoc._id,
                    barcode: productDoc.barcode,
                    totalQuantity: 0,
                    threshold: rawItem.threshold ?? 5,
                    status: "สินค้าพร้อมขาย",
                    isActive: true,
                });
            }

            const stockLot = await StockLot.create({
                stockId: stock._id,
                productId: rawItem.productId,
                supplierId: supplierDoc._id,
                supplierName: supplierDoc.companyName,
                userId: ownerObjId, // ผูก owner
                location: warehouseDoc._id,
                purchaseOrderNumber: po.purchaseOrderNumber,
                barcode: productDoc.barcode,
                batchNumber,
                expiryDate: rawItem.expiryDate,
                quantity: rawItem.quantity,
                costPrice: rawItem.costPrice,
                salePrice: rawItem.salePrice ?? rawItem.costPrice,
                status: "รอตรวจสอบ QC",
                isActive: false,
                isTemporary: true,
                purchaseOrderId: po._id,
            });

            rawItem.batchNumber = batchNumber;
            rawItem.stockLotId = stockLot._id;
            stockLotIds.push(stockLot._id);
        }

        po.status = "ได้รับสินค้าแล้ว";
        po.qcStatus = "รอตรวจสอบ";
        po.stockLots = stockLotIds;
        po.receivedAt = new Date();
        po.updatedBy = actorId;
        po.markModified("items");
        await po.save();

        res.status(200).json({
            success: true,
            message: "✅ ยืนยันใบสั่งซื้อสำเร็จ (สร้างล็อตและ batchNumber แล้ว)",
            data: po,
        });
    } catch (error) {
        console.error("❌ Confirm PO Error:", error);
        res.status(500).json({ success: false, message: "Server error while confirming PO" });
    }
};

/* ========================================================
   🔁 RETURN PURCHASE ORDER
======================================================== */
export const returnPurchaseOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const raw = req.headers["authorization"];
        const token = typeof raw === "string" ? raw.split(" ")[1] : undefined;
        if (!token) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }
        const decoded = verifyToken(token);
        if (typeof decoded === "string" || !("userId" in decoded)) {
            res.status(401).json({ success: false, message: "Invalid token" }); return;
        }
        const actorId = decoded.userId;
        const ownerId = await getOwnerId(actorId);
        const ownerObjId = new mongoose.Types.ObjectId(ownerId);

        const po = await PurchaseOrder.findOne({ _id: id, ...buildPoScope(ownerId, actorId) });
        if (!po) { res.status(404).json({ success: false, message: "ไม่พบ PurchaseOrder" }); return; }
        if (po.status !== "ไม่ผ่าน QC - รอส่งคืนสินค้า") {
            res.status(400).json({ success: false, message: "PO นี้ไม่สามารถคืนสินค้าได้" }); return;
        }

        for (const item of (po.items as any[])) {
            const lot = await StockLot.findOne({ _id: item.stockLotId, userId: ownerObjId });
            if (!lot) continue;

            lot.status = "รอคัดออก";
            lot.isActive = false;
            lot.isTemporary = true;
            await lot.save();

            await StockTransaction.create({
                userId: ownerObjId,
                stockId: (lot as any).stockId,
                productId: (lot as any).productId,
                stockLotId: lot._id,
                type: "RETURN",
                quantity: item.quantity,
                costPrice: item.costPrice,
                notes: `คืนสินค้า | PO ${po.purchaseOrderNumber} | Batch ${lot.batchNumber}`,
            });
        }

        po.status = "ไม่ผ่าน QC - คืนสินค้าแล้ว";
        po.returnedAt = new Date();
        po.updatedBy = actorId;
        await po.save();

        res.status(200).json({ success: true, message: "คืนสินค้าเรียบร้อย ✅", data: po });
    } catch (error) {
        console.error("❌ Return PO Error:", error);
        res.status(500).json({ success: false, message: "Server error while returning PO" });
    }
};

/* ========================================================
   ❌ CANCEL PURCHASE ORDER
======================================================== */
export const cancelPurchaseOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const raw = req.headers["authorization"];
        const token = typeof raw === "string" ? raw.split(" ")[1] : undefined;
        if (!token) { res.status(401).json({ success: false, message: "Unauthorized, no token" }); return; }
        const decoded = verifyToken(token);
        if (typeof decoded === "string" || !("userId" in decoded)) {
            res.status(401).json({ success: false, message: "Invalid token" }); return;
        }
        const actorId = decoded.userId;
        const ownerId = await getOwnerId(actorId);

        const { id } = req.params;
        const po = await PurchaseOrder.findOne({ _id: id, ...buildPoScope(ownerId, actorId) });
        if (!po) { res.status(404).json({ success: false, message: "ไม่พบ PurchaseOrder" }); return; }

        if (po.status !== "รอดำเนินการ") {
            res.status(400).json({
                success: false,
                message: "ไม่สามารถยกเลิก PO ที่ได้รับสินค้าแล้วหรืออยู่ในขั้นตอน QC ได้",
            });
            return;
        }

        po.status = "ยกเลิก";
        po.updatedBy = actorId;
        await po.save();

        const lotIds = (po.items as any[]).map(x => x.stockLotId).filter(Boolean);
        if (lotIds.length > 0) {
            await StockLot.deleteMany({
                _id: { $in: lotIds },
                userId: new mongoose.Types.ObjectId(ownerId),
            });
        }

        res.status(200).json({ success: true, message: "ยกเลิก PO สำเร็จ ✅", data: po });
    } catch (error) {
        console.error("❌ Cancel PO Error:", error);
        res.status(500).json({ success: false, message: "Server error while cancelling PO" });
    }
};