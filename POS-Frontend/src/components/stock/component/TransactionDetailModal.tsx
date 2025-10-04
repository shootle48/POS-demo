import React from "react";

interface User {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
}

interface Product {
    _id: string;
    name: string;
    barcode?: string;
}

interface Warehouse {
    _id: string;
    name: string;
    description?: string;
    location:string;
}

interface Stock {
    _id: string;
    location?: string | Warehouse;  
    supplier?: string;
    barcode?: string;
    costPrice?: number;
    salePrice?: number;
    expiryDate?: string;
}

interface StockTransaction {
    _id: string;
    productId: Product;
    stockId: Stock;
    type: string;
    quantity: number;
    userId: User;
    notes?: string;
    createdAt: string;
}

interface Props {
    isOpen: boolean;
    transaction: StockTransaction | null;
    onClose: () => void;
    onSuccess?: (msg: string, success?: boolean) => void;
}

const TransactionDetailModal: React.FC<Props> = ({
    isOpen,
    transaction,
    onClose,
}) => {
    if (!isOpen || !transaction) return null;

    // ✅ Helper ดึงชื่อคลังเก็บ
    const getLocationName = (location?: string | Warehouse) => {
        if (!location) return "-";
        if (typeof location === "string") return location; // fallback ถ้าเป็น id
        return location.location; // ถ้า populate แล้ว
    };

    return (
        <div className="transaction-detail-modal">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>📄 รายละเอียดการทำรายการ</h2>
                    <button className="close-btn" onClick={onClose}>
                        ✖
                    </button>
                </div>

                <div className="modal-body">
                    <p>
                        <strong>วันที่:</strong>{" "}
                        {new Date(transaction.createdAt).toLocaleString("th-TH")}
                    </p>
                    <p>
                        <strong>สินค้า:</strong> {transaction.productId?.name}
                    </p>
                    <p>
                        <strong>บาร์โค้ด:</strong>{" "}
                        {transaction.productId?.barcode || transaction.stockId?.barcode || "-"}
                    </p>
                    <p>
                        <strong>ประเภท:</strong> {transaction.type}
                    </p>
                    <p>
                        <strong>จำนวน:</strong> {transaction.quantity}
                    </p>
                    <p>
                        <strong>ผู้ดำเนินการ:</strong> {transaction.userId?.username}
                    </p>
                    <p>
                        <strong>ราคาทุน:</strong>{" "}
                        {transaction.stockId?.costPrice
                            ? `${transaction.stockId.costPrice} ฿`
                            : "-"}
                    </p>
                    <p>
                        <strong>ราคาขาย:</strong>{" "}
                        {transaction.stockId?.salePrice
                            ? `${transaction.stockId.salePrice} ฿`
                            : "-"}
                    </p>
                    <p>
                        <strong>ซัพพลายเออร์:</strong> {transaction.stockId?.supplier || "-"}
                    </p>
                    <p>
                        <strong>สถานที่เก็บสินค้า:</strong>{" "}
                        {getLocationName(transaction.stockId?.location)}
                    </p>
                    <p>
                        <strong>วันหมดอายุ:</strong>{" "}
                        {transaction.stockId?.expiryDate || "-"}
                    </p>
                    <p>
                        <strong>หมายเหตุ:</strong> {transaction.notes || "-"}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TransactionDetailModal;
