import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PurchaseOrderItemsTable from "./PurchaseOrderItemsTable";
import PurchaseOrderActions from "./PurchaseOrderActions";
import PurchaseOrderStatusBadge from "./PurchaseOrderStatusBadge";
import { returnPurchaseItem } from "../../api/purchaseOrder/purchaseOrderApi"; // ✅ import API

interface PopupState {
    type: "success" | "error" | "confirm" | null;
    message: string;
    onConfirm?: () => void;
}

interface PurchaseOrderCardProps {
    po: any;
    onActionComplete: () => void;
    setPopup: React.Dispatch<React.SetStateAction<PopupState | null>>;
}

const PurchaseOrderCard: React.FC<PurchaseOrderCardProps> = ({ po, onActionComplete, setPopup }) => {
    const navigate = useNavigate();
    const [selectedItem, setSelectedItem] = useState<any | null>(null);

    const handleReturnItem = (item: any) => {
        setSelectedItem(item);
        setPopup({
            type: "confirm",
            message: `ต้องการคืนสินค้า "${item.productName}" ใช่ไหม?`,
            onConfirm: () => handleConfirmReturn(item),
        });
    };
    const handleConfirmReturn = async (item: any) => {
        const token = localStorage.getItem("token") || "";
        const quantity = item.quantity || 1;

        setPopup({
            type: "success",
            message: "⏳ กำลังดำเนินการคืนสินค้า...",
        });

        const res = await returnPurchaseItem(po._id, item.batchNumber, quantity, token); // ✅ ใช้ batchNumber แทน

        if (res.success) {
            setPopup({
                type: "success",
                message: res.message || `✅ คืนสินค้า "${item.productName}" สำเร็จแล้ว!`,
            });
            onActionComplete();
        } else {
            setPopup({
                type: "error",
                message: res.message || "❌ เกิดข้อผิดพลาดในการคืนสินค้า",
            });
        }
    };

    return (
        <div className="po-card">
            <div className="po-card-header">
                <h2 className="po-number">{po.purchaseOrderNumber}</h2>
                <PurchaseOrderStatusBadge status={po.status} />
            </div>

            <PurchaseOrderItemsTable
                items={po.items}
                stockLots={po.stockLots}
                onReturnItem={handleReturnItem}
            />

            <PurchaseOrderActions
                po={po}
                navigate={navigate}
                onActionComplete={onActionComplete}
                setPopup={setPopup}
            />
        </div>
    );
};

export default PurchaseOrderCard;
