import React, { useEffect, useState } from "react";
import {
    getPurchaseOrders,
    confirmPurchaseOrder,
    updateQCStatus,
    cancelPurchaseOrder,
    returnPurchaseOrder,
} from "../../api/purchaseOrder/purchaseOrderApi";
import "../../styles/purchaseOrder/PurchaseOrderPage.css";
import { createTransaction } from "../../api/stock/transactionApi";
import PurchaseOrderPopup from "./PurchaseOrderPopup";

interface Item {
    stockId: string;
    productId: string;
    productName: string;
    quantity: number;
    costPrice: number;
    batchNumber: string;
    expiryDate?: string;
}

interface PurchaseOrder {
    _id: string;
    purchaseOrderNumber: string;
    items: Item[];
    location: string;
    status: string;
    qcStatus: string;
    orderDate: string;
    supplierCompany: string;
    totalAmount: number;
    invoiceNumber?: string;
}

const qcOptions = ["รอตรวจสอบ", "ผ่าน", "ไม่ผ่าน"];

const PurchaseOrderPage: React.FC = () => {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingIds, setUpdatingIds] = useState<string[]>([]);
    const [popup, setPopup] = useState<{
        type: "success" | "error" | "confirm";
        message: string;
        onConfirm?: () => void;
    } | null>(null);

    // ================== โหลด Purchase Orders ==================
    const loadOrders = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("token") || "";
            const res = await getPurchaseOrders(token);

            if (res.success) {
                setOrders(res.data);
            } else {
                setError(res.message || "โหลด Purchase Orders ไม่สำเร็จ");
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

    const formatThaiDateTime = (dateString: string) =>
        new Date(dateString)
            .toLocaleString("th-TH", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                timeZone: "Asia/Bangkok",
            })
            .replace("น.", "")
            .trim() + " น.";

    // เปิด confirm popup แทน window.confirm
    // เปิด confirm popup แทน window.confirm (Cancel)
    const openCancelConfirm = (poId: string) => {
        setPopup({
            type: "confirm",
            message: "คุณแน่ใจหรือไม่ที่จะยกเลิก PO นี้?",
            onConfirm: () => handleCancel(poId),
        });
    };

    // เปิด confirm popup สำหรับ Return
    const openReturnConfirm = (poId: string) => {
        setPopup({
            type: "confirm",
            message: "คุณแน่ใจหรือไม่ที่จะคืนสินค้า PO นี้?",
            onConfirm: () => handleReturn(poId),
        });
    };

    // ================== Confirm PO ==================
    const handleConfirm = async (poId: string) => {
        setUpdatingIds((prev) => [...prev, poId]);
        try {
            const token = localStorage.getItem("token") || "";
            const res = await confirmPurchaseOrder(poId, token);

            if (res.success) {
                setOrders((prev) =>
                    prev.map((po) =>
                        po._id === poId ? { ...po, status: "ได้รับสินค้าแล้ว" } : po
                    )
                );
                setPopup({ type: "success", message: res.message });
            } else {
                setPopup({ type: "error", message: res.message });
            }
        } catch {
            setPopup({ type: "error", message: "เกิดข้อผิดพลาดในการ Confirm PO" });
        } finally {
            setUpdatingIds((prev) => prev.filter((id) => id !== poId));
        }
    };

    // ================== Update QC Status ==================
    const handleUpdateQC = async (poId: string, newStatus: string) => {
        setUpdatingIds((prev) => [...prev, poId]);
        try {
            const token = localStorage.getItem("token") || "";
            const res = await updateQCStatus(poId, newStatus as any, token);

            if (res.success) {
                setOrders((prev) =>
                    prev.map((po) =>
                        po._id === poId
                            ? {
                                ...po,
                                qcStatus: newStatus,
                                status:
                                    newStatus === "ไม่ผ่าน"
                                        ? "ไม่ผ่าน QC - รอส่งคืนสินค้า"
                                        : po.status,
                            }
                            : po
                    )
                );

                if (newStatus === "ผ่าน") {
                    const currentPO = orders.find((po) => po._id === poId);
                    if (currentPO) {
                        for (const item of currentPO.items) {
                            try {
                                await createTransaction(
                                    {
                                        stockId: item.stockId,
                                        productId: item.productId,
                                        type: "RESTOCK",
                                        quantity: item.quantity,
                                        costPrice: item.costPrice,
                                        notes: `เติมสต็อกจาก PO ${currentPO.purchaseOrderNumber}`,
                                    },
                                    token
                                );
                            } catch (err) {
                                console.error("❌ CreateTransaction Error:", err);
                            }
                        }
                    }
                }
                setPopup({ type: "success", message: res.message });
            } else {
                setPopup({ type: "error", message: res.message });
            }
        } catch {
            setPopup({ type: "error", message: "เกิดข้อผิดพลาดในการอัปเดต QC" });
        } finally {
            setUpdatingIds((prev) => prev.filter((id) => id !== poId));
        }
    };

    // ================== Cancel PO ==================
    const handleCancel = async (poId: string) => {
        setUpdatingIds((prev) => [...prev, poId]);
        try {
            const token = localStorage.getItem("token") || "";
            const res = await cancelPurchaseOrder(poId, token);

            if (res.success) {
                setOrders((prev) =>
                    prev.map((po) =>
                        po._id === poId ? { ...po, status: "ยกเลิก" } : po
                    )
                );
                setPopup({ type: "success", message: res.message });
            } else {
                setPopup({ type: "error", message: res.message });
            }
        } catch {
            setPopup({ type: "error", message: "เกิดข้อผิดพลาดในการยกเลิก PO" });
        } finally {
            setUpdatingIds((prev) => prev.filter((id) => id !== poId));
        }
    };


    // ================== Return PO ==================
    // ================== Return PO ==================
    const handleReturn = async (poId: string) => {
        setUpdatingIds((prev) => [...prev, poId]);
        try {
            const token = localStorage.getItem("token") || "";
            const res = await returnPurchaseOrder(poId, token);

            if (res.success) {
                setOrders((prev) =>
                    prev.map((po) =>
                        po._id === poId
                            ? { ...po, status: "ไม่ผ่าน QC - คืนสินค้าแล้ว" }
                            : po
                    )
                );
                setPopup({ type: "success", message: res.message });
            } else {
                setPopup({ type: "error", message: res.message });
            }
        } catch {
            setPopup({ type: "error", message: "เกิดข้อผิดพลาดในการคืนสินค้า PO" });
        } finally {
            setUpdatingIds((prev) => prev.filter((id) => id !== poId));
        }
    };


    const statusClassMap: Record<string, string> = {
        "รอดำเนินการ": "pending",
        "ได้รับสินค้าแล้ว": "received",
        "ยกเลิก": "cancelled",
        "ไม่ผ่าน QC - รอส่งคืนสินค้า": "qc-pending-return",
        "ไม่ผ่าน QC - คืนสินค้าแล้ว": "qc-returned",
    };

    // ================== UI ==================
    if (loading) return <p className="order-loading">กำลังโหลดข้อมูล...</p>;
    if (error) return <p className="order-error">{error}</p>;

    return (
        <div className="display">
            <div className="po-container">
                <div className="po-header-wrapper">
                    <h1 className="po-header">รายการใบสั่งซื้อสินค้า</h1>
                </div>

                {orders.length === 0 ? (
                    <p className="po-empty">ยังไม่มี Purchase Order</p>
                ) : (
                    <div className="po-list">
                        {orders.map((po) => {
                            const isUpdating = updatingIds.includes(po._id);
                            return (
                                <div key={po._id} className="po-card">
                                    {/* Header */}
                                    <div className="po-card-header">
                                        <div>
                                            <h2 className="po-number">{po.purchaseOrderNumber}</h2>
                                            <p className="po-date">📅 {formatThaiDateTime(po.orderDate)}</p>
                                        </div>
                                        <span className={`po-status-badge ${statusClassMap[po.status] || ""}`}>
                                            {po.status}
                                        </span>
                                    </div>

                                    {/* PO Info */}
                                    <div className="po-info">
                                        <p><strong>ผู้จัดส่ง:</strong> {po.supplierCompany}</p>
                                        <p><strong>สถานที่รับสินค้า:</strong> {po.location}</p>
                                        <p><strong>ยอดรวม:</strong> {po.totalAmount.toLocaleString()} บาท</p>
                                        <p><strong>QC:</strong>
                                            <span className={`qc-status qc-${po.qcStatus}`}>
                                                {po.qcStatus}
                                            </span>
                                        </p>
                                    </div>

                                    {/* Items Table */}
                                    <div className="po-items">
                                        <h4>📦 รายการสินค้า</h4>
                                        <table className="po-items-table">
                                            <thead>
                                                <tr>
                                                    <th>สินค้า</th>
                                                    <th>จำนวน</th>
                                                    <th>ราคาต้นทุน</th>
                                                    <th>Batch</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {po.items.map((item, index) => (
                                                    <tr key={index}>
                                                        <td>{item.productName}</td>
                                                        <td>{item.quantity}</td>
                                                        <td>{item.costPrice.toLocaleString()} ฿</td>
                                                        <td>{item.batchNumber || "-"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Actions */}
                                    <div className="po-actions">
                                        {po.status === "รอดำเนินการ" && (
                                            <>
                                                <button onClick={() => handleConfirm(po._id)} disabled={isUpdating}>
                                                    ยืนยันใบสั่งซื้อ
                                                </button>
                                                <button
                                                    className="po-cancel-button"
                                                    onClick={() => openCancelConfirm(po._id)}
                                                    disabled={isUpdating}
                                                >
                                                    ยกเลิก
                                                </button>
                                            </>
                                        )}

                                        {po.status === "ได้รับสินค้าแล้ว" && (
                                            <select
                                                value={po.qcStatus}
                                                onChange={(e) => handleUpdateQC(po._id, e.target.value)}
                                                disabled={isUpdating || po.qcStatus === "ผ่าน"}
                                            >
                                                {qcOptions.map((status) => (
                                                    <option key={status} value={status}>
                                                        {status}
                                                    </option>
                                                ))}
                                            </select>
                                        )}


                                        {po.status === "ไม่ผ่าน QC - รอส่งคืนสินค้า" && (
                                            <button
                                                className="po-return-button"
                                                onClick={() => openReturnConfirm(po._id)}
                                                disabled={isUpdating}
                                            >
                                                ↩️ คืนสินค้า
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ✅ Popup */}
            {popup && (
                <PurchaseOrderPopup
                    type={popup.type}
                    message={popup.message}
                    onClose={() => setPopup(null)}
                    onConfirm={popup.onConfirm}
                />
            )}

        </div>
    );
};

export default PurchaseOrderPage;
