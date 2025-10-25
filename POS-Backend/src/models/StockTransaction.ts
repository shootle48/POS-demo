import mongoose, { Document, Schema } from "mongoose";

export interface IStockTransaction extends Document {
    stockId: mongoose.Types.ObjectId;
    stockLotId?: mongoose.Types.ObjectId;        // ✅ อ้างอิงล็อต
    productId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    type:
    | "SALE"
    | "RESTOCK"
    | "RETURN"
    | "ADJUSTMENT"
    | "LOT_DEACTIVATE";                        // ✅ เพิ่มเหตุการณ์ใหม่
    quantity: number;
    referenceId?: mongoose.Types.ObjectId;
    qcReference?: mongoose.Types.ObjectId;
    costPrice?: number;
    salePrice?: number;
    notes?: string;
    source: "SUPPLIER" | "SELF" | "CUSTOMER" | "SYSTEM"; // ✅ เพิ่ม SYSTEM
    location?: mongoose.Types.ObjectId;          // ✅ เพิ่ม location เพื่อ filter ได้
    reference?: string;                          // ✅ เก็บข้อความอ้างอิง เช่น “ปิดล็อต LOT123”
    createdAt: Date;
    updatedAt: Date;
}

const StockTransactionSchema = new Schema<IStockTransaction>(
    {
        stockId: { type: Schema.Types.ObjectId, ref: "Stock", required: true },
        stockLotId: { type: Schema.Types.ObjectId, ref: "StockLot" },
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

        type: {
            type: String,
            enum: ["SALE", "RESTOCK", "RETURN", "ADJUSTMENT", "LOT_DEACTIVATE"], // ✅ เพิ่มที่นี่
            required: true,
        },

        quantity: { type: Number, required: true },

        referenceId: { type: Schema.Types.ObjectId },
        qcReference: { type: Schema.Types.ObjectId, ref: "QC" },

        costPrice: Number,
        salePrice: Number,
        notes: String,

        reference: String, // ✅ ใช้เก็บข้อความเช่น “ปิดล็อต: LOT-20251023”
        location: { type: Schema.Types.ObjectId, ref: "Location" },

        source: {
            type: String,
            enum: ["SUPPLIER", "SELF", "CUSTOMER", "SYSTEM"], // ✅ เพิ่ม SYSTEM เผื่อปิดล็อตอัตโนมัติ
            default: "SELF",
        },
    },
    { timestamps: true }
);

// ✅ Indexes เพื่อ performance การ query
StockTransactionSchema.index({ stockId: 1 });
StockTransactionSchema.index({ stockLotId: 1 });
StockTransactionSchema.index({ productId: 1 });
StockTransactionSchema.index({ type: 1 });
StockTransactionSchema.index({ createdAt: -1 });
StockTransactionSchema.index({ location: 1 });

export default mongoose.models.StockTransaction ||
    mongoose.model<IStockTransaction>(
        "StockTransaction",
        StockTransactionSchema
    );
