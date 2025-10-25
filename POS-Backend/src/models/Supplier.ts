import mongoose, { Schema, Document } from "mongoose";

interface ISupplier extends Document {
    userId: mongoose.Types.ObjectId;
    code: string; // ✅ รหัสซัพพลายเออร์ เช่น SP01
    companyName: string;
    phoneNumber: string;
    address: string;
    country: string;
    stateOrProvince: string;
    district: string;
    subDistrict: string;
    postalCode: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        code: {
            type: String,
            required: true,
            unique: true, // ห้ามซ้ำ (เช่น SP01)
        },
        companyName: { type: String, required: true },
        phoneNumber: { type: String, required: true },
        address: { type: String, required: true },
        country: { type: String, required: true },
        stateOrProvince: { type: String, required: true },
        district: { type: String, required: true },
        subDistrict: { type: String, required: true },
        postalCode: { type: String, required: true },
        email: { type: String, required: true },
    },
    { timestamps: true }
);

export default mongoose.model<ISupplier>("Supplier", SupplierSchema);