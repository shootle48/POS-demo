import React, { useEffect, useState } from "react";
import { getPurchaseOrders } from "../../api/purchaseOrder/purchaseOrderApi";
import PurchaseOrderCard from "./PurchaseOrderCard";
import PurchaseOrderPopup from "./PurchaseOrderPopup";
import "../../styles/purchaseOrder/PurchaseOrderPage.css";

interface PurchaseOrder {
    _id: string;
    purchaseOrderNumber: string;
    items: any[];
    location: any;
    status: string;
    qcStatus: string;
    orderDate: string;
    supplierCompany: string;
    totalAmount: number;
    invoiceNumber?: string;
}

interface PopupState {
    type: "success" | "error" | "confirm" | null;
    message: string;
    onConfirm?: () => void;
}

const PurchaseOrderPage: React.FC = () => {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [popup, setPopup] = useState<PopupState | null>(null);

    const loadOrders = async () => {
        try {
            const token = localStorage.getItem("token") || "";
            const res = await getPurchaseOrders(token);
            if (res.success) {
                setOrders(res.data);
            } else {
                setError(res.message || "ไม่สามารถโหลดข้อมูลใบสั่งซื้อได้");
            }
        } catch {
            setError("เกิดข้อผิดพลาดในการโหลด Purchase Orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, []);

    if (loading) return <p className="order-loading">⏳ กำลังโหลดข้อมูล...</p>;
    if (error) return <p className="order-error">{error}</p>;

    return (
        <div className="display">
            <div className="po-container">
                <div className="po-header-wrapper">
                    <h1 className="po-header">📦 รายการใบสั่งซื้อสินค้า</h1>
                </div>

                {orders.length === 0 ? (
                    <p className="po-empty">ยังไม่มีข้อมูลใบสั่งซื้อ</p>
                ) : (
                    <div className="po-list">
                        {orders.map((po) => (
                            <PurchaseOrderCard
                                key={po._id}
                                po={po}
                                onActionComplete={loadOrders}
                                setPopup={setPopup}
                            />
                        ))}
                    </div>
                )}
            </div>

            {popup && (
                <PurchaseOrderPopup
                    type={popup.type!}
                    message={popup.message}
                    onClose={() => setPopup(null)}
                    onConfirm={popup.onConfirm}
                />
            )}
        </div>
    );
};

export default PurchaseOrderPage;
