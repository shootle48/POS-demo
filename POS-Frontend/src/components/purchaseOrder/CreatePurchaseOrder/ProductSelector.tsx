import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

interface ProductSelectorProps {
    products: any[];
    productId: string;
    setProductId: (id: string) => void;
    quantity: number;
    setQuantity: (qty: number) => void;
    costPrice: number;
    setCostPrice: (price: number) => void;
    salePrice: number;
    setSalePrice: (price: number) => void;
    warehouseName: string;
    warehouseCode: string;
    fetchWarehouseByProduct: (id: string) => void;
    handleAddItem: () => void;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({
    products,
    productId,
    setProductId,
    quantity,
    setQuantity,
    costPrice,
    setCostPrice,
    salePrice,
    setSalePrice,
    warehouseName,
    warehouseCode,
    fetchWarehouseByProduct,
    handleAddItem,
}) => (
    <>
        <div className="form-group-suppliers">
            <label>เลือกสินค้า:</label>
            <select
                value={productId}
                onChange={(e) => {
                    const id = e.target.value;
                    const selected = products.find((p) => p._id === id);
                    if (selected) {
                        setProductId(selected._id);
                        setCostPrice(selected.costPrice);
                        setSalePrice(selected.salePrice);
                        fetchWarehouseByProduct(selected._id);
                    }
                }}
            >
                <option value="">-- เลือกสินค้า --</option>
                {products.length > 0 ? (
                    products.map((p) => (
                        <option key={p._id} value={p._id}>
                            {p.name} ({p.barcode}) - คงเหลือ {p.totalQuantity} ชิ้น
                        </option>
                    ))
                ) : (
                    <option disabled>ไม่มีสินค้า</option>
                )}
            </select>
        </div>

        {productId && (
            <>
                <div className="form-inline-suppliers">
                    <div className="form-inline-item">
                        <label>จำนวน:</label>
                        <input
                            type="number"
                            value={quantity}
                            min={1}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                        />
                    </div>

                    <div className="form-inline-item">
                        <label>ราคาทุน (บาท):</label>
                        <input
                            type="number"
                            value={costPrice}
                            onChange={(e) => setCostPrice(Number(e.target.value))}
                        />
                    </div>

                    <div className="form-inline-item">
                        <button className="add-item-btn" onClick={handleAddItem}>
                            <FontAwesomeIcon icon={faPlus} /> เพิ่มสินค้า
                        </button>
                    </div>
                </div>

                {warehouseName && (
                    <div className="warehouse-display">
                        <p style={{ marginTop: "10px", color: "#007bff" }}>
                            📦 คลังสินค้าปัจจุบัน:{" "}
                            <strong>{warehouseName}</strong> ({warehouseCode})
                        </p>
                    </div>
                )}
            </>
        )}
    </>
);

export default ProductSelector;
