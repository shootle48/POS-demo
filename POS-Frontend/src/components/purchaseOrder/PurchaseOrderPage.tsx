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
    const [search, setSearch] = useState("");

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

    const filteredOrders = orders.filter(
        (po) =>
            po.purchaseOrderNumber.toLowerCase().includes(search.toLowerCase()) ||
            po.supplierCompany.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="display">
            <div className="po-container">
                <div className="po-header-wrapper">
                    <h1 className="po-header">📦 รายการใบสั่งซื้อสินค้า</h1>

                    <input
                        type="text"
                        placeholder="🔍 ค้นหาใบสั่งซื้อ หรือชื่อผู้จัดจำหน่าย..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="search-input"
                    />
                </div>

                {loading ? (
                    <p className="order-loading">⏳ กำลังโหลดข้อมูล...</p>
                ) : error ? (
                    <p className="order-error">{error}</p>
                ) : filteredOrders.length === 0 ? (
                    <p className="po-empty">ไม่พบข้อมูลใบสั่งซื้อ</p>
                ) : (
                    <div className="po-list">
                        {filteredOrders.map((po) => (
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
