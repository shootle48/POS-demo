import { Request, Response } from "express";
import mongoose from "mongoose";
import PurchaseOrder from "../models/PurchaseOrder";
import Employee from "../models/Employee";
import User from "../models/User";
import { verifyToken } from "../utils/auth";
import { generateInvoiceNumber } from "../utils/generateInvoice";
import { generateBatchNumber } from "../utils/generateBatch";

import Stock from "../models/Stock";
import StockLot from "../models/StockLot";
import Supplier from "../models/Supplier";
import Warehouse from "../models/Warehouse";
import Product from "../models/Product";
import StockTransaction from "../models/StockTransaction";

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

type DecodedToken = {
    userId: string;
    role?: string;
    adminId?: string;
    nameStore?: string;
};

async function resolveOwnerFromRequest(req: Request) {
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token) {
        throw new Error("Unauthorized");
    }

    const decoded = verifyToken(token) as DecodedToken | string;
    if (typeof decoded === "string" || !decoded?.userId) {
        throw new Error("Invalid token");
    }

    const role = decoded.role;
    const ownerId =
        role === "employee" && decoded.adminId
            ? decoded.adminId.toString()
            : decoded.userId.toString();

    if (!mongoose.Types.ObjectId.isValid(ownerId)) {
        throw new Error("Invalid owner identifier");
    }

    let storeName = decoded.nameStore;
    if (!storeName) {
        const owner = await User.findById(ownerId).select("nameStore").lean<{ nameStore?: string }>();
        storeName = owner?.nameStore;
    }

    return {
        decoded,
        token,
        ownerId,
        ownerObjectId: new mongoose.Types.ObjectId(ownerId),
        role,
        storeName,
    };
}

/* ==========================
   ดึงรายการ Purchase Orders ทั้งหมด
========================== */
export const getPurchaseOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ownerObjectId, decoded } = await resolveOwnerFromRequest(req);

        const relatedCreatorIds: mongoose.Types.ObjectId[] = [ownerObjectId];
        if (decoded.userId && mongoose.Types.ObjectId.isValid(decoded.userId)) {
            relatedCreatorIds.push(new mongoose.Types.ObjectId(decoded.userId));
        }

        const employees = await Employee.find({ adminId: ownerObjectId })
            .select("_id")
            .lean();
        employees.forEach((emp) => {
            if (emp?._id) {
                relatedCreatorIds.push(emp._id as mongoose.Types.ObjectId);
            }
        });

        const orders = await PurchaseOrder.find({
            $or: [
                { ownerId: ownerObjectId },
                { createdBy: { $in: relatedCreatorIds } },
            ],
        })
            .populate("supplierId")
            .populate("location") // คลัง
            .populate("createdBy")
            .populate("updatedBy")
            .populate("items.productId", "name barcode")
            .populate("items.stockId")
            .populate("stockLots", "_id batchNumber status qcStatus expiryDate")

            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, message: "ดึงรายการ PO สำเร็จ", data: orders });
    } catch (error) {
        console.error("Get PO Error:", error);
        if (
            error instanceof Error &&
            (error.message.includes("Unauthorized") ||
                error.message.includes("Invalid owner") ||
                error.message.includes("Invalid token"))
        ) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        res.status(500).json({ success: false, message: "Server error while fetching POs" });
    }
};

/* ==========================
   📄 ดึงรายละเอียด PO ตาม ID
========================== */
export const getPurchaseOrderById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { ownerObjectId, decoded } = await resolveOwnerFromRequest(req);

        const relatedCreatorIds: mongoose.Types.ObjectId[] = [ownerObjectId];
        if (decoded.userId && mongoose.Types.ObjectId.isValid(decoded.userId)) {
            relatedCreatorIds.push(new mongoose.Types.ObjectId(decoded.userId));
        }

        const employees = await Employee.find({ adminId: ownerObjectId })
            .select("_id")
            .lean();
        employees.forEach((emp) => {
            const idValue = emp?._id as mongoose.Types.ObjectId | undefined;
            if (idValue) {
                relatedCreatorIds.push(idValue);
            }
        });

        const po = await PurchaseOrder.findOne({
            _id: id,
            $or: [{ ownerId: ownerObjectId }, { createdBy: { $in: relatedCreatorIds } }],
        })
            .populate("supplierId", "companyName phoneNumber email") // ดึงข้อมูล supplier เพิ่มเติม
            .populate("location", "name code") // คลังสินค้า
            .populate("createdBy", "username email role")
            .populate("updatedBy", "username email role")
            .populate("items.productId", "name barcode")
            .populate("items.stockId", "totalQuantity status")
            .populate({
                path: "stockLots", // ✅ เพิ่มส่วนนี้
                populate: [
                    { path: "productId", select: "name barcode" },
                    { path: "stockId", select: "totalQuantity status" },
                    { path: "supplierId", select: "companyName" },
                    { path: "location", select: "name" },
                ],
            });

        if (!po) {
            res.status(404).json({ success: false, message: "ไม่พบ PurchaseOrder" });
            return;
        }

        res.status(200).json({
            success: true,
            message: "ดึงข้อมูล PO สำเร็จ ✅",
            data: po,
        });
    } catch (error) {
        console.error("❌ Get PO By ID Error:", error);
        if (
            error instanceof Error &&
            (error.message.includes("Unauthorized") ||
                error.message.includes("Invalid owner") ||
                error.message.includes("Invalid token"))
        ) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        res.status(500).json({
            success: false,
            message: "Server error while fetching PO",
        });
    }
};
/* ==========================
   📋 ดึงรายการ PO ทั้งหมด
========================== */
export const getAllPurchaseOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ownerObjectId, decoded } = await resolveOwnerFromRequest(req);

        const relatedCreatorIds: mongoose.Types.ObjectId[] = [ownerObjectId];
        if (decoded.userId && mongoose.Types.ObjectId.isValid(decoded.userId)) {
            relatedCreatorIds.push(new mongoose.Types.ObjectId(decoded.userId));
        }

        const employees = await Employee.find({ adminId: ownerObjectId })
            .select("_id")
            .lean();
        employees.forEach((emp) => {
            const idValue = emp?._id as mongoose.Types.ObjectId | undefined;
            if (idValue) {
                relatedCreatorIds.push(idValue);
            }
        });

        const purchaseOrders = await PurchaseOrder.find({
            $or: [{ ownerId: ownerObjectId }, { createdBy: { $in: relatedCreatorIds } }],
        })
            .populate("supplierId", "companyName")
            .populate("location", "name code") // คลังสินค้า
            .populate("stockLots", "_id status qcStatus expiryDate") // ✅ ดึงเฉพาะ field ที่จำเป็น
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            message: "ดึงรายการใบสั่งซื้อสำเร็จ ✅",
            data: purchaseOrders.map((po) => ({
                _id: po._id,
                purchaseOrderNumber: po.purchaseOrderNumber,
                supplierCompany: po.supplierId?.companyName || "ไม่ระบุ",
                totalLots: po.stockLots?.length || 0, // ✅ เพิ่มนับจำนวนล็อตใน PO
                qcStatus: po.qcStatus || "รอตรวจสอบ",
                status: po.status,
                createdAt: po.createdAt,
            })),
        });
    } catch (error) {
        console.error("❌ Get All PO Error:", error);
        if (
            error instanceof Error &&
            (error.message.includes("Unauthorized") ||
                error.message.includes("Invalid owner") ||
                error.message.includes("Invalid token"))
        ) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        res.status(500).json({
            success: false,
            message: "ไม่สามารถดึงข้อมูลใบสั่งซื้อได้",
            error,
        });
    }
};
/* ========================================================
   🧾 CREATE PURCHASE ORDER
   → ยังไม่สร้าง StockLot (รอ confirm ก่อน)
======================================================== */
export const createPurchaseOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { decoded, ownerObjectId, storeName } = await resolveOwnerFromRequest(req);

        if (!mongoose.Types.ObjectId.isValid(decoded.userId)) {
            res.status(400).json({ success: false, message: "Invalid user identifier" });
            return;
        }

        const actorId = new mongoose.Types.ObjectId(decoded.userId);

        const { purchaseOrderNumber, supplierId, supplierCompany, location, items, invoiceNumber } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            res.status(400).json({ success: false, message: "Items are required" });
            return;
        }

        // 🔍 หา Supplier / Warehouse
        const supplierDoc = await ensureObjectIdOrByName(Supplier, supplierId, "companyName");
        if (!supplierDoc) {
            res.status(400).json({ success: false, message: "ไม่พบ Supplier" });
            return;
        }

        const warehouseDoc =
            (await ensureObjectIdOrByName(Warehouse, location, "name")) ||
            (await Warehouse.findOne({ name: location }).lean());
        if (!warehouseDoc) {
            res.status(400).json({ success: false, message: "ไม่พบคลังสินค้า" });
            return;
        }

        // ✅ สร้าง items พร้อมยอดรวม (แต่ยังไม่สร้าง lot)
        const itemsWithTotal = items.map((it: any) => ({
            ...it,
            total: Number(it.quantity || 0) * Number(it.costPrice || 0),
        }));

        const totalAmount = itemsWithTotal.reduce((sum: number, it: any) => sum + Number(it.total || 0), 0);

        // ✅ สร้าง PO จริง
        const po = await PurchaseOrder.create({
            ownerId: ownerObjectId,
            storeName,
            purchaseOrderNumber,
            supplierId: supplierDoc._id,
            supplierCompany: supplierCompany ?? supplierDoc.companyName,
            location: warehouseDoc._id,
            items: itemsWithTotal,
            totalAmount,
            invoiceNumber: invoiceNumber || generateInvoiceNumber(),
            createdBy: actorId,
            status: "รอดำเนินการ",
            stockLots: [], // ✅ ยังไม่มีล็อตตอนนี้
        });

        res.status(201).json({
            success: true,
            message: "สร้างใบสั่งซื้อสำเร็จ (ยังไม่สร้างล็อตสินค้า)",
            data: po,
        });
    } catch (error) {
        console.error("❌ Create PO Error:", error);
        if (
            error instanceof Error &&
            (error.message.includes("Unauthorized") ||
                error.message.includes("Invalid owner") ||
                error.message.includes("Invalid token"))
        ) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        res.status(500).json({
            success: false,
            message: "Server error while creating PO",
        });
    }
};

export const confirmPurchaseOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
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

        const po = await PurchaseOrder.findById(id);
        if (!po) {
            res.status(404).json({ success: false, message: "ไม่พบใบสั่งซื้อ" });
            return;
        }

        if (po.status !== "รอดำเนินการ") {
            res.status(400).json({ success: false, message: "PO นี้ถูกยืนยันแล้ว" });
            return;
        }

        const supplierDoc = await Supplier.findById(po.supplierId).lean<{
            _id: mongoose.Types.ObjectId;
            companyName: string;
            code?: string;
        } | null>();
        const warehouseDoc = await Warehouse.findById(po.location).lean<{
            _id: mongoose.Types.ObjectId;
            name: string;
            code?: string;
        } | null>();

        if (!supplierDoc || !warehouseDoc) {
            res.status(400).json({ success: false, message: "ไม่พบข้อมูล Supplier หรือ Warehouse" });
            return;
        }

        const supplierCode = supplierDoc.code ?? "SP00";
        const warehouseCode = warehouseDoc.code ?? "WH00";

        const stockLotIds: mongoose.Types.ObjectId[] = [];

        // ✅ วนสร้าง StockLot ทีละชิ้น
        for (const raw of po.items) {
            const batchNumber =
                raw.batchNumber && String(raw.batchNumber).trim() !== ""
                    ? String(raw.batchNumber).trim()
                    : await generateBatchNumber(warehouseCode, supplierCode, raw.productId.toString());

            const productDoc = await Product.findById(raw.productId)
                .select("barcode name")
                .lean<{ _id: mongoose.Types.ObjectId; barcode: string; name: string } | null>();

            if (!productDoc) {
                console.warn(`⚠️ ไม่พบสินค้า ID: ${raw.productId}`);
                continue;
            }

            let stock = await Stock.findOne({
                productId: raw.productId,
                location: warehouseDoc._id,
            });

            if (!stock) {
                stock = await Stock.create({
                    productId: raw.productId,
                    userId: decoded.userId,
                    supplierId: supplierDoc._id,
                    supplierName: supplierDoc.companyName,
                    location: warehouseDoc._id,
                    barcode: productDoc.barcode,
                    totalQuantity: 0,
                    threshold: raw.threshold ?? 5,
                    status: "สินค้าพร้อมขาย",
                    isActive: true,
                });
            }

            // ✅ สร้าง StockLot (รอตรวจสอบ QC)
            const stockLot = await StockLot.create({
                stockId: stock._id,
                productId: raw.productId,
                supplierId: supplierDoc._id,
                supplierName: supplierDoc.companyName,
                userId: decoded.userId,
                location: warehouseDoc._id,
                purchaseOrderNumber: po.purchaseOrderNumber,
                barcode: productDoc.barcode,
                batchNumber,
                expiryDate: raw.expiryDate,
                quantity: raw.quantity,
                costPrice: raw.costPrice,
                salePrice: raw.salePrice ?? raw.costPrice,
                status: "รอตรวจสอบ QC",
                isActive: false,
                isTemporary: true,
                purchaseOrderId: po._id,
            });

            // ✅ update item ใน PO ให้มี batchNumber ด้วย
            raw.batchNumber = batchNumber;
            stockLotIds.push(stockLot._id);
        }

        // ✅ update PO
        po.status = "ได้รับสินค้าแล้ว";
        po.qcStatus = "รอตรวจสอบ";
        po.stockLots = stockLotIds;
        po.receivedAt = new Date();
        po.updatedBy = (decoded as any).userId;
        po.markModified("items"); // ✅ แจ้ง mongoose ว่า items เปลี่ยนแล้ว

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
   🔁 RETURN PURCHASE ORDER (FULL RETURN)
   → ใช้ตอน QC ไม่ผ่าน และผู้ใช้กดคืนทั้งใบ (คืนเฉพาะที่ไม่ผ่าน)
======================================================== */
export const returnPurchaseOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
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

        const po = await PurchaseOrder.findById(id);
        if (!po) {
            res.status(404).json({ success: false, message: "ไม่พบ PurchaseOrder" });
            return;
        }

        // ✅ ตรวจสอบว่าสถานะสามารถคืนได้หรือไม่
        if (
            ![
                "ไม่ผ่าน QC - รอส่งคืนสินค้า",
                "QC ผ่านบางส่วน",
                "ไม่ผ่าน QC - คืนสินค้าบางส่วนแล้ว",
            ].includes(po.status)
        ) {
            res
                .status(400)
                .json({ success: false, message: `PO นี้ไม่สามารถคืนสินค้าได้ (${po.status})` });
            return;
        }

        // ✅ ดึง StockLots ที่เกี่ยวข้อง
        const lots = await StockLot.find({ batchNumber: { $in: po.items.map((i: any) => i.batchNumber) } });

        let totalReturnedValue = 0;
        const returnHistory: any[] = [];

        for (const item of po.items as any[]) {
            const lot = lots.find((l) => l.batchNumber === item.batchNumber);

            // 🔍 คืนเฉพาะล็อตที่ "ไม่ผ่าน" เท่านั้น
            if (!lot || lot.qcStatus !== "ไม่ผ่าน") continue;

            const quantity = item.quantity;
            const value = quantity * (item.costPrice || 0);
            totalReturnedValue += value;

            // ✅ Mark คืนในรายการสินค้า
            item.isReturned = true;
            item.returnedQuantity = quantity;
            item.returnedValue = value;

            // ✅ Log ประวัติการคืน
            returnHistory.push({
                productId: item.productId,
                productName: item.productName,
                batchNumber: item.batchNumber,
                returnedQuantity: quantity,
                returnedValue: value,
                returnedAt: new Date(),
                processedBy: (decoded as any).userId,
            });

            // ✅ อัปเดตสถานะล็อต
            lot.status = "รอคัดออก";
            lot.isActive = false;
            lot.isTemporary = true;
            await lot.save();
        }

        // ✅ อัปเดตยอดรวมหลังคืน
        const totalAmount = po.items.reduce(
            (sum: number, i: any) => sum + (i.total || 0),
            0
        );
        po.totalReturnedValue = totalReturnedValue;
        po.totalAmountAfterReturn = totalAmount - totalReturnedValue;

        // ✅ เก็บประวัติการคืน
        if (!(po as any).returnHistory) (po as any).returnHistory = [];
        po.returnHistory.push(...returnHistory);

        // ✅ ตรวจสอบว่าคืนครบทุก “ล็อตที่ไม่ผ่าน” แล้วหรือไม่
        const allFailLotsReturned = lots
            .filter((l) => l.qcStatus === "ไม่ผ่าน")
            .every((l) => l.isActive === false);

        // ✅ อัปเดตสถานะ PO
        po.status = allFailLotsReturned
            ? "ไม่ผ่าน QC - คืนสินค้าแล้ว"
            : "ไม่ผ่าน QC - คืนสินค้าบางส่วนแล้ว";

        po.returnedAt = new Date();
        po.updatedBy = (decoded as any).userId;

        po.markModified("items");
        await po.save();

        res.status(200).json({
            success: true,
            message: `✅ คืนสินค้าทั้งใบเรียบร้อยแล้ว (คืนเฉพาะที่ QC ไม่ผ่าน, รวม ${returnHistory.length} รายการ, มูลค่า ${totalReturnedValue.toLocaleString()}฿)`,
            data: {
                poId: po._id,
                status: po.status,
                totalReturnedValue,
                totalAmountAfterReturn: po.totalAmountAfterReturn,
                returnHistory: po.returnHistory,
            },
        });
    } catch (error) {
        console.error("❌ Return PO Error:", error);
        res.status(500).json({
            success: false,
            message: "เกิดข้อผิดพลาดขณะคืนสินค้า",
            error: (error as Error).message,
        });
    }
};
/* ========================================================
   🔁 RETURN PURCHASE ORDER ITEM (ปรับปรุงพร้อมยอดคืน)
======================================================== */
export const returnPurchaseItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params; // PO ID
        const { itemId, batchNumber, quantity } = req.body;

        if ((!itemId && !batchNumber) || !quantity) {
            res.status(400).json({ success: false, message: "กรุณาระบุ batchNumber หรือ itemId และ quantity" });
            return;
        }

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

        const po = await PurchaseOrder.findById(id);
        if (!po) {
            res.status(404).json({ success: false, message: "ไม่พบใบสั่งซื้อ" });
            return;
        }

        // ✅ ค้นหา item ตาม batchNumber หรือ itemId
        const item = (po.items as any[]).find(
            (i) =>
                i._id?.toString() === itemId ||
                i.batchNumber === batchNumber ||
                i.barcode === batchNumber
        );

        if (!item) {
            res.status(404).json({ success: false, message: "ไม่พบสินค้าที่ต้องการคืน" });
            return;
        }

        if (quantity > item.quantity) {
            res.status(400).json({ success: false, message: "จำนวนที่คืนมากกว่าที่รับไว้" });
            return;
        }

        /* ======================================================
           ✅ บันทึกข้อมูลการคืนสินค้า
        ====================================================== */
        const returnValue = quantity * item.costPrice; // มูลค่าที่คืน
        item.isReturned = true;
        item.returnedQuantity = quantity;
        item.returnedValue = returnValue;

        // ✅ เพิ่ม log การคืนสินค้า (เก็บไว้ใน purchaseOrder)
        if (!(po as any).returnHistory) (po as any).returnHistory = [];
        (po as any).returnHistory.push({
            productId: item.productId,
            productName: item.productName,
            batchNumber: item.batchNumber,
            returnedQuantity: quantity,
            returnedValue: returnValue,
            returnedAt: new Date(),
            processedBy: (decoded as any).userId,
        });

        /* ======================================================
           ✅ อัปเดตสถานะ StockLot
        ====================================================== */
        const lot = await StockLot.findOne({ batchNumber: item.batchNumber });
        if (lot) {
            lot.status = "รอคัดออก";
            lot.isActive = false;
            await lot.save();
        }

        /* ======================================================
           ✅ อัปเดตยอดรวมในใบ PO
        ====================================================== */
        const totalReturnedValue = (po.items as any[])
            .filter((i: any) => i.isReturned)
            .reduce((sum: number, i: any) => sum + (i.returnedValue || 0), 0);

        const newTotalAmount = po.items.reduce(
            (sum: number, i: any) => sum + (i.total || 0),
            0
        );

        po.totalReturnedValue = totalReturnedValue;
        po.totalAmountAfterReturn = newTotalAmount - totalReturnedValue;
        po.returnedAt = new Date();
        po.updatedBy = (decoded as any).userId;

        // ✅ เช็กสถานะว่าคืนครบทุกชิ้นแล้วไหม
        const allReturned = po.items.every((i: any) => i.isReturned === true);
        po.status = allReturned
            ? "ไม่ผ่าน QC - คืนสินค้าทั้งหมดแล้ว"
            : "ไม่ผ่าน QC - คืนสินค้าบางส่วนแล้ว";

        // ✅ แจ้ง Mongoose ว่า array items ถูกแก้ไข
        po.markModified("items");
        await po.save();

        /* ======================================================
           ✅ Response กลับพร้อมข้อมูลครบทุกชิ้น
        ====================================================== */
        res.status(200).json({
            success: true,
            message: `✅ คืนสินค้า "${item.productName}" (${quantity} ชิ้น, มูลค่า ${returnValue.toLocaleString()}฿) สำเร็จแล้ว`,
            data: {
                poId: po._id,
                items: po.items.map((i: any) => ({
                    productName: i.productName,
                    barcode: i.barcode,
                    quantity: i.quantity,
                    isReturned: i.isReturned,
                    returnedQuantity: i.returnedQuantity,
                    returnedValue: i.returnedValue,
                    costPrice: i.costPrice,
                    batchNumber: i.batchNumber,
                })),
                totalReturnedValue,
                totalAmountAfterReturn: po.totalAmountAfterReturn,
                updatedStatus: po.status,
                returnHistory: po.returnHistory,
            },
        });
    } catch (error) {
        console.error("❌ Return Partial Item Error:", error);
        res.status(500).json({
            success: false,
            message: "เกิดข้อผิดพลาดขณะคืนสินค้า",
            error: (error as Error).message,
        });
    }
};


/* ========================================================
   ❌ CANCEL PURCHASE ORDER
======================================================== */
export const cancelPurchaseOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const token = req.header("Authorization")?.split(" ")[1];
        if (!token) {
            res.status(401).json({ success: false, message: "Unauthorized, no token" });
            return;
        }

        const decoded = verifyToken(token);
        if (typeof decoded === "string" || !("userId" in decoded)) {
            res.status(401).json({ success: false, message: "Invalid token" });
            return;
        }

        const { id } = req.params;
        const po = await PurchaseOrder.findById(id);
        if (!po) {
            res.status(404).json({ success: false, message: "ไม่พบ PurchaseOrder" });
            return;
        }

        if (po.status !== "รอดำเนินการ") {
            res.status(400).json({
                success: false,
                message: "ไม่สามารถยกเลิก PO ที่ได้รับสินค้าแล้วหรืออยู่ในขั้นตอน QC ได้",
            });
            return;
        }

        po.status = "ยกเลิก";
        po.updatedBy = (decoded as any).userId;
        await po.save();

        // ลบ StockLot ทั้งหมดที่สร้างจาก PO นี้
        await StockLot.deleteMany({ _id: { $in: po.items.map((x: any) => x.stockLotId) } });

        res.status(200).json({ success: true, message: "ยกเลิก PO สำเร็จ ✅", data: po });
    } catch (error) {
        console.error("❌ Cancel PO Error:", error);
        res.status(500).json({ success: false, message: "Server error while cancelling PO" });
    }
};
