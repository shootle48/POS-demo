import mongoose, { Document, Schema } from "mongoose";

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  category: mongoose.Schema.Types.ObjectId;
  barcode: string;
  productCode?: string;
  imageUrl?: string;
  public_id?: string;
  userId: mongoose.Schema.Types.ObjectId;
  supplierId: mongoose.Schema.Types.ObjectId;
  isSelfPurchased: boolean;
  isActive: boolean; // ✅ เพิ่มใน interface
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    barcode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    productCode: {
      type: String,
      trim: true,
      unique: false, // ✅ ไม่จำเป็นต้อง unique ข้าม user
    },
    imageUrl: { type: String },
    public_id: { type: String },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    isSelfPurchased: { type: Boolean, default: false },

    // ✅ เพิ่มฟิลด์นี้ เพื่อเปิด/ปิดขายสินค้า
    isActive: {
      type: Boolean,
      default: true, // เปิดขายโดยค่าเริ่มต้น
      index: true,   // เพิ่ม index เพื่อให้ filter เร็ว
    },
  },
  { timestamps: true }
);

// ✅ ดัชนีเพื่อค้นหาสินค้าเร็ว
ProductSchema.index({ name: 1 });
ProductSchema.index({ category: 1, supplierId: 1 });

export default mongoose.models.Product ||
  mongoose.model<IProduct>("Product", ProductSchema);