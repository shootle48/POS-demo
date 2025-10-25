import mongoose, { Schema, Document } from "mongoose";

export interface IDiscount extends Document {
    code: string;                // รหัสส่วนลด เช่น SAVE10
    type: "percent" | "baht";    // ประเภทส่วนลด
    value: number;               // มูลค่าส่วนลด
    description?: string;        // รายละเอียด
    isActive: boolean;           // เปิดใช้งานไหม
    startDate?: Date;
    endDate?: Date;
    createdAt: Date;
}

const DiscountSchema = new Schema<IDiscount>({
    code: { type: String, required: true, unique: true },
    type: { type: String, enum: ["percent", "baht"], required: true },
    value: { type: Number, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    startDate: Date,
    endDate: Date,
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IDiscount>("Discount", DiscountSchema);