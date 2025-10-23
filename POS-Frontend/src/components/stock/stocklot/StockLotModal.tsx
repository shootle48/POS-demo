import React from "react";
import { deactivateStockLot } from "../../../api/stock/stockLotApi";
import "../../../styles/stock/StockLotModal.css";

interface Props {
    product?: any;
    po?: any;
    lots: any[];
    onClose: () => void;
}

const StockLotModal: React.FC<Props> = ({ product, po, lots, onClose }) => {
    const handleDeactivate = async (lotId: string) => {
        const token = localStorage.getItem("token") || "";
        if (!window.confirm("คุณต้องการปิดล็อตนี้ใช่ไหม?")) return;
        await deactivateStockLot(lotId, token);
        window.location.reload();
    };

    const getQCClass = (status: string) => {
        switch (status) {
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
                                <th>Batch</th>
                                <th>จำนวนรับเข้า</th>
                                <th>วันที่รับเข้า</th>
                                <th>วันหมดอายุ</th>
                                <th>สถานะ QC</th>
                                <th>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lots.length > 0 ? (
                                lots.map((lot, i) => (
                                    <tr key={i}>
                                        <td>{i + 1}</td>
                                        <td>{lot.batchNumber}</td>
                                        <td>{lot.quantity}</td>
                                        <td>{new Date(lot.createdAt).toLocaleDateString("th-TH")}</td>
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
                                        <td>
                                            <button
                                                className="danger-btn"
                                                onClick={() => handleDeactivate(lot._id)}
                                            >
                                                ปิดล็อต
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: "center", padding: "20px" }}>
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
        </div>
    );
};

export default StockLotModal;
