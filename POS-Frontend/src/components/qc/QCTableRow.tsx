import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faUpload, faCalendarAlt } from "@fortawesome/free-solid-svg-icons";

interface QCTableRowProps {
    item: any;
    qc: any;
    disabled: boolean;
    files: Record<string, File[]>;
    setFiles: React.Dispatch<React.SetStateAction<Record<string, File[]>>>;
    qcData: Record<string, any>;
    setQcData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    saving: boolean;
    isFinalized: boolean;
    handleSubmitQC: (item: any) => Promise<void>;
}

const QCTableRow: React.FC<QCTableRowProps> = ({
    item,
    qc,
    disabled,
    files,
    setFiles,
    qcData,
    setQcData,
    saving,
    isFinalized,
    handleSubmitQC,
}) => {
    const batchNumber = item.batchNumber;

    const normalizedQC = {
        ...qc,
        status: qc.status || "รอตรวจสอบ",
        remarks: qc.remarks || "",
        expiryDate: qc.expiryDate || item.expiryDate || "",
        failedQuantity: qc.failedQuantity ?? 0,
    };

    const handleChangeStatus = (status: string) => {
        setQcData((prev) => ({
            ...prev,
            [batchNumber]: { ...prev[batchNumber], status },
        }));
    };

    const handleChangeRemarks = (remarks: string) => {
        setQcData((prev) => ({
            ...prev,
            [batchNumber]: { ...prev[batchNumber], remarks },
        }));
    };

    const handleChangeExpiry = (date: string) => {
        setQcData((prev) => ({
            ...prev,
            [batchNumber]: { ...prev[batchNumber], expiryDate: date },
        }));
    };

    const handleChangeFailed = (value: string) => {
        const val = Math.max(0, Math.min(Number(value), item.quantity));
        setQcData((prev) => ({
            ...prev,
            [batchNumber]: { ...prev[batchNumber], failedQuantity: val },
        }));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFiles((prev) => ({
            ...prev,
            [batchNumber]: Array.from(e.target.files || []),
        }));
    };

    const isSaveDisabled =
        disabled || isFinalized || saving || normalizedQC.status === "รอตรวจสอบ";

    return (
        <tr className={disabled ? "qc-row-disabled" : ""}>
            <td>{item.productName}</td>
            <td>{batchNumber}</td>

            {/* ✅ วันหมดอายุ */}
            <td>
                <div className="qc-expiry-field">
                    <FontAwesomeIcon icon={faCalendarAlt} className="qc-expiry-icon" />
                    <input
                        type="date"
                        disabled={disabled || isFinalized}
                        value={normalizedQC.expiryDate}
                        onChange={(e) => handleChangeExpiry(e.target.value)}
                        className="qc-expiry-input"
                    />
                </div>
            </td>

            {/* ✅ สถานะ QC */}
            <td>
                <select
                    disabled={disabled || isFinalized}
                    value={normalizedQC.status}
                    onChange={(e) => handleChangeStatus(e.target.value)}
                >
                    <option value="รอตรวจสอบ">รอตรวจสอบ</option>
                    <option value="ผ่าน">ผ่าน</option>
                    <option value="ผ่านบางส่วน">ผ่านบางส่วน</option>
                    <option value="ไม่ผ่าน">ไม่ผ่าน</option>
                </select>
            </td>

            {/* ✅ จำนวนทั้งหมด */}
            <td>
                <span className="qc-total-text">{item.quantity}</span>
            </td>

            {/* ✅ จำนวนไม่ผ่าน */}
            <td>
                <input
                    type="number"
                    min={0}
                    max={item.quantity}
                    disabled={disabled || isFinalized}
                    value={normalizedQC.failedQuantity}
                    onChange={(e) => handleChangeFailed(e.target.value)}
                    className="qc-failed-input"
                />
            </td>

            {/* ✅ หมายเหตุ */}
            <td>
                <input
                    type="text"
                    disabled={disabled || isFinalized}
                    placeholder="หมายเหตุ..."
                    value={normalizedQC.remarks}
                    onChange={(e) => handleChangeRemarks(e.target.value)}
                />
            </td>

            {/* ✅ แนบรูป */}
            <td>
                <label
                    className={`qc-upload-label ${disabled || isFinalized ? "disabled" : ""}`}
                >
                    <FontAwesomeIcon icon={faUpload} /> เลือกรูป
                    <input
                        type="file"
                        multiple
                        hidden
                        disabled={disabled || isFinalized}
                        onChange={handleFileUpload}
                    />
                </label>
                {files[batchNumber]?.length > 0 && (
                    <p className="qc-file-count">📎 {files[batchNumber].length} ไฟล์</p>
                )}
            </td>

            {/* ✅ ปุ่มบันทึก */}
            <td>
                <button
                    className={`qc-save-btn ${isSaveDisabled ? "disabled" : ""}`}
                    disabled={isSaveDisabled}
                    onClick={() => handleSubmitQC(item)}
                >
                    <FontAwesomeIcon icon={faCheck} />{" "}
                    {normalizedQC._id && normalizedQC.status !== "รอตรวจสอบ"
                        ? "บันทึกแล้ว"
                        : "บันทึก"}
                </button>
            </td>
        </tr>
    );
};

export default QCTableRow;
