import React, { useEffect, useState } from "react";
import "../../styles/stock/StockTransaction.css";
import { getStockTransactions } from "../../api/stock/transactionApi";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { jwtDecode } from "jwt-decode";
import Pagination from "../stock/component/Pagination";
import TransactionTable from "./component/TransactionTable";
import TransactionDetailModal from "./component/TransactionDetailModal";
import GlobalPopup from "../layout/GlobalPopup";

// Interfaces
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
    const [error, setError] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [user, setUser] = useState<{ userId: string; username: string; role: string; email: string } | null>(null);

    // Popup
    const [popupMessage, setPopupMessage] = useState<string>("");
    const [popupSuccess, setPopupSuccess] = useState<boolean>(true);
    const [showPopup, setShowPopup] = useState<boolean>(false);

    // Modal
    const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Decode User
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                setUser({
                    userId: decoded.userId,
                    role: decoded.role,
                    username: decoded.username,
                    email: decoded.email,
                });
            } catch (err) {
                console.error(err);
            }
        }
    }, []);

    // Fetch Transactions
    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) return;
                const res = await getStockTransactions(token);
                if (res.success) {
                    setTransactions(res.data);
                    setFiltered(res.data);
                } else {
                    setError("ไม่สามารถโหลดข้อมูลได้");
                }
            } catch (err) {
                console.error("❌ โหลด Stock Transaction ไม่สำเร็จ", err);
                setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Filter Logic
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
        setCurrentPage(1);
    }, [search, startDate, endDate, transactions]);

    // Pagination
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = filtered.slice(startIndex, startIndex + itemsPerPage);

    // Map type เป็นภาษาไทย
    const getTypeLabel = (type: string) => {
        switch (type) {
            case "SALE": return "ขายสินค้า";
            case "RESTOCK": return "นำเข้าสินค้า";
            case "RETURN": return "รับคืนสินค้า";
            case "ADJUSTMENT": return "ปรับปรุงสต็อก";
            default: return type;
        }
    };

    return (
        <div className="display">
            <div className="stock-container">
                {/* Header */}
                <div className="stock-header-wrapper">
                    <h2 className="stock-header">📊 ประวัติการเคลื่อนไหวสินค้า</h2>
                    {loading && <p className="loadingStock">⏳ Loading...</p>}
                    {error && <p className="error-message">{error}</p>}

                    <div className="stock-controls">
                        <div className="search-container">
                            <input
                                type="text"
                                placeholder="🔍 ค้นหาสินค้า..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="items-per-page">
                            <label>แสดง: </label>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={30}>30</option>
                            </select>
                            <span> รายการต่อหน้า</span>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="stock-table-wrapper">
                <TransactionTable
                    transactions={paginatedData}
                    getTypeLabel={getTypeLabel}
                    handleRowClick={setSelectedTransaction}
                />
                </div>

                {/* Pagination */}
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    setCurrentPage={setCurrentPage}
                />

                <TransactionDetailModal
                    isOpen={!!selectedTransaction}
                    transaction={
                        selectedTransaction
                            ? transactions.find(t => t._id === selectedTransaction) ?? null
                            : null
                    }
                    onClose={() => setSelectedTransaction(null)}
                    onSuccess={(msg, success) => {
                        setShowPopup(true);
                        setPopupSuccess(success ?? true);
                    }}
                />



                <GlobalPopup
                    message={popupMessage}
                    isSuccess={popupSuccess}
                    show={showPopup}
                    setShow={setShowPopup}
                />
            </div>
        </div>
    );
};

export default StockTransactionPage;

