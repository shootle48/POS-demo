// models/StockLot.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IStockLot extends Document {
    stockId: mongoose.Types.ObjectId;
    productId: mongoose.Types.ObjectId;
    supplierId?: mongoose.Types.ObjectId;
    supplierName?: string;
    userId: mongoose.Types.ObjectId;
    location?: mongoose.Types.ObjectId;
    batchNumber: string;
    expiryDate?: Date;
    barcode: string;
    purchaseOrderId: mongoose.Types.ObjectId;
    purchaseOrderNumber: string;
    quantity: number;
    costPrice: number;
    salePrice?: number;
    status: "สินค้าพร้อมขาย" | "สินค้าหมด" | "สินค้าเหลือน้อย" | "รอตรวจสอบ QC" | "รอคัดออก";
    qcStatus: "ผ่าน" | "ไม่ผ่าน" | "รอตรวจสอบ";

    lastRestocked?: Date;
    notes?: string;
    isActive: boolean;
    isTemporary?: boolean;

    // ✅ เพิ่มฟิลด์นี้
    isStocked?: boolean; // true = เติมแล้ว, false = ยังไม่เติม

    createdAt: Date;
    updatedAt: Date;

    updateStatus: () => Promise<void>;
}

const StockLotSchema = new Schema<IStockLot>(
    {
        stockId: { type: Schema.Types.ObjectId, ref: "Stock", required: true },
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        supplierId: { type: Schema.Types.ObjectId, ref: "Supplier" },
        supplierName: { type: String },
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        location: { type: Schema.Types.ObjectId, ref: "Warehouse" },

        // ✅ ผูกกับใบสั่งซื้อ (PO)
        purchaseOrderId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder" },
        purchaseOrderNumber: { type: String },

        batchNumber: { type: String, required: true },
        expiryDate: { type: Date },
        barcode: { type: String, required: true },

        quantity: { type: Number, default: 0 },
        costPrice: { type: Number, default: 0 },
        salePrice: { type: Number, default: 0 },

        status: {
            type: String,
            enum: [
                "สินค้าพร้อมขาย",
                "สินค้าหมด",
                "สินค้าเหลือน้อย",
                "รอตรวจสอบ QC",
                "รอคัดออก",
            ],
            default: "รอตรวจสอบ QC",
        },

        qcStatus: {
            type: String,
            enum: ["ผ่าน", "ไม่ผ่าน", "รอตรวจสอบ"],
            default: "รอตรวจสอบ",
        },

        lastRestocked: { type: Date },
        notes: { type: String },
        isActive: { type: Boolean, default: false },
        isTemporary: { type: Boolean, default: true },

        // ✅ ฟิลด์ใหม่ ใช้กันการเติมซ้ำ
        isStocked: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// ✅ Method: อัปเดตสถานะอัตโนมัติ (เฉพาะ inventory)
StockLotSchema.methods.updateStatus = async function () {
    if (["รอตรวจสอบ QC", "รอคัดออก"].includes(this.status)) return;

    if (this.quantity <= 0) this.status = "สินค้าหมด";
    else if (this.quantity <= 5) this.status = "สินค้าเหลือน้อย";
    else this.status = "สินค้าพร้อมขาย";

    await this.save();
};

// ✅ Indexes
StockLotSchema.index({ productId: 1 });
StockLotSchema.index({ stockId: 1 });
StockLotSchema.index({ batchNumber: 1 });
StockLotSchema.index({ barcode: 1 });
StockLotSchema.index({ status: 1 });
StockLotSchema.index({ qcStatus: 1 });
StockLotSchema.index({ isStocked: 1 });
StockLotSchema.index({ updatedAt: -1 });

export default mongoose.models.StockLot || mongoose.model<IStockLot>("StockLot", StockLotSchema);
