import React, { useState } from "react";
import StockLotTable from "./StockLotTable";
import StockLotModal from "./StockLotModal";

interface Props {
    data: any;
    currentPage?: number;
    itemsPerPage?: number;
}

const StockLotByProduct: React.FC<Props> = ({
    data,
    currentPage = 1,
    itemsPerPage = 10,
}) => {
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    const refreshData = async () => {
        console.log("🔄 Refreshing stock lot data...");
    };

    const lotsArray = Array.isArray(data.lots) ? data.lots : data.lots?.data || [];
    const stocksArray = Array.isArray(data.stocks) ? data.stocks : data.stocks?.data || [];

    // ✅ Normalize stock data
    const normalizedStocks = stocksArray.map((p: any) => ({
        _id: p._id,
        name: p.productId?.name || p.name || "ไม่ระบุชื่อสินค้า",
        barcode: p.productId?.barcode || p.barcode || "-",
        supplier: p.supplierId?.companyName || p.supplier || "-",
        warehouse: p.location?.name || "-",
        threshold: p.threshold || 0,
        totalQuantity: p.totalQuantity || 0,
        status: p.status || "",
        costPrice: p.costPrice || 0,
        salePrice: p.salePrice || 0,
        lots: [],
    }));

    // ✅ รวม remainingQty ของแต่ละ product
    const productGroups = normalizedStocks.map((p: any) => {
        const relatedLots = lotsArray.filter((lot: any) => lot.barcode === p.barcode);
        const totalRemainingQty = relatedLots.reduce(
            (sum: number, lot: any) => sum + (Number(lot.remainingQty) || 0),
            0
        );

        return {
            ...p,
            lotCount: relatedLots.length,
            lots: relatedLots,
            totalRemainingQty, // ✅ รวมจาก remainingQty ของทุกล็อต
        };
    });

    const startIndex = (currentPage - 1) * itemsPerPage;

    return (
        <div className="stocklot-section">
            <h2 className="section-title">สินค้าทั้งหมด</h2>
            <div className="table-scroll-container">
                <StockLotTable
                    headers={[
                        "ลำดับ",
                        "ชื่อสินค้า",
                        "Barcode",
                        "คลังสินค้า",
                        "จำนวนคงเหลือ (จากล็อต)",
                        "จำนวนล็อต",
                        "การจัดการ",
                    ]}
                    data={productGroups.map((p: any, index: number) => [
                        startIndex + index + 1,
                        p.name,
                        p.barcode,
                        p.warehouse,
                        `${p.totalRemainingQty} ชิ้น`, // ✅ ใช้ค่าจริงจาก remainingQty รวม
                        p.lotCount,
                        <button className="table-btn" onClick={() => setSelectedProduct(p)}>
                            ดูล็อต
                        </button>,
                    ])}
                />
            </div>

            {selectedProduct && (
                <StockLotModal
                    product={selectedProduct}
                    lots={selectedProduct.lots}
                    onClose={() => setSelectedProduct(null)}
                    refreshData={refreshData}
                />
            )}
        </div>
    );
};

export default StockLotByProduct;
