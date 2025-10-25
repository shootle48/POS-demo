import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PurchaseOrderItemsTable from "./PurchaseOrderItemsTable";
import PurchaseOrderActions from "./PurchaseOrderActions";
import PurchaseOrderStatusBadge from "./PurchaseOrderStatusBadge";
import { returnPurchaseItem } from "../../api/purchaseOrder/purchaseOrderApi";
import "../../styles/purchaseOrder/PurchaseOrderCard.css";

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
    const [loadingItem, setLoadingItem] = useState<string | null>(null);

    // ✅ คำนวณราคารวมทั้งหมด
    const totalAmount = useMemo(() => {
        if (!po?.items) return 0;
        return po.items.reduce((sum: number, item: any) => {
            const qty = item.quantity || 0;
            const price = item.costPrice || 0;
            return sum + qty * price;
        }, 0);
    }, [po]);

    /* ==========================================================
       🔁 Handle การคืนสินค้ารายตัว
    ========================================================== */
    const handleReturnItem = (item: any) => {
        setSelectedItem(item);
        setPopup({
            type: "confirm",
            message: `คุณต้องการคืนสินค้า "${item.productName}" ใช่ไหม?`,
            onConfirm: () => handleConfirmReturn(item),
        });
    };

    const handleConfirmReturn = async (item: any) => {
        const token = localStorage.getItem("token") || "";
        const quantity = item.quantity || 1;

        setLoadingItem(item._id);

        try {
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
        } catch (err: any) {
            setPopup({
                type: "error",
                message: "⚠️ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้",
            });
        } finally {
            setLoadingItem(null);
        }
    };

    return (
        <div className="po-card">
            {/* ===== Header Section ===== */}
            <div className="po-card-header">
                <div className="po-header-left">
                    <h2 className="po-number">📦 {po.purchaseOrderNumber}</h2>
                    <p className="po-supplier">
                        🏢 ผู้จัดจำหน่าย:{" "}
                        <strong>{po.supplierCompany || "ไม่ระบุ"}</strong>
                    </p>
                    {po.invoiceNumber && (
                        <p className="po-invoice">🧾 ใบแจ้งหนี้: {po.invoiceNumber}</p>
                    )}
                </div>
                <div className="po-header-right">
                    <PurchaseOrderStatusBadge status={po.status} />
                    <span className="po-date">
                        🗓️ วันที่สั่งซื้อ:{" "}
                        {new Date(po.orderDate).toLocaleDateString("th-TH")}
                    </span>
                </div>
            </div>

            {/* ===== Items Table ===== */}
            <PurchaseOrderItemsTable
                items={po.items}
                stockLots={po.stockLots}
                onReturnItem={handleReturnItem}
                loadingItem={loadingItem}
            />

            {/* ===== Total Summary ===== */}
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

            {/* ===== Actions ===== */}
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
