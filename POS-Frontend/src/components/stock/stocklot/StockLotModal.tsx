import React, { useState } from "react";
import { deactivateStockLot } from "../../../api/stock/stockLotApi";
import "../../../styles/stock/StockLotModal.css";

interface Props {
    product?: any;
    po?: any;
    lots: any[];
    onClose: () => void;
    refreshData: () => void;
}

const StockLotModal: React.FC<Props> = ({ product, po, lots, onClose, refreshData }) => {
    const [showPopup, setShowPopup] = useState(false);
    const [selectedLot, setSelectedLot] = useState<any>(null);
    const [reason, setReason] = useState("");
    const [status, setStatus] = useState("สินค้าเสียหาย");
    const [loading, setLoading] = useState(false);

    const statusOptions = [
        "สินค้าเสียหาย",
        "หมดอายุ",
        "ไม่ผ่าน QC",
        "รอคัดออก",
        "อื่นๆ",
    ];

    const handleOpenPopup = (lot: any) => {
        setSelectedLot(lot);
        setShowPopup(true);
    };

    const handleDeactivate = async () => {
        if (!selectedLot) return;
        const token = localStorage.getItem("token") || "";

        if (!reason.trim()) {
            alert("⚠️ กรุณาระบุเหตุผลในการปิดล็อต");
            return;
        }

        setLoading(true);
        try {
            await deactivateStockLot(selectedLot._id, token, { reason, status });
            alert("✅ ปิดล็อตสำเร็จ");
            refreshData();
            setShowPopup(false);
            setReason("");
        } catch (err) {
            console.error(err);
            alert("❌ เกิดข้อผิดพลาดในการปิดล็อต");
        } finally {
            setLoading(false);
        }
    };

    const getQCClass = (qcStatus: string) => {
        switch (qcStatus) {
            case "ผ่าน":
                return "qc-pass";
            case "ไม่ผ่าน":
                return "qc-fail";
            case "รอตรวจสอบ":
                return "qc-pending";
            case "ตรวจบางส่วน":
            case "ผ่านบางส่วน":
                return "qc-partial";
            default:
                return "qc-unknown";
        }
    };

    return (
        <div className="stocklots-modal-overlay" onClick={onClose}>
            <div className="stocklots-modal-content" onClick={(e) => e.stopPropagation()}>
                <h3 className="stocklots-modal-title">
                    {product
                        ? `ล็อตของสินค้า: ${product.name}`
                        : `ล็อตในใบสั่งซื้อ ${po?.purchaseOrderNumber || ""}`}
                </h3>

                <div className="stocklot-table-wrapper">
                    <table className="stocklot-modal-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>เลขล็อตสินค้า</th>
                                <th>จำนวนเริ่มต้น</th> {/* ✅ เพิ่ม */}
                                <th>จำนวนคงเหลือ</th>
                                <th>วันหมดอายุ</th>
                                <th>สถานะ QC</th>
                                <th>สถานะล็อต</th>
                                <th>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lots.length > 0 ? (
                                lots.map((lot, i) => (
                                    <tr key={lot._id}>
                                        <td>{i + 1}</td>
                                        <td>{lot.batchNumber || "-"}</td>
                                        <td>{lot.quantity ?? 0}</td> {/* ✅ จำนวนก่อนขาย */}
                                        <td>{lot.remainingQty ?? 0}</td> {/* ✅ จำนวนหลังขาย */}
                                        <td>
                                            {lot.expiryDate
                                                ? new Date(lot.expiryDate).toLocaleDateString("th-TH")
                                                : "-"}
                                        </td>
                                        <td>
                                            <span className={`stocklots-qc-status ${getQCClass(lot.qcStatus)}`}>
                                                {lot.qcStatus || "ไม่ทราบ"}
                                            </span>
                                        </td>
                                        <td>{lot.status || "-"}</td>
                                        <td>
                                            {lot.isActive ? (
                                                <button
                                                    className="danger-btn"
                                                    onClick={() => handleOpenPopup(lot)}
                                                >
                                                    ปิดล็อต
                                                </button>
                                            ) : (
                                                <span className="closed-label">ปิดแล้ว</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: "center", padding: "20px" }}>
                                        ❌ ไม่มีข้อมูลล็อต
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <button className="close-btn" onClick={onClose}>
                    ปิด
                </button>
            </div>

            {/* === Popup ปิดล็อต === */}
            {showPopup && (
                <div className="stocklots-modal-popup-overlay" onClick={() => setShowPopup(false)}>
                    <div
                        className="stocklots-modal-popup-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3>🧾 ระบุเหตุผลในการปิดล็อต</h3>

                        <label>สถานะหลังปิด:</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="stocklots-modal-popup-select"
                        >
                            {statusOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>

                        <label>เหตุผล:</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="stocklots-modal-popup-textarea"
                            placeholder="เช่น พบตำหนิหลัง QC, สินค้าชำรุด, หมดอายุ..."
                        />

                        <div className="stocklots-popup-actions">
                            <button
                                className="stocklots-confirm-btn"
                                onClick={handleDeactivate}
                                disabled={loading}
                            >
                                {loading ? "⏳ กำลังดำเนินการ..." : "ยืนยัน"}
                            </button>
                            <button
                                className="stocklots-cancel-btn"
                                onClick={() => setShowPopup(false)}
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockLotModal;
