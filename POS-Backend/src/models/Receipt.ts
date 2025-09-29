import mongoose, { Schema, Document, Model } from "mongoose";

// 🔹 กำหนด Interface สำหรับ Receipt
export interface IReceipt extends Document {
    paymentId: mongoose.Types.ObjectId;
    employeeName: string;
    items: {
        barcode: string;
        name: string;
        price: number;
        quantity: number;
        subtotal: number;
    }[];
    totalPrice: number;
    paymentMethod: "เงินสด" | "QR Code" | "บัตรเครดิต" | "โอนผ่านธนาคาร";
    amountPaid?: number;    // 💰 เงินที่ลูกค้าจ่าย (เฉพาะเงินสด)
    changeAmount?: number;  // 💵 เงินทอน
    timestamp: number; // Changed to number for UNIX timestamp
}

// 🔹 Schema สำหรับใบเสร็จ
const ReceiptSchema: Schema<IReceipt> = new Schema({
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", required: true },
    employeeName: { type: String, required: true },
    items: [
        {
            barcode: { type: String, required: true },
            name: { type: String, required: true },
            price: { type: Number, required: true },
            quantity: { type: Number, required: true },
            subtotal: { type: Number, required: true },
        },
    ],
    totalPrice: { type: Number, required: true },
    paymentMethod: {
        type: String,
        enum: ["เงินสด", "QR Code", "บัตรเครดิต", "โอนผ่านธนาคาร"],
        required: true,
    },
    amountPaid: { type: Number },
    changeAmount: { type: Number, default: 0 },
    timestamp: { 
        type: Number, 
        default: () => Math.floor(Date.now() / 1000), // Convert to UNIX timestamp (seconds)
        required: true 
    }
});

// 🔹 สร้าง Model
const Receipt: Model<IReceipt> = mongoose.model<IReceipt>("Receipt", ReceiptSchema);

export default Receipt;
