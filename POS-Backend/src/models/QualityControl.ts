import mongoose, { Document, Schema } from "mongoose";

export interface IQC extends Document {
    batchNumber: string;
    productId: mongoose.Schema.Types.ObjectId;
    supplierId: mongoose.Schema.Types.ObjectId;
    warehouseId: mongoose.Schema.Types.ObjectId;
    userId: mongoose.Schema.Types.ObjectId;
    purchaseOrderId?: mongoose.Schema.Types.ObjectId;
    stockLotId?: mongoose.Schema.Types.ObjectId;

    // 🧪 สถานะ QC แบบละเอียด
    status: "ผ่าน" | "ไม่ผ่าน" | "ผ่านบางส่วน" | "รอตรวจสอบ";

    // 📦 เฉพาะกรณีผ่านบางส่วน
    totalQuantity?: number;
    passedQuantity?: number;
    failedQuantity?: number;

    issues?: string[];
    temperature?: number;
    humidity?: number;
    inspectionDate: Date;
    remarks?: string;
    attachments?: { url: string; public_id: string }[];
    createdAt: Date;
    updatedAt: Date;
}

const QCSchema = new Schema<IQC>(
    {
        batchNumber: { type: String, required: true, index: true },
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
        warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        purchaseOrderId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder" },
        stockLotId: { type: Schema.Types.ObjectId, ref: "StockLot" },

        status: {
            type: String,
            enum: ["ผ่าน", "ไม่ผ่าน", "ผ่านบางส่วน", "รอตรวจสอบ"],
            default: "รอตรวจสอบ",
        },

        totalQuantity: { type: Number },
        passedQuantity: { type: Number },
        failedQuantity: { type: Number },

        issues: [{ type: String }],
        temperature: Number,
        humidity: Number,
        inspectionDate: { type: Date, default: Date.now },
        remarks: String,
        attachments: [{ url: String, public_id: String }],
    },
    { timestamps: true }
);

// Indexes
QCSchema.index({ status: 1 });
QCSchema.index({ productId: 1, warehouseId: 1 });
QCSchema.index({ batchNumber: 1, purchaseOrderId: 1 });
QCSchema.index({ stockLotId: 1 });

export default mongoose.models.QC || mongoose.model<IQC>("QC", QCSchema);
