import { Request, Response } from "express";
import PurchaseOrder from "../models/PurchaseOrder";
import { verifyToken } from "../utils/auth";
import { generateInvoiceNumber } from "../utils/generateInvoice";
import StockTransaction from "../models/StockTransaction";
import Stock from "../models/Stock";

/* ==========================
   สร้าง Purchase Order (PO)
   ========================== */
export const createPurchaseOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        // ตรวจสอบ Token
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

        // รับข้อมูลจาก body
        const { purchaseOrderNumber, supplierId, supplierCompany, location, items, invoiceNumber } = req.body;

        // Loop item เพื่อ ensure stockId
        const itemsWithStock = [];
        for (const item of items) {
            let stock = await Stock.findOne({ productId: item.productId });

            // ถ้าไม่มี stock ให้สร้างใหม่
            if (!stock) {
                stock = new Stock({
                    productId: item.productId,
                    quantity: 0,
                    costPrice: item.costPrice,
                    salePrice: item.salePrice ?? item.costPrice,
                    supplier: supplierCompany,
                    supplierId,
                    location,
                    status: "ใหม่",
                });
                await stock.save();
            }

            itemsWithStock.push({
                ...item,
                stockId: stock._id, // เพิ่ม stockId ลงใน PO item
            });
        }

        // คำนวณราคารวมของ PO
        const totalAmount = itemsWithStock.reduce(
            (sum: number, item: any) => sum + item.quantity * item.costPrice,
            0
        );

        // บันทึกลงฐานข้อมูล
        const po = await PurchaseOrder.create({
            purchaseOrderNumber,
            supplierId,
            supplierCompany,
            location,
            items: itemsWithStock, // ใช้ items ที่มี stockId แล้ว
            totalAmount,
            invoiceNumber: invoiceNumber || generateInvoiceNumber(),
            createdBy: decoded.userId,
        });

        res.status(201).json({ success: true, message: "สร้าง PurchaseOrder สำเร็จ", data: po });
    } catch (error) {
        console.error("Create PO Error:", error);
        res.status(500).json({ success: false, message: "Server error while creating PO" });
    }
};

/* ==========================
   ดึงรายการ Purchase Orders ทั้งหมด
   ========================== */
export const getPurchaseOrders = async (_: Request, res: Response): Promise<void> => {
    try {
        const orders = await PurchaseOrder.find()
            .populate("supplierId") // ดึงข้อมูล Supplier
            .populate("createdBy") // ใครสร้าง
            .populate("updatedBy") // ใครอัปเดตล่าสุด
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, message: "ดึงรายการ PO สำเร็จ", data: orders });
    } catch (error) {
        console.error("Get PO Error:", error);
        res.status(500).json({ success: false, message: "Server error while fetching POs" });
    }
};

/* ==========================
   ดึงรายละเอียด PO ตาม ID
   ========================== */
export const getPurchaseOrderById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const po = await PurchaseOrder.findById(id)
            .populate("supplierId")
            .populate("createdBy")
            .populate("updatedBy");

        if (!po) {
            res.status(404).json({ success: false, message: "ไม่พบ PurchaseOrder" });
            return;
        }

        res.status(200).json({ success: true, message: "ดึงข้อมูล PO สำเร็จ", data: po });
    } catch (error) {
        console.error("Get PO By ID Error:", error);
        res.status(500).json({ success: false, message: "Server error while fetching PO" });
    }
};

/* ==========================
   ยืนยันการรับสินค้า (Confirm PO)
   ขั้นตอนนี้หมายถึง "สินค้าเข้ามาแล้ว" แต่ยังต้อง QC
   ========================== */
export const confirmPurchaseOrder = async (req: Request, res: Response): Promise<void> => {
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

        // ยืนยันได้เฉพาะ PO ที่สถานะยังเป็น "รอดำเนินการ"
        if (po.status !== "รอดำเนินการ") {
            res.status(400).json({ success: false, message: "PO นี้ไม่สามารถยืนยันได้" });
            return;
        }

        // ถ้าไม่มี invoice → generate ใหม่
        if (!po.invoiceNumber) {
            po.invoiceNumber = generateInvoiceNumber();
        }

        // อัปเดตสถานะเป็น "ได้รับสินค้าแล้ว"
        po.status = "ได้รับสินค้าแล้ว";
        po.updatedBy = decoded.userId;
        await po.save();

        res.status(200).json({ success: true, message: "ยืนยัน PO สำเร็จ (รอตรวจสอบ QC)", data: po });
    } catch (error) {
        console.error("Confirm PO Error:", error);
        res.status(500).json({ success: false, message: "Server error while confirming PO" });
    }
};

/* ==========================
   อัปเดตผลการ QC
   - ถ้าไม่ผ่าน → เปลี่ยนสถานะเป็น "ไม่ผ่าน QC - รอส่งคืนสินค้า"
   ========================== */
export const updateQCStatus = async (req: Request, res: Response): Promise<void> => {
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
        const { qcStatus } = req.body;

        const po = await PurchaseOrder.findById(id);
        if (!po) {
            res.status(404).json({ success: false, message: "ไม่พบ PurchaseOrder" });
            return;
        }

        // อัปเดตสถานะ QC
        po.qcStatus = qcStatus;
        po.updatedBy = decoded.userId;

        if (qcStatus === "ไม่ผ่าน") {
            po.status = "ไม่ผ่าน QC - รอส่งคืนสินค้า";
        }

        await po.save();

        res.status(200).json({
            success: true,
            message: "อัปเดต QC สำเร็จ",
            data: po
        });
    } catch (error) {
        console.error("Update QC Error:", error);
        res.status(500).json({ success: false, message: "Server error while updating QC" });
    }
};

/* ==========================
   คืนสินค้า (Return PO)
   ใช้ได้เฉพาะ PO ที่ QC ไม่ผ่าน และอยู่ในสถานะ "รอส่งคืนสินค้า"
   ========================== */
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

        // ต้องอยู่ในสถานะ "ไม่ผ่าน QC - รอส่งคืนสินค้า"
        if (po.status !== "ไม่ผ่าน QC - รอส่งคืนสินค้า") {
            res.status(400).json({ success: false, message: "PO นี้ไม่สามารถคืนสินค้าได้" });
            return;
        }

        // สร้าง StockTransaction (type: RETURN)
        for (const item of po.items) {
            await StockTransaction.create({
                stockId: item.productId,
                productId: item.productId,
                type: "RETURN",
                quantity: item.quantity,
                costPrice: item.costPrice,
                userId: decoded.userId,
                notes: `คืนสินค้า PO ${po.purchaseOrderNumber}`,
            });
        }

        // อัปเดตสถานะเป็น "คืนสินค้าแล้ว"
        po.status = "ไม่ผ่าน QC - คืนสินค้าแล้ว";
        po.updatedBy = decoded.userId;
        await po.save();

        res.status(200).json({ success: true, message: "คืนสินค้าเรียบร้อย", data: po });
    } catch (error) {
        console.error("Return PO Error:", error);
        res.status(500).json({ success: false, message: "Server error while returning PO" });
    }
};

/* ==========================
   ยกเลิก PO
   ใช้ได้เฉพาะตอนสถานะยังเป็น "รอดำเนินการ"
   ========================== */
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

        // ยกเลิกได้เฉพาะ PO ที่ยังไม่ confirm เท่านั้น
        if (po.status !== "รอดำเนินการ") {
            res.status(400).json({ success: false, message: "ไม่สามารถยกเลิก PO ที่ได้รับสินค้าแล้วหรืออยู่ในขั้นตอน QC ได้" });
            return;
        }

        po.status = "ยกเลิก";
        po.updatedBy = decoded.userId;
        await po.save();

        res.status(200).json({ success: true, message: "ยกเลิก PO สำเร็จ", data: po });
    } catch (error) {
        console.error("Cancel PO Error:", error);
        res.status(500).json({ success: false, message: "Server error while cancelling PO" });
    }
};
