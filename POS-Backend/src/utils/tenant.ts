import { Types } from "mongoose";
import { AuthRequest } from "../middlewares/authMiddleware";
import User from "../models/User";

export interface OwnerContext {
    ownerId: string;
    ownerObjectId: Types.ObjectId;
    storeName?: string;
}

export async function resolveOwnerContext(req: AuthRequest): Promise<OwnerContext> {
    const baseId = req.role === "employee" ? req.adminId : req.userId;

    if (!baseId) {
        throw new Error("Owner not resolved");
    }

    if (!Types.ObjectId.isValid(baseId)) {
        throw new Error("Invalid owner identifier");
    }

    let storeName = req.nameStore;

    if ((!storeName || typeof storeName !== "string") && req.role === "employee") {
        const admin = await User.findById(baseId)
            .select("nameStore")
            .lean<{ nameStore?: string }>();
        storeName = admin?.nameStore;
    }

    return {
        ownerId: baseId,
        ownerObjectId: new Types.ObjectId(baseId),
        storeName,
    };
}
