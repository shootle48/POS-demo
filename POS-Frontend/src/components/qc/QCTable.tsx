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
}) => {
    return (
        <table className="qc-table">
            <thead>
                <tr>
                    <th>สินค้า</th>
                    <th>Batch</th>
                    <th>วันหมดอายุ</th> {/* ✅ เพิ่มคอลัมน์นี้ */}
                    <th>สถานะ QC</th>
                    <th>หมายเหตุ</th>
                    <th>แนบรูป</th>
                    <th>Action</th>
                </tr>
            </thead>

            <tbody>
                {po.items.map((item: any, idx: number) => {
                    const batchNumber = item.batchNumber;
                    const qc = qcData[batchNumber] || {};
                    const disabled =
                        isFinalized || (qc._id && qc.status !== "รอตรวจสอบ");

                    return (
                        <QCTableRow
                            key={idx}
                            item={item}
                            qc={qc}
                            disabled={disabled}
                            files={files}
                            setFiles={setFiles}
                            qcData={qcData}
                            setQcData={setQcData}
                            saving={saving}
                            isFinalized={isFinalized}
                            handleSubmitQC={handleSubmitQC}
                        />
                    );
                })}
            </tbody>
        </table>
    );
};

export default QCTable;
