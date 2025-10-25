import React from "react";
import ReactDOM from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import "../../styles/purchaseOrder/PurchaseOrderPrintModal.css";

const COMPANY_INFO = {
    name: "EazyPOS Store Co., Ltd.",
    address: "123 ถนนสุขุมวิท เขตวัฒนา กรุงเทพฯ 10110",
    phone: "โทร. 02-123-4567",
    taxId: "0105551234567",
    logo: "/images/company-logo.png",
};

const PurchaseOrderPrintModal = ({ po, onClose }: any) => {
    const totalAmount = po.items.reduce(
        (sum: number, i: any) => sum + i.costPrice * i.quantity,
        0
    );

    return ReactDOM.createPortal(
        <div className="po-print-modal-overlay">
            <div className="po-print-modal">
                <div className="po-print-scope">
                    {/* Header */}
                    <div className="company-info">
                        <img src={COMPANY_INFO.logo} alt="logo" className="company-logo" />
                        <div className="company-details">
                            <h1>{COMPANY_INFO.name}</h1>
                            <p>{COMPANY_INFO.address}</p>
                            <p>{COMPANY_INFO.phone}</p>
                            <p>เลขประจำตัวผู้เสียภาษี {COMPANY_INFO.taxId}</p>
                        </div>
                    </div>

                    <h2 className="po-title">ใบสั่งซื้อสินค้า (PURCHASE ORDER)</h2>

                    {/* PO Info */}
                    <div className="po-info">
                        <div>
                            <p><strong>เลขที่ใบสั่งซื้อ:</strong> {po.purchaseOrderNumber}</p>
                            <p><strong>วันที่:</strong> {new Date(po.orderDate).toLocaleDateString("th-TH")}</p>
                        </div>
                        <div>
                            <p><strong>ผู้จัดส่ง:</strong> {po.supplierCompany}</p>
                            <p><strong>คลังสินค้า:</strong> {po.location?.name || "-"}</p>
                        </div>
                    </div>

                    {/* Table */}
                    <table className="print-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>ชื่อสินค้า</th>
                                <th>Barcode</th>
                                <th>จำนวน</th>
                                <th>ราคาทุน/หน่วย</th>
                                <th>ราคารวม</th>
                            </tr>
                        </thead>
                        <tbody>
                            {po.items.map((item: any, i: number) => (
                                <tr key={i}>
                                    <td>{i + 1}</td>
                                    <td>{item.productName}</td>
                                    <td>{item.barcode}</td>
                                    <td>{item.quantity}</td>
                                    <td>{item.costPrice?.toLocaleString()}</td>
                                    <td>{(item.quantity * item.costPrice).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="total-section">
                        รวมทั้งสิ้น: <strong>{totalAmount.toLocaleString()} บาท</strong>
                    </div>

                    {/* Footer */}
                    <div className="footer-section">
                        <div className="signature-block">
                            <p>ลงชื่อ .............................................</p>
                            <p>(ผู้สั่งซื้อ)</p>
                            <p>วันที่ ........../........../..........</p>
                        </div>
                        <div className="signature-block">
                            <p>ลงชื่อ .............................................</p>
                            <p>(ผู้จัดส่ง)</p>
                            <p>วันที่ ........../........../..........</p>
                        </div>
                        <div className="qr-block">
                            <QRCodeSVG value={window.location.href} size={80} />
                            <p>สแกนเพื่อดูใบสั่งซื้อ</p>
                        </div>
                    </div>

                    <div className="print-modal-buttons">
                        <button className="btn-print-now" onClick={() => setTimeout(() => window.print(), 300)}>
                            🖨️ พิมพ์เอกสาร
                        </button>
                        <button className="btn-close" onClick={onClose}>
                            ปิด
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body // ✅ render นอก display layout
    );
};

export default PurchaseOrderPrintModal;
