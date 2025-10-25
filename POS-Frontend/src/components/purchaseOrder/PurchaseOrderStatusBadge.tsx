import React from "react";
import "../../styles/purchaseOrder/PurchaseOrderStatusBadge.css";

interface Props {
    status: string;
}

const PurchaseOrderStatusBadge: React.FC<Props> = ({ status }) => {
    const map: Record<
        string,
        { label: string; className: string }
    > = {
        "รอดำเนินการ": {
            label: "⏳ รอดำเนินการ",
            className: "status-pending",
        },
        "รอตรวจสอบ QC": {
            label: "🧪 รอตรวจสอบ QC",
            className: "status-qc-pending",
        },
        "ตรวจบางส่วน": {
            label: "⚙️ ตรวจบางส่วน",
            className: "status-qc-partial",
        },
        "QC ผ่าน": {
            label: "✅ ผ่าน QC",
            className: "status-qc-pass",
        },
        "QC ผ่านบางส่วน": {
            label: "🟡 ผ่านบางส่วน",
            className: "status-qc-partial",
        },
        "ได้รับสินค้าแล้ว": {
            label: "📦 ได้รับสินค้าแล้ว",
            className: "status-received",
        },
        "ไม่ผ่าน QC - รอส่งคืนสินค้า": {
            label: "⚠️ รอส่งคืนสินค้า",
            className: "status-qc-fail",
        },
        "ไม่ผ่าน QC - คืนสินค้าแล้ว": {
            label: "↩️ คืนสินค้าแล้ว",
            className: "status-returned",
        },
        "ไม่ผ่าน QC - คืนสินค้าบางส่วนแล้ว": {
            label: "↩️ คืนสินค้าบางส่วนแล้ว",
            className: "status-returned-partial",
        },
        "ไม่ผ่าน QC": {
            label: "❌ ไม่ผ่าน QC",
            className: "status-qc-fail",
        },
        "ยกเลิก": {
            label: "🚫 ยกเลิก",
            className: "status-cancelled",
        },
    };

    const { label, className } =
        map[status] || { label: status || "ไม่ทราบสถานะ", className: "status-unknown" };

    return <span className={`po-status-badge ${className}`}>{label}</span>;
};

export default PurchaseOrderStatusBadge;
