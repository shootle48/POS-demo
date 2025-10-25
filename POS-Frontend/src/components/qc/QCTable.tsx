// ✅ QCTable.tsx
import React from "react";
import QCTableRow from "./QCTableRow";

interface QCTableProps {
    po: any;
    qcData: Record<string, any>;
    setQcData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    files: Record<string, File[]>;
    setFiles: React.Dispatch<React.SetStateAction<Record<string, File[]>>>;
    saving: boolean;
    isFinalized: boolean;
    handleSubmitQC: (item: any) => Promise<void>;
    rowLoading?: string | null; // ✅ เพิ่มบรรทัดนี้
}

const QCTable: React.FC<QCTableProps> = ({
    po,
    qcData,
    setQcData,
    files,
    setFiles,
    saving,
    isFinalized,
    handleSubmitQC,
    rowLoading, // ✅ รับ prop เข้ามา
}) => {
    return (
        <table className="qc-table">
            <thead>
                <tr>
                    <th>สินค้า</th>
                    <th>ล็อต</th>
                    <th>วันหมดอายุ</th>
                    <th>สถานะ QC</th>
                    <th>จำนวนทั้งหมด</th>
                    <th>จำนวนไม่ผ่าน</th>
                    <th>หมายเหตุ</th>
                    <th>แนบรูป</th>
                    <th>บันทึก</th>
                </tr>
            </thead>
            <tbody>
                {po.items.map((item: any) => (
                    <QCTableRow
                        key={item.batchNumber}
                        item={item}
                        qc={qcData[item.batchNumber] || {}}
                        disabled={saving}
                        files={files}
                        setFiles={setFiles}
                        qcData={qcData}
                        setQcData={setQcData}
                        saving={saving}
                        isFinalized={isFinalized}
                        handleSubmitQC={handleSubmitQC}
                        rowLoading={rowLoading} // ✅ ส่งต่อให้แถว
                    />
                ))}
            </tbody>
        </table>
    );
};

export default QCTable;
