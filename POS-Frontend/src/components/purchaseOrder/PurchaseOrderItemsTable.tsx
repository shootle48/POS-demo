import React from "react";
import "../../styles/purchaseOrder/PurchaseOrderReturn.css";

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
    const getLotInfo = (batchNumber: string) =>
        stockLots.find((lot) => lot.batchNumber === batchNumber);

    const getQCStatus = (batchNumber: string) => {
        const lot = getLotInfo(batchNumber);
        return lot?.qcStatus || "รอตรวจสอบ";
    };

    const getExpiryDate = (batchNumber: string) => {
        const lot = getLotInfo(batchNumber);
        return lot?.expiryDate ? new Date(lot.expiryDate).toLocaleDateString("th-TH") : "-";
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

    return (
        <div className="po-items">
            <h4>📋 รายการสินค้า</h4>
            <table className="po-items-table">
                <thead>
                    <tr>
                        <th>สินค้า</th>
                        <th>Barcode</th>
                        <th>จำนวน</th>
                        <th>ราคาต่อหน่วย (บาท)</th>
                        <th>ราคารวม</th>
                        <th>Batch</th>
                        <th>สถานะ QC</th>
                        <th>การคืนสินค้า</th>
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
                            <tr key={index}>
                                <td>{item.productName}</td>
                                <td>{item.barcode || "-"}</td>
                                <td>{item.quantity}</td>
                                <td>{item.costPrice.toLocaleString()}</td>
                                <td className="po-total-cell">{total.toLocaleString()} ฿</td>
                                <td>{item.batchNumber || "-"}</td>
                                <td>
                                    <span className={`qc-status ${qcClass}`}>{qcStatus}</span>
                                </td>

                                {/* ✅ ปุ่มคืนสินค้า */}
                                <td>
                                    {qcStatus === "ไม่ผ่าน" ? (
                                        isReturned ? (
                                            <button className="return-btn-returned" disabled>
                                                คืนแล้ว
                                            </button>
                                        ) : (
                                            <button
                                                className="return-btn"
                                                onClick={() => onReturnItem?.(item)}
                                            >
                                                คืนสินค้า
                                            </button>
                                        )
                                    ) : (
                                        <span className="return-disabled">-</span>
                                    )}
                                </td>

                                {/* ✅ แสดงวันหมดอายุจาก stockLots */}
                                <td>{getExpiryDate(item.batchNumber)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default PurchaseOrderItemsTable;
