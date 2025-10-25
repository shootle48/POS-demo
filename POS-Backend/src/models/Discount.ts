import mongoose, { Schema, Document, Types } from "mongoose";

export interface IDiscount extends Document {
    ownerId: Types.ObjectId;      // เจ้าของร้าน
    ownerName?: string;           // ชื่อร้าน (เผื่อใช้แสดงผล)
    code: string;                 // รหัสส่วนลด เช่น SAVE10
    type: "percent" | "baht";     // ประเภทส่วนลด
    value: number;                // มูลค่าส่วนลด
    description?: string;         // รายละเอียด
    isActive: boolean;            // เปิดใช้งานไหม
    startDate?: Date;
    endDate?: Date;
    createdAt: Date;
}

const DiscountSchema = new Schema<IDiscount>({
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ownerName: { type: String },
    code: { type: String, required: true, trim: true },
    type: { type: String, enum: ["percent", "baht"], required: true },
    value: { type: Number, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    startDate: Date,
    endDate: Date,
    createdAt: { type: Date, default: Date.now },
});

DiscountSchema.index({ ownerId: 1, code: 1 }, { unique: true });

export default mongoose.model<IDiscount>("Discount", DiscountSchema);
