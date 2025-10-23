import React from "react";

interface SupplierSelectorProps {
    suppliers: any[];
    supplierId: string;
    setSupplierId: (id: string) => void;
    setSupplierCompany: (name: string) => void;
    fetchProductsBySupplier: (id: string) => void;
}

const SupplierSelector: React.FC<SupplierSelectorProps> = ({
    suppliers,
    supplierId,
    setSupplierId,
    setSupplierCompany,
    fetchProductsBySupplier,
}) => (
    <div className="form-group-suppliers">
        <label>เลือก Supplier:</label>
        <select
            value={supplierId}
            onChange={(e) => {
                const id = e.target.value;
                const selected = suppliers.find((s) => s._id === id);
                setSupplierId(id);
                setSupplierCompany(selected?.companyName || "");
                if (id) fetchProductsBySupplier(id);
            }}
        >
            <option value="">-- เลือก Supplier --</option>
            {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                    {s.companyName}
                </option>
            ))}
        </select>
    </div>
);

export default SupplierSelector;
