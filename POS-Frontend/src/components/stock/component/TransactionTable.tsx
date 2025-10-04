import React from "react";


interface Product {
    name: string;
    barcode?: string;
}
interface StockTransaction {
    _id: string;
    productId: Product;
    type: string;
    quantity: number;
    userId: { username: string };
    createdAt: string;
}
interface Props {
    transactions: StockTransaction[];
    getTypeLabel: (type: string) => string;
    handleRowClick: (id: string) => void;
}

const TransactionTable: React.FC<Props> = ({ transactions, getTypeLabel, handleRowClick }) => {
    return (
        <table className="stock-table">
            <thead>
                <tr className="stock-header-row">
                    <th className="stock-header-cell">สินค้า</th>
                    <th className="stock-header-cell">จำนวน</th>
                    <th className="stock-header-cell">ประเภท</th>
                    <th className="stock-header-cell">ผู้ทำรายการ</th>
                    <th className="stock-header-cell">วันที่</th>
                </tr>
            </thead>
            <tbody>
                {transactions.map((t) => (
                    <tr key={t._id} onClick={() => handleRowClick(t._id)} className="clickable-row">
                        <td className="stock-cell">{t.productId.name}</td>
                        <td className="stock-cell">{t.quantity}</td>
                        <td className="stock-cell">{getTypeLabel(t.type)}</td>
                        <td className="stock-cell">{t.userId.username}</td>
                        <td className="stock-cell">{new Date(t.createdAt).toLocaleString("th-TH", { hour12: false })}</td>
                    </tr>
                ))}
                {transactions.length === 0 && (
                    <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: "20px" }}>ไม่พบรายการ</td>
                    </tr>
                )}
            </tbody>
        </table>
    );
};

export default TransactionTable;
