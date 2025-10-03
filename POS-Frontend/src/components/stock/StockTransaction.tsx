import React, { useEffect, useState } from "react";
import "../../styles/stock/StockTransaction.css";
import { getStockTransactions } from "../../api/stock/transactionApi";

interface User {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    nameStore?: string;
}

interface Product {
    _id: string;
    name: string;
    barcode?: string;
}

interface Stock {
    _id: string;
    location?: string;
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
    type: "SALE" | "RESTOCK" | "RETURN" | "ADJUSTMENT";
    quantity: number;
    userId: User;
    notes?: string;
    source?: string;
    createdAt: string;
}

const StockTransactionPage: React.FC = () => {
    const [transactions, setTransactions] = useState<StockTransaction[]>([]);
    const [filtered, setFiltered] = useState<StockTransaction[]>([]);
    const [search, setSearch] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [loading, setLoading] = useState(true);

    // ✅ โหลดข้อมูล
    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) return;

                const res = await getStockTransactions(token);
                if (res.success) {
                    setTransactions(res.data);
                    setFiltered(res.data);
                }
            } catch (err) {
                console.error("❌ โหลด Stock Transaction ไม่สำเร็จ", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // ✅ ฟิลเตอร์ข้อมูล
    useEffect(() => {
        let data = [...transactions];
        if (search.trim()) {
            data = data.filter((t) =>
                t.productId?.name.toLowerCase().includes(search.toLowerCase())
            );
        }
        if (startDate) {
            data = data.filter((t) => new Date(t.createdAt) >= new Date(startDate));
        }
        if (endDate) {
            data = data.filter((t) => new Date(t.createdAt) <= new Date(endDate));
        }
        setFiltered(data);
    }, [search, startDate, endDate, transactions]);

    // ✅ Map type เป็นภาษาไทย
    const getTypeLabel = (type: string) => {
        switch (type) {
            case "SALE":
                return "ขายสินค้า";
            case "RESTOCK":
                return "นำเข้าสินค้า";
            case "RETURN":
                return "รับคืนสินค้า";
            case "ADJUSTMENT":
                return "ปรับปรุงสต็อก";
            default:
                return type;
        }
    };

    return (
        <div className="stock-transaction-page">
            <h1>📦 ประวัติการเคลื่อนไหวสต็อก</h1>

            {/* 🔎 ฟิลเตอร์ */}
            <div className="filter-container">
                <input
                    type="text"
                    placeholder="🔍 ค้นหาสินค้า..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>

            {loading ? (
                <p className="loading">⏳ กำลังโหลด...</p>
            ) : filtered.length === 0 ? (
                <p className="no-data">❌ ไม่พบประวัติสต็อก</p>
            ) : (
                <table className="transaction-table">
                    <thead>
                        <tr>
                            <th>วันที่</th>
                            <th>สินค้า</th>
                            <th>บาร์โค้ด</th>
                            <th>ประเภท</th>
                            <th>จำนวน</th>
                            <th>ผู้ดำเนินการ</th>
                            <th>ราคาทุน</th>
                            <th>ราคาขาย</th>
                            <th>ซัพพลายเออร์</th>
                            <th>หมายเหตุ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((t) => (
                            <tr key={t._id}>
                                <td>{new Date(t.createdAt).toLocaleString("th-TH")}</td>
                                <td>{t.productId?.name}</td>
                                <td>{t.productId?.barcode || t.stockId?.barcode || "-"}</td>
                                <td>{getTypeLabel(t.type)}</td>
                                <td>{t.quantity}</td>
                                <td>{t.userId?.username}</td>
                                <td>{t.stockId?.costPrice ? `${t.stockId.costPrice.toLocaleString()} ฿` : "-"}</td>
                                <td>{t.stockId?.salePrice ? `${t.stockId.salePrice.toLocaleString()} ฿` : "-"}</td>
                                <td>{t.stockId?.supplier || "-"}</td>
                                <td>{t.notes || "-"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default StockTransactionPage;
