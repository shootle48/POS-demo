import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPurchaseOrderById } from "../../api/purchaseOrder/purchaseOrderApi";
import {
    createQCRecord,
    getQCByBatch,
    updateQCStatus,
} from "../../api/purchaseOrder/qcApi";
import "../../styles/qc/QCInspectionPage.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCheck } from "@fortawesome/free-solid-svg-icons";
import GlobalPopup from "../layout/GlobalPopup";
import QCTable from "./QCTable";

const QCInspectionPage: React.FC = () => {
    const { poId } = useParams<{ poId: string }>();
    const navigate = useNavigate();

    const [po, setPo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [qcData, setQcData] = useState<Record<string, any>>({});
    const [files, setFiles] = useState<Record<string, File[]>>({});
    const [saving, setSaving] = useState(false);

    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState("");
    const [popupSuccess, setPopupSuccess] = useState(true);
    const [popupLocked, setPopupLocked] = useState(false);

    // ✅ โหลดข้อมูล PO และ QC ที่บันทึกไว้
    useEffect(() => {
        const loadData = async () => {
            try {
                const token = localStorage.getItem("token") || "";
                const res = await getPurchaseOrderById(poId!, token);
                const poData = res.data;
                setPo(poData);

                const qcPromises = poData.items.map((item: any) =>
                    getQCByBatch(item.batchNumber, token).catch(() => null)
                );
                const qcResults = await Promise.all(qcPromises);

                const qcMap: Record<string, any> = {};
                qcResults.forEach((qcRes, i) => {
                    const batch = poData.items[i].batchNumber;
                    if (qcRes && qcRes.success && qcRes.data.length > 0) {
                        qcMap[batch] = qcRes.data[0];
                    }
                });
                setQcData(qcMap);
            } catch {
                setPopupMessage("❌ โหลดข้อมูล QC ไม่สำเร็จ");
                setPopupSuccess(false);
                setShowPopup(true);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [poId]);

    // ✅ บันทึก QC ต่อแถว
    const handleSubmitQC = async (item: any) => {
        const batchNumber = item.batchNumber;
        const current = qcData[batchNumber] || {};
        const token = localStorage.getItem("token") || "";
        if (!batchNumber) return;

        // ✅ ตรวจสอบวันหมดอายุเมื่อสถานะเป็น "ผ่าน"
        if (current.status === "ผ่าน" && !current.expiryDate) {
            setPopupMessage(`⚠️ กรุณากรอกวันหมดอายุของ ${item.productName} ก่อนบันทึก`);
            setPopupSuccess(false);
            setShowPopup(true);
            return;
        }

        setSaving(true);
        try {
            const formData = new FormData();
            formData.append("batchNumber", batchNumber);
            formData.append("productId", item.productId?._id || item.productId || "");
            formData.append("supplierId", po.supplierId?._id || po.supplierId || "");
            formData.append("warehouseId", po.location?._id || po.location || "");

            // ✅ คำนวณจำนวนผ่าน / ไม่ผ่าน
            const total = item.quantity || 0;
            const failed = Number(current.failedQuantity) || 0;
            const passed = Math.max(0, total - failed);

            formData.append("totalQuantity", String(total));
            formData.append("failedQuantity", String(failed));
            formData.append("passedQuantity", String(passed));

            // ✅ กำหนดสถานะอัตโนมัติ
            let status = current.status || "รอตรวจสอบ";
            if (failed > 0 && failed < total) status = "ผ่านบางส่วน";
            else if (failed === total) status = "ไม่ผ่าน";
            else if (failed === 0) status = "ผ่าน";

            formData.append("status", status);
            formData.append("remarks", current.remarks || "");

            // ✅ เพิ่มวันหมดอายุ (ถ้ามี)
            if (current.expiryDate) {
                formData.append("expiryDate", current.expiryDate);
            } else {
                formData.append("expiryDate", "");
            }

            // ✅ แนบไฟล์แนบ (attachments)
            (files[batchNumber] || []).forEach((file) =>
                formData.append("attachments", file)
            );

            // ✅ เรียก API สร้าง / บันทึก QC
            const res = await createQCRecord(formData, token);

            if (res.success) {
                setPopupMessage(
                    `✅ บันทึกผล QC สำหรับ ${item.productName} สำเร็จ\n` +
                    `(ผ่าน ${passed} | ไม่ผ่าน ${failed} จาก ${total})`
                );
                setPopupSuccess(true);
                setShowPopup(true);
                setPopupLocked(true);

                // ✅ โหลดข้อมูล QC ล่าสุดจาก backend
                const updated = await getQCByBatch(batchNumber, token);
                if (updated.success && updated.data.length > 0) {
                    setQcData((prev) => ({
                        ...prev,
                        [batchNumber]: updated.data[0],
                    }));
                }
            } else {
                setPopupMessage("❌ บันทึก QC ไม่สำเร็จ");
                setPopupSuccess(false);
                setShowPopup(true);
            }
        } catch (error) {
            console.error("❌ handleSubmitQC Error:", error);
            setPopupMessage("⚠️ เกิดข้อผิดพลาดระหว่างบันทึก QC");
            setPopupSuccess(false);
            setShowPopup(true);
        } finally {
            setSaving(false);
        }
    };



    // ✅ สรุป QC ทั้งใบ
    const handleSubmitFinalQC = async () => {
        const token = localStorage.getItem("token") || "";
        setSaving(true);
        try {
            if (!po?.items?.length) return;

            // ✅ ตรวจว่าสินค้าผ่านแต่ยังไม่ใส่วันหมดอายุ (เช็คจาก qcData ที่มี expiryDate จริงจาก backend)
            const missingExpiry: string[] = [];
            po.items.forEach((item: any) => {
                const qc = qcData[item.batchNumber];
                if (qc?.status === "ผ่าน" && (!qc?.expiryDate || qc.expiryDate === null)) {
                    missingExpiry.push(item.productName || qc?.productId?.name || "ไม่ทราบชื่อสินค้า");
                }
            });

            if (missingExpiry.length > 0) {
                setPopupMessage(
                    `⚠️ สินค้าต่อไปนี้ยังไม่ได้กรอกวันหมดอายุ:\n${missingExpiry.join("\n")}`
                );
                setPopupSuccess(false);
                setShowPopup(true);
                setSaving(false);
                return;
            }

            // ✅ นับจำนวนแต่ละสถานะ
            const total = po.items.length;
            let passed = 0;
            let failed = 0;
            let pending = 0;

            po.items.forEach((item: any) => {
                const qc = qcData[item.batchNumber];
                if (!qc || !qc.status || qc.status === "รอตรวจสอบ") pending++;
                else if (qc.status === "ผ่าน") passed++;
                else if (qc.status === "ไม่ผ่าน") failed++;
            });

            if (pending === total) {
                setPopupMessage("⚠️ กรุณาตรวจ QC อย่างน้อยหนึ่งล็อตก่อนสรุป");
                setPopupSuccess(false);
                setShowPopup(true);
                setSaving(false);
                return;
            }

            // ✅ อัปเดตสถานะ QC ของ PO
            const res = await updateQCStatus(poId!, { qcStatus: "ผ่าน" }, token);
            if (res.success) {
                setPopupMessage(
                    `✅ สรุป QC สำเร็จ (${passed} ผ่าน / ${failed} ไม่ผ่าน / ${pending} รอตรวจสอบ)`
                );
                setPopupSuccess(true);
                setShowPopup(true);

                // ✅ โหลดข้อมูล PO ล่าสุด
                const updatedPO = await getPurchaseOrderById(poId!, token);
                setPo(updatedPO.data);

                // ✅ Redirect หลังจาก popup
                setTimeout(() => {
                    navigate("/purchase-orders");
                }, 1500);

            } else {
                setPopupMessage("❌ ไม่สามารถสรุป QC ได้");
                setPopupSuccess(false);
                setShowPopup(true);
            }
        } catch (error) {
            console.error("❌ handleSubmitFinalQC Error:", error);
            setPopupMessage("⚠️ เกิดข้อผิดพลาดในการสรุป QC");
            setPopupSuccess(false);
            setShowPopup(true);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p className="qc-loading">⏳ กำลังโหลดข้อมูล...</p>;
    if (!po) return <p className="qc-error">ไม่พบข้อมูลใบสั่งซื้อ</p>;

    const isFinalized =
        po.qcStatus === "ผ่าน" || po.qcStatus === "ไม่ผ่าน" || po.qcStatus === "สรุปแล้ว";

    return (
        <div className="display">
            <div className="qc-container">
                <div className="qc-header-wrapper">
                    <h1 className="qc-header">🧪 ตรวจสอบคุณภาพสินค้า (QC)</h1>
                    <p className="qc-subtitle">
                        ใบสั่งซื้อ: <strong>{po.purchaseOrderNumber}</strong> / ผู้จัดส่ง:{" "}
                        {po.supplierCompany}
                    </p>
                    <button className="qc-back-btn" onClick={() => navigate("/purchase-orders")}>
                        <FontAwesomeIcon icon={faArrowLeft} /> กลับ
                    </button>
                </div>

                {/* ✅ ตาราง QC */}
                <QCTable
                    po={po}
                    qcData={qcData}
                    setQcData={setQcData}
                    files={files}
                    setFiles={setFiles}
                    saving={saving}
                    isFinalized={isFinalized}
                    handleSubmitQC={handleSubmitQC}
                />

                {/* ✅ ปุ่มสรุป QC */}
                <div className="qc-finalize-section">
                    <button
                        className={`qc-submit-btn ${saving || isFinalized || popupLocked ? "disabled" : "active"
                            }`}
                        disabled={saving || isFinalized || popupLocked}
                        onClick={handleSubmitFinalQC}
                    >
                        <FontAwesomeIcon icon={faCheck} /> สรุปผลการตรวจสอบสินค้า
                    </button>
                </div>

                <GlobalPopup
                    message={popupMessage}
                    isSuccess={popupSuccess}
                    show={showPopup}
                    setShow={(val) => {
                        setShowPopup(val);
                        if (!val) setPopupLocked(false);
                    }}
                />
            </div>
        </div>
    );
};

export default QCInspectionPage;
