import React, { useState } from "react";
import "../../styles/purchaseOrder/PurchaseOrderReturn.css";
import { getQCByBatch } from "../../api/purchaseOrder/qcApi"; // ✅ ใช้ API ที่มีอยู่แล้ว

interface Props {
    items: any[];
    stockLots: any[];
    onReturnItem?: (item: any) => void;
}

const PurchaseOrderItemsTable: React.FC<Props> = ({
    items,
    stockLots,
    onReturnItem,
}) => {
    const [showModal, setShowModal] = useState(false);
    const [qcRecords, setQcRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);

    const token = localStorage.getItem("token") || "";

    const getLotInfo = (batchNumber: string) =>
        stockLots.find((lot) => lot.batchNumber === batchNumber);

    const getQCStatus = (batchNumber: string) => {
        const lot = getLotInfo(batchNumber);
        return lot?.qcStatus || "รอตรวจสอบ";
    };

    const getExpiryDate = (batchNumber: string) => {
        const lot = getLotInfo(batchNumber);
        return lot?.expiryDate
            ? new Date(lot.expiryDate).toLocaleDateString("th-TH")
            : "-";
    };

    const getQCClass = (status: string) => {
        switch (status) {
            case "ผ่าน":
                return "qc-pass";
            case "ไม่ผ่าน":
                return "qc-fail";
            case "ตรวจบางส่วน":
            case "ผ่านบางส่วน":
                return "qc-partial";
            default:
                return "qc-pending";
        }
    };

    // ✅ เปิด modal พร้อมโหลดข้อมูล QC ตาม batchNumber
    const handleRowClick = async (item: any) => {
        const batchNumber = item.batchNumber;
        setSelectedBatch(batchNumber);
        setSelectedItem(item);
        setLoading(true);
        setShowModal(true);

        try {
            const res = await getQCByBatch(batchNumber, token);
            if (res.success && res.data.length > 0) {
                setQcRecords(res.data);
            } else {
                setQcRecords([]);
            }
        } catch (err) {
            console.error("❌ Error fetching QC:", err);
            setQcRecords([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="po-items">
            <h4>📋 รายการสินค้า</h4>
            <table className="po-items-table">
                <thead>
                    <tr>
                        <th>สินค้า</th>
                        <th>Barcode</th>
                        <th>จำนวน</th>
                        <th>ราคาต่อหน่วย</th>
                        <th>ราคารวม</th>
                        <th>เลขล็อตสินค้า</th>
                        <th>สถานะ QC</th>
                        <th>คืนสินค้า</th>
                        <th>วันหมดอายุ</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => {
                        const total = item.costPrice * item.quantity;
                        const qcStatus = getQCStatus(item.batchNumber);
                        const qcClass = getQCClass(qcStatus);
                        const isReturned = item.isReturned === true;

                        return (
                            <tr
                                key={index}
                                className="po-row"
                                onClick={() => handleRowClick(item)}
                                style={{ cursor: "pointer" }}
                            >
                                <td>{item.productName}</td>
                                <td>{item.barcode || "-"}</td>
                                <td>{item.quantity}</td>
                                <td>{item.costPrice.toLocaleString()}</td>
                                <td className="po-total-cell">{total.toLocaleString()} ฿</td>
                                <td>{item.batchNumber || "-"}</td>
                                <td>
                                    <span className={`qc-status ${qcClass}`}>{qcStatus}</span>
                                </td>
                                <td>
                                    {qcStatus === "ไม่ผ่าน" || qcStatus === "ผ่านบางส่วน" ? (
                                        isReturned ? (
                                            <button className="return-btn-returned" disabled>
                                                คืนแล้ว
                                            </button>
                                        ) : (
                                            <button
                                                className="return-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation(); // ❗ ป้องกันเปิด modal ซ้อน
                                                    onReturnItem?.(item);
                                                }}
                                            >
                                                คืนสินค้า
                                            </button>
                                        )
                                    ) : (
                                        <span className="return-disabled">-</span>
                                    )}
                                </td>
                                <td>{getExpiryDate(item.batchNumber)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* ✅ Modal แสดงผลข้อมูล QC */}
            {showModal && (
                <div className="po-lot-modal-overlay" onClick={() => setShowModal(false)}>
                    <div
                        className="po-lot-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3>
                            รายละเอียด QC — {selectedItem?.productName} ({selectedBatch})
                        </h3>

                        {loading ? (
                            <p style={{ textAlign: "center" }}>⏳ กำลังโหลดข้อมูล...</p>
                        ) : qcRecords.length > 0 ? (
                            <table className="lot-detail-table">
                                <thead>
                                    <tr>
                                        <th>ผู้ตรวจสอบ</th>
                                        <th>สถานะ QC</th>
                                        <th>จำนวนทั้งหมด</th>
                                        <th>จำนวนไม่ผ่าน</th>
                                        <th>หมายเหตุ</th>
                                        <th>วันที่ตรวจ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {qcRecords.map((qc, idx) => (
                                        <tr key={idx}>
                                            <td>{qc.userId?.username || "-"}</td>
                                            <td>{qc.status}</td>
                                            <td>{qc.totalQuantity ?? "-"}</td>
                                            <td>{qc.failedQuantity ?? 0}</td>
                                            <td>{qc.remarks || "-"}</td>
                                            <td>
                                                {qc.inspectionDate
                                                    ? new Date(qc.inspectionDate).toLocaleDateString("th-TH")
                                                    : "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p style={{ textAlign: "center", color: "#777" }}>
                                ไม่พบข้อมูล QC สำหรับล็อตนี้
                            </p>
                        )}

                        <button
                            className="modal-close-btn"
                            onClick={() => setShowModal(false)}
                        >
                            ปิด
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseOrderItemsTable;
