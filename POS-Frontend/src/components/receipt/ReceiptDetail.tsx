import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchReceiptById } from "../../api/receipt/receiptApi.ts";
import "../../styles/receipt/ReceiptDetail.css";
import React from "react";

interface Item {
    barcode: string;
    name: string;
    price: number;
    quantity: number;
    subtotal: number;
    _id: string;
}

interface Receipt {
    _id: string;
    paymentId: string;
    employeeName: string;
    items: Item[];
    totalPrice: number;
    paymentMethod: string;
    amountPaid: number;
    changeAmount: number;
    timestamp: number; // Changed to number for UNIX timestamp
    formattedDate?: {
        thai: string;
        iso: string;
        unix: number;
    };
}

// Updated format function to handle UNIX timestamp
const formatThaiDateTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000); // Convert UNIX seconds to milliseconds
    return date.toLocaleString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Bangkok"
    }).replace("น.", "").trim() + " น.";
};



export default function ReceiptDetail() {
    const { paymentId } = useParams<{ paymentId?: string }>();
    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!paymentId) {
            setError("ไม่พบข้อมูลใบเสร็จ");
            setLoading(false);
            return;
        }

        const getReceiptDetail = async () => {
            try {
                const response = await fetchReceiptById(paymentId);
                console.log("📌 API Response:", response);
                if (response.success && response.receipt) {
                    setReceipt(response.receipt);
                } else {
                    setError("ไม่พบข้อมูลใบเสร็จ");
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
            } finally {
                setLoading(false);
            }
        };

        getReceiptDetail();
    }, [paymentId]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="receipt-detail-container">
            <div className="receipt-detail-paper">
                <h2 className="receipt-detail-title">ใบเสร็จรับเงิน</h2>

                {loading && <p className="receipt-detail-loading">กำลังโหลดข้อมูล...</p>}
                {error && <p className="receipt-detail-error">{error}</p>}

                {!loading && !error && receipt && (
                    <>
                        <p><strong>วันที่:</strong> {
                            receipt.formattedDate?.thai || 
                            formatThaiDateTime(receipt.timestamp)
                        }</p>
                        <p><strong>พนักงาน:</strong> {receipt.employeeName ?? "ไม่ระบุ"}</p>
                        <hr />

                        <table className="receipt-detail-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>สินค้า</th>
                                    <th>จำนวน</th>
                                    <th>ราคา</th>
                                </tr>
                            </thead>
                            <tbody>
                                {receipt.items.map((item, index) => (
                                    <tr key={item._id}>
                                        <td>{index + 1}</td>
                                        <td>{item.name}</td>
                                        <td>{item.quantity}</td>
                                        <td>{item.subtotal.toLocaleString()} ฿</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <hr />
                        <p><strong>รวมทั้งหมด:</strong> {receipt.totalPrice.toLocaleString()} ฿</p>
                        <p><strong>วิธีชำระเงิน:</strong> {receipt.paymentMethod}</p>
                        <p><strong>จำนวนเงินที่จ่าย:</strong> {receipt.amountPaid.toLocaleString()} ฿</p>
                        <p><strong>เงินทอน:</strong> {receipt.changeAmount.toLocaleString()} ฿</p>
                        <hr />

                        <p className="receipt-detail-thankyou">🙏 ขอบคุณที่ใช้บริการ 🙏</p>
                    </>
                )}
            </div>

            {/* ปุ่มพิมพ์ใบเสร็จ */}
            <button className="receipt-detail-print-button" onClick={handlePrint}>
                🖨️ พิมพ์ใบเสร็จ
            </button>
        </div>
    );
}
