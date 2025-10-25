import React from "react";

interface Props {
    stockData: any;
    suppliers: any[];
    warehouses: any[];
    handleInputChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => void;
    handleUnitChange: (
        index: number,
        field: "name" | "totalQuantity",
        value: any
    ) => void;
    addUnit: () => void;
    removeUnit: (index: number) => void;
    setShowWarehouseModal: (open: boolean) => void;
}
interface Unit {
    name: string;
    totalQuantity: number;
}

const StockFormSection: React.FC<Props> = ({
    stockData,
    suppliers,
    warehouses,
    handleInputChange,
    handleUnitChange,
    addUnit,
    removeUnit,
    setShowWarehouseModal,
}) => {
    return (
        <div className="add-product-form-column">
            <h3>สต็อกสินค้า</h3>

            {/* จำนวน */}
            <div className="add-product-form-group">
                <label className="add-product-form-label">จำนวน:</label>
                <input
                    type="number"
                    name="totalQuantity"
                    value={stockData.totalQuantity}
                    onChange={handleInputChange}
                    className="add-product-form-input"
                    min="0"
                    required
                />
            </div>

            {/* ราคาทุน */}
            <div className="add-product-form-group">
                <label className="add-product-form-label">ราคาทุน:</label>
                <input
                    type="number"
                    name="costPrice"
                    value={stockData.costPrice}
                    onChange={handleInputChange}
                    className="add-product-form-input"
                    min="0"
                />
            </div>

            {/* ราคาขาย */}
            <div className="add-product-form-group">
                <label className="add-product-form-label">ราคาขาย:</label>
                <input
                    type="number"
                    name="salePrice"
                    value={stockData.salePrice}
                    onChange={handleInputChange}
                    className="add-product-form-input"
                    min="0"
                />
            </div>

            {/* หน่วยสินค้า */}
            <div className="add-product-form-group">
                <label className="add-product-form-label">หน่วยสินค้า:</label>

                {stockData.units?.map((u: Unit, index: number) => (
                    <div key={index} className="unit-row">
                        {/* 🧩 เปลี่ยนจาก input → select */}
                        <select
                            value={u.name}
                            onChange={(e) => handleUnitChange(index, "name", e.target.value)}
                            className="add-product-form-input small"
                        >
                            <option value="">-- เลือกหน่วย --</option>
                            <option value="ชิ้น">ชิ้น</option>
                            <option value="ตัว">ตัว</option>
                            <option value="คู่">คู่</option>
                            <option value="เครื่อง">เครื่อง</option>
                            <option value="กล่อง">กล่อง</option>
                            <option value="แพ็ค">แพ็ค</option>
                            <option value="ลัง">ลัง</option>
                            <option value="เซ็ต">เซ็ต</option>
                        </select>

                        {/* จำนวนต่อหน่วย */}
                        <input
                            type="number"
                            placeholder="จำนวน"
                            value={u.totalQuantity}
                            onChange={(e) =>
                                handleUnitChange(index, "totalQuantity", Number(e.target.value))
                            }
                            className="add-product-form-input small"
                            min="1"
                        />

                        <button
                            type="button"
                            onClick={() => removeUnit(index)}
                            className="remove-unit-btn"
                        >
                            ✖
                        </button>
                    </div>
                ))}

                {/* 🚫 แสดงปุ่มเพิ่มเฉพาะเมื่อยังไม่มีหน่วย */}
                {(!stockData.units || stockData.units.length === 0) && (
                    <button type="button" onClick={addUnit} className="add-unit-btn">
                        เพิ่มหน่วย
                    </button>
                )}
            </div>

            {/* Supplier */}
            <div className="add-product-form-group">
                <label className="add-product-form-label">ผู้จำหน่าย:</label>
                <select
                    name="supplierId"
                    value={stockData.supplierId}
                    onChange={handleInputChange}
                    className="add-product-form-input"
                    required
                >
                    <option value="">-- เลือกผู้จำหน่าย --</option>
                    {suppliers.map((s) => (
                        <option key={s._id} value={s._id}>
                            {s.companyName}
                        </option>
                    ))}
                </select>
            </div>

            {/* Warehouse */}
            <div className="add-product-form-group">
                <label className="add-product-form-label">คลังจัดเก็บ:</label>
                <select
                    name="location"
                    value={stockData.location}
                    onChange={(e) => {
                        if (e.target.value === "custom") setShowWarehouseModal(true);
                        else handleInputChange(e);
                    }}
                    className="add-product-form-input"
                    required
                >
                    <option value="">-- เลือกคลัง --</option>
                    {warehouses.map((w) => (
                        <option key={w._id} value={w.name}>
                            {w.name}
                        </option>
                    ))}
                    <option value="custom">➕ เพิ่มคลังใหม่</option>
                </select>
            </div>

            {/* Expiry Date & Notes */}
            <div className="add-product-form-group">
                <label className="add-product-form-label">วันหมดอายุ:</label>
                <input
                    type="date"
                    name="expiryDate"
                    value={stockData.expiryDate}
                    onChange={handleInputChange}
                    className="add-product-form-input"
                />
            </div>

            <div className="add-product-form-group">
                <label className="add-product-form-label">บันทึกเพิ่มเติม:</label>
                <textarea
                    name="notes"
                    value={stockData.notes}
                    onChange={handleInputChange}
                    className="add-product-form-input"
                    rows={3}
                />
            </div>
        </div>
    );
};

export default StockFormSection;
