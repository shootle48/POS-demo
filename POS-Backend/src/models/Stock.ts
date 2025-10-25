// models/Stock.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IStock extends Document {
  productId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  supplierId?: mongoose.Types.ObjectId;
  supplierName?: string;
  location?: mongoose.Types.ObjectId;
  totalQuantity: number; // ✅ รวมจำนวนจากทุกล็อต
  threshold?: number;
  status: "สินค้าพร้อมขาย" | "สินค้าหมด" | "สินค้าเหลือน้อย";
  costPrice: number;
  salePrice: number;
  barcode: string;
  lastRestocked?: Date;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  updateStatus: () => Promise<void>;
}

const StockSchema = new Schema<IStock>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier" },
    supplierName: { type: String },
    location: { type: Schema.Types.ObjectId, ref: "Warehouse" },

    totalQuantity: { type: Number, default: 0 },
    threshold: { type: Number, default: 5 },
    status: {
      type: String,
      enum: ["สินค้าพร้อมขาย", "สินค้าหมด", "สินค้าเหลือน้อย"],
      default: "สินค้าพร้อมขาย",
    },

    costPrice: { type: Number, default: 0 },
    salePrice: { type: Number, default: 0 },
    barcode: { type: String, required: true, unique: true },

    lastRestocked: { type: Date },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ✅ อัปเดตสถานะตามยอดรวม
StockSchema.methods.updateStatus = async function () {
  if (this.totalQuantity <= 0) {
    this.status = "สินค้าหมด";
  } else if (this.totalQuantity <= this.threshold) {
    this.status = "สินค้าเหลือน้อย";
  } else {
    this.status = "สินค้าพร้อมขาย";
  }
  await this.save();
};

StockSchema.index({ productId: 1 });

export default mongoose.models.Stock || mongoose.model<IStock>("Stock", StockSchema);