// middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth";

// ✅ สร้าง interface ใหม่ สำหรับ Request ที่มี userId, role
export interface AuthRequest extends Request {
    userId?: string;
    role?: string;
    adminId?: string;
    nameStore?: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ success: false, message: "Unauthorized, no token provided" });
    }

    try {
        const decoded = verifyToken(token);
        if (typeof decoded === "string" || !("userId" in decoded)) {
            return res.status(401).json({ success: false, message: "Invalid token" });
        }

        req.userId = decoded.userId;
        req.role = decoded.role;
        if ("adminId" in decoded && typeof decoded.adminId === "string") {
            req.adminId = decoded.adminId;
        }
        if ("nameStore" in decoded && typeof decoded.nameStore === "string") {
            req.nameStore = decoded.nameStore;
        }

        next();
    } catch {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
};
