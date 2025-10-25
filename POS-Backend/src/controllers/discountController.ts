import { Response } from "express";
import Discount from "../models/Discount";
import { AuthRequest } from "../middlewares/authMiddleware";
import { resolveOwnerContext } from "../utils/tenant";

// ✅ สร้างรหัสส่วนลดใหม่ (เฉพาะ admin / manager)
export const createDiscount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.userId || (req.role !== "admin" && req.role !== "manager")) {
            res.status(403).json({
                success: false,
                message: "Forbidden: Only admin or manager can create discounts",
            });
            return;
        }

        const { code, type, value, description, startDate, endDate } = req.body;
        if (!code || !type || typeof value !== "number") {
            res.status(400).json({ success: false, message: "ข้อมูลไม่ครบถ้วน" });
            return;
        }

        const owner = await resolveOwnerContext(req);
        const normalizedCode = code.toUpperCase();

        const exists = await Discount.findOne({ ownerId: owner.ownerObjectId, code: normalizedCode });
        if (exists) {
            res.status(400).json({ success: false, message: "โค้ดนี้ถูกใช้งานแล้ว" });
            return;
        }

        const discount = await Discount.create({
            ownerId: owner.ownerObjectId,
            ownerName: owner.storeName,
            code: normalizedCode,
            type,
            value,
            description,
            startDate,
            endDate,
        });

        res.status(201).json({
            success: true,
            message: "สร้างรหัสส่วนลดสำเร็จ",
            data: discount,
        });
    } catch (error) {
        console.error("❌ createDiscount error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create discount",
            error,
        });
    }
};

// ✅ ดึงรหัสส่วนลดทั้งหมด
export const getDiscounts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const owner = await resolveOwnerContext(req);
        const discounts = await Discount.find({ ownerId: owner.ownerObjectId })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            message: "ดึงรหัสส่วนลดทั้งหมดสำเร็จ",
            data: discounts,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "ไม่สามารถดึงข้อมูลได้",
            error,
        });
    }
};

// ✅ ลบรหัสส่วนลด (เฉพาะ admin / manager)
export const deleteDiscount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.userId || (req.role !== "admin" && req.role !== "manager")) {
            res.status(403).json({
                success: false,
                message: "Forbidden: Only admin or manager can delete discounts",
            });
            return;
        }

        const owner = await resolveOwnerContext(req);
        const discount = await Discount.findOneAndDelete({
            _id: req.params.id,
            ownerId: owner.ownerObjectId,
        });

        if (!discount) {
            res.status(404).json({ success: false, message: "ไม่พบรหัสส่วนลดนี้" });
            return;
        }

        res.status(200).json({
            success: true,
            message: "ลบรหัสส่วนลดเรียบร้อย",
        });
    } catch (error) {
        console.error("❌ deleteDiscount error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete discount",
            error,
        });
    }
};

// ✅ ตรวจสอบโค้ดส่วนลด (ใช้ตอน Checkout - ต้องระบุร้าน)
export const validateDiscount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { code } = req.body;
        if (!code) {
            res.status(400).json({ success: false, message: "กรุณาระบุโค้ดส่วนลด" });
            return;
        }

        const owner = await resolveOwnerContext(req);
        const discount = await Discount.findOne({
            ownerId: owner.ownerObjectId,
            code: code.toUpperCase(),
            isActive: true,
        });

        if (!discount) {
            res.status(404).json({ success: false, message: "ไม่พบโค้ดส่วนลดนี้" });
            return;
        }

        const now = new Date();
        if (discount.startDate && now < discount.startDate) {
            res.status(400).json({ success: false, message: "โค้ดยังไม่เริ่มใช้งาน" });
            return;
        }
        if (discount.endDate && now > discount.endDate) {
            res.status(400).json({ success: false, message: "โค้ดหมดอายุแล้ว" });
            return;
        }

        res.status(200).json({
            success: true,
            message: "โค้ดถูกต้อง",
            data: discount,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "ตรวจสอบโค้ดล้มเหลว",
            error,
        });
    }
};

// ✅ แก้ไขรหัสส่วนลด (เฉพาะ admin / manager)
export const updateDiscount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.userId || (req.role !== "admin" && req.role !== "manager")) {
            res.status(403).json({
                success: false,
                message: "Forbidden: Only admin or manager can update discounts",
            });
            return;
        }

        const { id } = req.params;
        const { code, type, value, description, startDate, endDate, isActive } = req.body;

        if (!code || !type || typeof value !== "number") {
            res.status(400).json({ success: false, message: "ข้อมูลไม่ครบถ้วน" });
            return;
        }

        const owner = await resolveOwnerContext(req);
        const normalizedCode = code.toUpperCase();

        const discount = await Discount.findOne({ _id: id, ownerId: owner.ownerObjectId });
        if (!discount) {
            res.status(404).json({ success: false, message: "ไม่พบรหัสส่วนลดนี้" });
            return;
        }

        const duplicate = await Discount.findOne({
            ownerId: owner.ownerObjectId,
            code: normalizedCode,
            _id: { $ne: id },
        });
        if (duplicate) {
            res.status(400).json({
                success: false,
                message: "โค้ดส่วนลดนี้ถูกใช้งานแล้ว",
            });
            return;
        }

        discount.code = normalizedCode;
        discount.type = type;
        discount.value = value;
        discount.description = description;
        discount.startDate = startDate;
        discount.endDate = endDate;
        if (typeof isActive === "boolean") {
            discount.isActive = isActive;
        }

        await discount.save();

        res.status(200).json({
            success: true,
            message: "อัปเดตรหัสส่วนลดสำเร็จ",
            data: discount,
        });
    } catch (error) {
        console.error("❌ updateDiscount error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update discount",
            error,
        });
    }
};
