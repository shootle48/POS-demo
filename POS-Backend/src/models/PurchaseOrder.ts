import mongoose, { Schema, Document } from "mongoose";

/* ==========================
   📦 Interface: รายการสินค้าใน PO
========================== */
interface IPurchaseOrderItem {
    stockId: mongoose.Schema.Types.ObjectId;
    productId: mongoose.Schema.Types.ObjectId;
    productName: string;
    barcode?: string;
    quantity: number;
    costPrice: number;
    total: number;
    batchNumber?: string;
    expiryDate?: Date;
    isReturned?: boolean; 
    returnedQuantity?: number; 
}

/* ==========================
   📄 Interface: Purchase Order หลัก
========================== */
export interface IPurchaseOrder extends Document {
    purchaseOrderNumber: string;
    supplierId: mongoose.Schema.Types.ObjectId;
    supplierCompany: string;
    supplierCode?: string;
    warehouseCode?: string;
    location?: mongoose.Schema.Types.ObjectId;
    orderDate: Date;
    status:
    | "รอดำเนินการ"
    | "ได้รับสินค้าแล้ว"
    | "QC ผ่าน"
    | "QC ผ่านบางส่วน"
    | "ไม่ผ่าน QC - รอส่งคืนสินค้า"
    | "ไม่ผ่าน QC - คืนสินค้าแล้ว"
    | "รอการโอนคลัง"
    | "ยกเลิก";
    qcStatus: "รอตรวจสอบ" | "ผ่าน" | "ไม่ผ่าน" | "ตรวจบางส่วน" | "ผ่านบางส่วน";
    poType: "NORMAL" | "RETURN" | "TRANSFER";
    items: IPurchaseOrderItem[];
    totalAmount: number;
    invoiceNumber?: string;
    note?: string;
    pendingTransferTo?: mongoose.Schema.Types.ObjectId; // ✅ คลังปลายทาง (ในกรณีรอการโอน)
    stockLots: mongoose.Schema.Types.ObjectId[];
    receivedAt?: Date;
    qcCheckedAt?: Date;
    returnedAt?: Date;
    createdBy: mongoose.Schema.Types.ObjectId;
    updatedBy?: mongoose.Schema.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

/* ==========================
   🧾 Schema: รายการสินค้าใน PO
========================== */
const PurchaseOrderItemSchema = new Schema<IPurchaseOrderItem>(
    {
        stockId: { type: Schema.Types.ObjectId, ref: "Stock", required: false },
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        productName: { type: String, required: true },
        barcode: { type: String },
        quantity: { type: Number, required: true },
        costPrice: { type: Number, required: true },
        total: { type: Number },
        batchNumber: { type: String },
        expiryDate: { type: Date },
        // ✅ เพิ่มใหม่
        isReturned: { type: Boolean, default: false },
        returnedQuantity: { type: Number, default: 0 },
    },
    { timestamps: true }
);

/* ==========================
   📄 Schema: Purchase Order หลัก
========================== */
const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
    {
        purchaseOrderNumber: { type: String, unique: true, required: true },
        supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
        supplierCompany: { type: String, required: true },
        location: { type: Schema.Types.ObjectId, ref: "Warehouse" }, 
        orderDate: { type: Date, default: Date.now },
        status: {
            type: String,
            enum: [
                "รอดำเนินการ",
                "ได้รับสินค้าแล้ว",
                "QC ผ่าน",
                "QC ผ่านบางส่วน",
                "ไม่ผ่าน QC - รอส่งคืนสินค้า",
                "ไม่ผ่าน QC - คืนสินค้าแล้ว",
                "ไม่ผ่าน QC - คืนสินค้าบางส่วนแล้ว",
                "รอการโอนคลัง", 
                "ยกเลิก",
            ],
            default: "รอดำเนินการ",
        },
        qcStatus: {
            type: String,
            enum: ["รอตรวจสอบ", "ตรวจบางส่วน", "ผ่านบางส่วน", "ผ่าน", "ไม่ผ่าน"],
            default: "รอตรวจสอบ",
        },
        poType: {
            type: String,
            enum: ["NORMAL", "RETURN", "TRANSFER"],
            default: "NORMAL",
        },
        items: { type: [PurchaseOrderItemSchema], required: true },
        totalAmount: { type: Number, required: true },
        invoiceNumber: { type: String },
        note: { type: String },
        pendingTransferTo: { type: Schema.Types.ObjectId, ref: "Warehouse" },

        stockLots: [{ type: Schema.Types.ObjectId, ref: "StockLot" }],
        receivedAt: { type: Date },
        qcCheckedAt: { type: Date },
        returnedAt: { type: Date },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

/* ==========================
   ⚙️ Indexes
========================== */
PurchaseOrderSchema.index({ supplierId: 1 });
PurchaseOrderSchema.index({ location: 1 });
PurchaseOrderSchema.index({ status: 1 });
PurchaseOrderSchema.index({ createdAt: -1 });
PurchaseOrderSchema.index({ pendingTransferTo: 1 });

/* ==========================
   🚀 Export
========================== */
const PurchaseOrder =
    mongoose.models.PurchaseOrder ||
    mongoose.model<IPurchaseOrder>("PurchaseOrder", PurchaseOrderSchema);

export default PurchaseOrder;
