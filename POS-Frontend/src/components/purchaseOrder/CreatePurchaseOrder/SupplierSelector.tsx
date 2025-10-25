interface SupplierSelectorProps {
    suppliers: any[];
    supplierId: string;
    setSupplierId: (id: string) => void;
    setSupplierCompany: (name: string) => void;
    fetchProductsBySupplier: (id: string) => void;
    disabled?: boolean; // ✅ เพิ่ม prop
}

const SupplierSelector: React.FC<SupplierSelectorProps> = ({
    suppliers,
    supplierId,
    setSupplierId,
    setSupplierCompany,
    fetchProductsBySupplier,
    disabled = false, // ✅ default false
}) => {
    const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        if (!id) return;
        const selected = suppliers.find((s) => s._id === id);
        if (selected) {
            setSupplierId(selected._id);
            setSupplierCompany(selected.companyName);
            fetchProductsBySupplier(selected._id);
        }
    };

    return (
        <div className="form-group-suppliers">
            <label>เลือก Supplier:</label>
            <select
                value={supplierId}
                onChange={handleSelect}
                disabled={disabled} // ✅ ใช้ prop นี้
            >
                <option value="">-- เลือก Supplier --</option>
                {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                        {s.companyName}
                    </option>
                ))}
            </select>

            {disabled && (
                <p className="supplier-locked-text">🔒 ไม่สามารถเปลี่ยน Supplier ได้หลังจากเพิ่มสินค้าแล้ว</p>
            )}
        </div>
    );
};

export default SupplierSelector;
