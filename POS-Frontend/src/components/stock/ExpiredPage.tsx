import React, { useState, useEffect } from "react";
import { getStockData } from "../../api/stock/stock";
import "../../styles/stock/ExpiredPage.css";

interface Lot {
    _id: string;
    batchNumber?: string;
    expiryDate?: string;
    quantity: number;
    qcStatus?: string;
    isActive?: boolean;
    isClosed?: boolean;
}

interface StockItem {
    _id: string;
    barcode: string;
    totalQuantity: number;
    threshold: number;
    status: string;
    expiryStatus: string;
    updatedAt: string;
    productId: {
        _id: string;
        name: string;
        imageUrl?: string;
        category?: { _id: string; name: string };
    };
    supplierId?: { _id: string; companyName: string };
    location?: { _id: string; name: string; location: string };
    expiryDate?: string;
    lots?: Lot[];
}

const ExpiredPage: React.FC = () => {
    const [stockData, setStockData] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>("");

    const [expanded, setExpanded] = useState<string | null>(null); // ✅ กางดู lots
    const [itemsPerPage, setItemsPerPage] = useState<number>(10);
    const [currentPage, setCurrentPage] = useState<number>(1);

    const fetchData = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            setError("❌ No token found");
            setLoading(false);
            return;
        }
        try {
            const data = await getStockData(token);
            setStockData(data);
        } catch (err) {
            console.error("❌ Fetch data error:", err);
            setError("ไม่สามารถโหลดข้อมูลสินค้าได้");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // ✅ filter เฉพาะสินค้าที่หมดอายุหรือใกล้หมดอายุ
    const filteredStock = stockData.filter((item) => {
        const statuses = [
            "หมดอายุทั้งหมด",
            "หมดอายุบางล็อต",
            "ใกล้หมดอายุทั้งหมด",
            "ใกล้หมดอายุบางล็อต",
        ];
        const matchStatus = statuses.includes(item.expiryStatus);
        const searchText = searchQuery.toLowerCase();
        const matchSearch =
            item.productId?.name?.toLowerCase().includes(searchText) ||
            item.supplierId?.companyName?.toLowerCase().includes(searchText) ||
            item.barcode?.toLowerCase().includes(searchText);

        return matchStatus && matchSearch;
    });

    // ✅ pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedStock = filteredStock.slice(startIndex, startIndex + itemsPerPage);
    const totalPages = Math.ceil(filteredStock.length / itemsPerPage);

    const formatThaiDate = (d?: string) =>
        d
            ? new Date(d).toLocaleDateString("th-TH", {
                year: "numeric",
                month: "short",
                day: "numeric",
            })
            : "-";

    const toggleExpand = (id: string) =>
        setExpanded(expanded === id ? null : id);

    const getRowClass = (status: string) => {
        if (status.includes("หมดอายุทั้งหมด")) return "expired-row";
        if (status.includes("หมดอายุบางล็อต")) return "partial-expired-row";
        if (status.includes("ใกล้หมดอายุทั้งหมด")) return "near-all-row";
        if (status.includes("ใกล้หมดอายุบางล็อต")) return "near-partial-row";
        return "";
    };

    return (
        <div className="display">
            <div className="expired-container">
                <div className="expired-header-wrapper">
                    <h2 className="expired-header">🧨 รายการสินค้าหมดอายุ / ใกล้หมดอายุ</h2>
                    {loading && <p className="expired-loading">⏳ Loading...</p>}
                    {error && <p className="expired-error">{error}</p>}

                    <div className="expired-controls">
                        <div className="expired-search-container">
                            <input
                                type="text"
                                placeholder="🔍 ค้นหาสินค้า..."
                                className="expired-search-input"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>

                        <div className="expired-items-per-page">
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

                {/* ✅ Table */}
                <div className="expired-table-wrapper">
                    <table className="expired-table">
                        <thead>
                            <tr>
                                <th>รูป</th>
                                <th>สินค้า</th>
                                <th>บาร์โค้ด</th>
                                <th>ซัพพลายเออร์</th>
                                <th>จำนวนรวม</th>
                                <th>วันหมดอายุใกล้สุด</th>
                                <th>สถานะวันหมดอายุ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedStock.map((item) => (
                                <React.Fragment key={item._id}>
                                    <tr
                                        className={getRowClass(item.expiryStatus)}
                                        onClick={() => toggleExpand(item._id)}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <td>
                                            {item.productId?.imageUrl ? (
                                                <img
                                                    src={item.productId.imageUrl}
                                                    alt={item.productId.name}
                                                    className="expired-img"
                                                />
                                            ) : (
                                                "-"
                                            )}
                                        </td>
                                        <td>{item.productId?.name}</td>
                                        <td>{item.barcode}</td>
                                        <td>{item.supplierId?.companyName || "-"}</td>
                                        <td>{item.totalQuantity}</td>
                                        <td>{formatThaiDate(item.expiryDate)}</td>
                                        <td>{item.expiryStatus}</td>
                                    </tr>

                                    {/* ✅ Expand row — แสดงล็อตทั้งหมด */}
                                    {expanded === item._id && (
                                        <tr className="expanded-lots-row">
                                            <td colSpan={7}>
                                                <div className="lots-container">
                                                    <table className="lots-table">
                                                        <thead>
                                                            <tr>
                                                                <th>ล็อต</th>
                                                                <th>วันหมดอายุ</th>
                                                                <th>จำนวน</th>
                                                                <th>QC</th>
                                                                <th>สถานะ</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {item.lots && item.lots.length > 0 ? (
                                                                item.lots.map((lot) => {
                                                                    const exp = lot.expiryDate
                                                                        ? new Date(lot.expiryDate)
                                                                        : null;
                                                                    const isExpired =
                                                                        exp !== null && exp < new Date();
                                                                    const diffDays =
                                                                        exp !== null
                                                                            ? Math.ceil(
                                                                                (exp.getTime() - Date.now()) /
                                                                                (1000 * 60 * 60 * 24)
                                                                            )
                                                                            : null;
                                                                    const isNear =
                                                                        diffDays !== null && diffDays >= 0 && diffDays <= 10;

                                                                    return (
                                                                        <tr
                                                                            key={lot._id}
                                                                            className={
                                                                                isExpired
                                                                                    ? "expired-lot"
                                                                                    : isNear
                                                                                        ? "near-expired-lot"
                                                                                        : ""
                                                                            }
                                                                        >
                                                                            <td>{lot.batchNumber || "-"}</td>
                                                                            <td>{formatThaiDate(lot.expiryDate)}</td>
                                                                            <td>{lot.quantity}</td>
                                                                            <td>{lot.qcStatus || "-"}</td>
                                                                            <td>
                                                                                {isExpired
                                                                                    ? "หมดอายุ"
                                                                                    : isNear
                                                                                        ? "ใกล้หมดอายุ"
                                                                                        : "ปกติ"}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })
                                                            ) : (
                                                                <tr>
                                                                    <td colSpan={5} style={{ textAlign: "center" }}>
                                                                        ไม่มีข้อมูลล็อต
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}

                            {paginatedStock.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: "center", padding: "20px" }}>
                                        ✅ ไม่มีสินค้าที่หมดอายุหรือใกล้หมดอายุ
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="expired-pagination">
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        ◀ ก่อนหน้า
                    </button>
                    <span>
                        หน้า {currentPage} จาก {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                    >
                        ถัดไป ▶
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExpiredPage;
