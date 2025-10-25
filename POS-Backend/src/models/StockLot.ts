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
    expiryStatus?: "ปกติ" | "ใกล้หมดอายุ" | "หมดอายุ";

    barcode: string;
    purchaseOrderId: mongoose.Types.ObjectId;
    purchaseOrderNumber: string;
    quantity: number;
    costPrice: number;
    salePrice?: number;
    status:
    | "สินค้าพร้อมขาย"
    | "สินค้าหมด"
    | "สินค้าเหลือน้อย"
    | "รอตรวจสอบ QC"
    | "รอคัดออก";
    qcStatus: "ผ่าน" | "ไม่ผ่าน" | "รอตรวจสอบ";

    lastRestocked?: Date;
    notes?: string;
    isActive: boolean;
    isTemporary?: boolean;
    isStocked?: boolean; // true = เติมแล้ว, false = ยังไม่เติม

    // ✅ ฟิลด์ใหม่: สำหรับการปิดล็อต
    isClosed?: boolean;
    closedBy?: mongoose.Types.ObjectId;
    closedAt?: Date;
    reason?: string;
    remainingQty?: number;

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
        expiryStatus: {
            type: String,
            enum: ["ปกติ", "ใกล้หมดอายุ", "หมดอายุ"],
            default: "ปกติ",
        },

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
            enum: ["ผ่าน", "ไม่ผ่าน","ผ่านบางส่วน","รอตรวจสอบ"],
            default: "รอตรวจสอบ",
        },

        lastRestocked: { type: Date },
        notes: { type: String },
        isActive: { type: Boolean, default: false },
        isTemporary: { type: Boolean, default: true },
        isStocked: { type: Boolean, default: false },

        // ✅ ฟิลด์ใหม่ (สำหรับ Deactivation Flow)
        isClosed: { type: Boolean, default: false },
        closedBy: { type: Schema.Types.ObjectId, ref: "User" },
        closedAt: { type: Date },
        reason: { type: String },
        remainingQty: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// ✅ Method: อัปเดตสถานะอัตโนมัติ (เฉพาะ inventory)
StockLotSchema.methods.updateStatus = async function () {
    if (["รอตรวจสอบ QC", "รอคัดออก"].includes(this.status)) return;

    // ✅ เช็คสถานะจำนวนสินค้า
    if (this.quantity <= 0) this.status = "สินค้าหมด";
    else if (this.quantity <= 5) this.status = "สินค้าเหลือน้อย";
    else this.status = "สินค้าพร้อมขาย";

    // เช็ควันหมดอายุ
    if (this.expiryDate) {
        const now = new Date();
        const exp = new Date(this.expiryDate);
        const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) this.expiryStatus = "หมดอายุ";
        else if (diffDays <= 10) this.expiryStatus = "ใกล้หมดอายุ";
        else this.expiryStatus = "ปกติ";
    } else {
        this.expiryStatus = "ปกติ";
    }

    await this.save();
};


// ✅ Indexes สำหรับ performance
StockLotSchema.index({ productId: 1 });
StockLotSchema.index({ stockId: 1 });
StockLotSchema.index({ batchNumber: 1 });
StockLotSchema.index({ barcode: 1 });
StockLotSchema.index({ status: 1 });
StockLotSchema.index({ qcStatus: 1 });
StockLotSchema.index({ isStocked: 1 });
StockLotSchema.index({ isClosed: 1 });
StockLotSchema.index({ updatedAt: -1 });

export default mongoose.models.StockLot || mongoose.model<IStockLot>("StockLot", StockLotSchema);
