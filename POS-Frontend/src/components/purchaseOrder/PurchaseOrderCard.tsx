import React, { useState, useMemo } from "react";
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

    // ✅ คำนวณราคารวมทั้งหมด (รวมทุก item)
    const totalAmount = useMemo(() => {
        if (!po?.items) return 0;
        return po.items.reduce((sum: number, item: any) => {
            const qty = item.quantity || 0;
            const price = item.costPrice || 0;
            return sum + qty * price;
        }, 0);
    }, [po]);

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

        const res = await returnPurchaseItem(po._id, item.batchNumber, quantity, token);

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
                <div>
                    <h2 className="po-number">{po.purchaseOrderNumber}</h2>
                    <p className="po-supplier">
                        🏢 ผู้จัดจำหน่าย: <strong>{po.supplierCompany || "ไม่ระบุ"}</strong>
                    </p>
                </div>
                <PurchaseOrderStatusBadge status={po.status} />
            </div>

            <PurchaseOrderItemsTable
                items={po.items}
                stockLots={po.stockLots}
                onReturnItem={handleReturnItem}
            />

            {/* ✅ แสดงราคารวมทั้งหมด */}
            <div className="po-total-section">
                <div className="po-total-line" />
                <div className="po-total-label">
                    💰 ราคารวมทั้งหมด:
                    <span className="po-total-value">
                        {totalAmount.toLocaleString("th-TH", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}{" "}
                        บาท
                    </span>
                </div>
            </div>

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
