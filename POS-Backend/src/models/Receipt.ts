import mongoose, { Schema, Document, Model } from "mongoose";

// 🔹 Interface สำหรับ Receipt
export interface IReceipt extends Document {
  paymentId: mongoose.Types.ObjectId;
  employeeName: string;
  items: {
    barcode: string;      // ✅ ใช้เชื่อมกับ Stock
    name: string;
    price: number;
    quantity: number;
    subtotal: number;
    profit?: number;      // ✅ เผื่อกรณีเก็บกำไรไว้ในแต่ละรายการ
  }[];
  totalPrice: number;
  paymentMethod: "เงินสด" | "QR Code" | "บัตรเครดิต" | "โอนผ่านธนาคาร";
  amountPaid?: number;
  changeAmount?: number;
  timestamp: Date;
  formattedDate?: {
    thai: string;
    iso: string;
  };
  profit: number; // ✅ รวมกำไรทั้งบิล
}

const ReceiptSchema: Schema<IReceipt> = new Schema(
  {
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", required: true },
    employeeName: { type: String, required: true },
    items: [
      {
        barcode: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        subtotal: { type: Number, required: true },
        profit: { type: Number, default: 0 },
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
      type: Date,
      default: Date.now,
      required: true,
    },
    formattedDate: {
      thai: String,
      iso: String,
    },
    profit: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

// ✅ Index เพื่อให้ Dashboard Query เร็วขึ้น
ReceiptSchema.index({ timestamp: 1 });
ReceiptSchema.index({ employeeName: 1 });
ReceiptSchema.index({ "items.barcode": 1 });

const Receipt: Model<IReceipt> = mongoose.model<IReceipt>("Receipt", ReceiptSchema);
export default Receipt;
