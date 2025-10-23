import React from "react";

interface Props {
    status: string;
}

const PurchaseOrderStatusBadge: React.FC<Props> = ({ status }) => {
    const map: Record<string, { label: string; className: string }> = {
        "รอดำเนินการ": { label: "⏳ รอดำเนินการ", className: "status-pending" },
        "ได้รับสินค้าแล้ว": { label: "📦 ได้รับสินค้าแล้ว", className: "status-received" },
        "QC ผ่าน": { label: "ตรวจคุณภาพผ่าน", className: "status-qc-passed" },
        "QC ผ่านบางส่วน": { label: "ผ่านบางส่วน", className: "status-qc-partial" },
        "ตรวจบางส่วน": { label: "⚙️ ตรวจบางส่วน", className: "status-qc-partial-check" },
        "ไม่ผ่าน QC - รอส่งคืนสินค้า": { label: "⚠️ รอส่งคืนสินค้า", className: "status-qc-pending-return" },
        "ไม่ผ่าน QC - คืนสินค้าแล้ว": { label: "↩️ คืนสินค้าไม่ผ่านคุณภาพแล้ว", className: "status-qc-returned" },
        "ไม่ผ่าน QC - คืนสินค้าบางส่วนแล้ว": { label: "↩️ คืนสินค้าไม่ผ่านคุณภาพแล้ว", className: "status-qc-returned" },
        "ยกเลิก": { label: "ยกเลิก", className: "status-cancelled" },
    };

    const { label, className } = map[status] || { label: status, className: "" };

    return <span className={`po-status-badge ${className}`}>{label}</span>;
};

export default PurchaseOrderStatusBadge;
