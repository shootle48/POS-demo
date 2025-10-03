import mongoose, { Schema, Document } from "mongoose";

interface IPurchaseOrderItem {
    stockId: mongoose.Schema.Types.ObjectId;
    productId: mongoose.Schema.Types.ObjectId;
    productName: string;
    quantity: number;
    costPrice: number;   // ราคาซื้อต่อหน่วย
    total: number;       // quantity * costPrice
    batchNumber?: string; // (บางกรณี supplier ยังไม่ได้แจ้ง batch)
    expiryDate?: Date;
}

export interface IPurchaseOrder extends Document {
    purchaseOrderNumber: string; // รหัส PO เช่น PO-2025-0001
    supplierId: mongoose.Schema.Types.ObjectId;
    supplierCompany: string;
    location: string;  // คลังที่จะรับสินค้าเข้า
    orderDate: Date;
    status:
    | "รอดำเนินการ"
    | "ได้รับสินค้าแล้ว"
    | "QC ผ่าน"
    | "ไม่ผ่าน QC - รอส่งคืนสินค้า"
    | "ไม่ผ่าน QC - คืนสินค้าแล้ว"
    | "ยกเลิก";
    qcStatus: "รอตรวจสอบ" | "ผ่าน" | "ไม่ผ่าน";
    items: IPurchaseOrderItem[];
    totalAmount: number;
    invoiceNumber?: string;
    createdBy: mongoose.Schema.Types.ObjectId;
    updatedBy?: mongoose.Schema.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const PurchaseOrderItemSchema = new Schema<IPurchaseOrderItem>(
    {
        stockId: { type: Schema.Types.ObjectId, ref: "Stock", required: true },
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        productName: { type: String, required: true },
        quantity: { type: Number, required: true },
        costPrice: { type: Number, required: true },
        total: { type: Number, required: true },
        batchNumber: { type: String },
        expiryDate: { type: Date },
    },
    { _id: false }
);

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
    {
        purchaseOrderNumber: { type: String, unique: true, required: true },
        supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
        supplierCompany: { type: String, required: true },
        location: { type: String, required: true },
        orderDate: { type: Date, default: Date.now },
        status: {
            type: String,
            enum: [
                "รอดำเนินการ",
                "ได้รับสินค้าแล้ว",
                "QC ผ่าน",
                "ไม่ผ่าน QC - รอส่งคืนสินค้า",
                "ไม่ผ่าน QC - คืนสินค้าแล้ว",
                "ยกเลิก",
            ],
            default: "รอดำเนินการ",
        },
        qcStatus: {
            type: String,
            enum: ["รอตรวจสอบ", "ผ่าน", "ไม่ผ่าน"],
            default: "รอตรวจสอบ",
        },
        items: { type: [PurchaseOrderItemSchema], required: true },
        totalAmount: { type: Number, required: true },
        invoiceNumber: { type: String },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

const PurchaseOrder =
    mongoose.models.PurchaseOrder ||
    mongoose.model<IPurchaseOrder>("PurchaseOrder", PurchaseOrderSchema);

export default PurchaseOrder;
