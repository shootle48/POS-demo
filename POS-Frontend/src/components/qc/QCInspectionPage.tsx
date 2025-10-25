// ✅ QCInspectionPage.tsx
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
    const [rowLoading, setRowLoading] = useState<string | null>(null);

    // ✅ โหลดข้อมูล PO และ QC เดิม
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

    // ✅ ตรวจสอบว่าแถวนี้พร้อมบันทึกไหม
    const canSaveQC = (item: any, qc: any) => {
        const total = item.quantity || 0;
        if (!qc?.status) return false;
        if (qc.status === "ผ่าน" && !qc.expiryDate) return false;
        if (qc.status === "ผ่านบางส่วน" && (!qc.failedQuantity || qc.failedQuantity >= total))
            return false;
        return true;
    };

    // ✅ บันทึก QC แถวเดียว (เพิ่ม UX เช็ค field + animation upload)
    const handleSubmitQC = async (item: any) => {
        const batchNumber = item.batchNumber;
        const qc = qcData[batchNumber] || {};
        const token = localStorage.getItem("token") || "";

        if (!qc.status) {
            setPopupMessage(`⚠️ กรุณาเลือกสถานะของ ${item.productName}`);
            setPopupSuccess(false);
            setShowPopup(true);
            return;
        }

        if (qc.status === "ผ่าน" && !qc.expiryDate) {
            setPopupMessage(`⚠️ กรุณากรอกวันหมดอายุของ ${item.productName}`);
            setPopupSuccess(false);
            setShowPopup(true);
            return;
        }

        const total = item.quantity || 0;
        const failed = Number(qc.failedQuantity) || 0;
        const passed = Math.max(0, total - failed);
        let status = qc.status;

        // ✅ auto fix status
        if (failed === 0) status = "ผ่าน";
        else if (failed === total) status = "ไม่ผ่าน";
        else if (failed > 0 && failed < total) status = "ผ่านบางส่วน";

        // 🎬 เริ่มโหลดเฉพาะแถวนี้
        setRowLoading(batchNumber);

        try {
            const formData = new FormData();
            formData.append("batchNumber", batchNumber);
            formData.append("productId", item.productId?._id || item.productId || "");
            formData.append("supplierId", po.supplierId?._id || po.supplierId || "");
            formData.append("warehouseId", po.location?._id || po.location || "");
            formData.append("totalQuantity", String(total));
            formData.append("failedQuantity", String(failed));
            formData.append("passedQuantity", String(passed));
            formData.append("status", status);
            formData.append("remarks", qc.remarks || "");
            if (qc.expiryDate) formData.append("expiryDate", qc.expiryDate);

            // ✅ แนบไฟล์
            (files[batchNumber] || []).forEach((file) => {
                if (file instanceof File) formData.append("attachments", file);
            });

            const res = await createQCRecord(formData, token);

            if (res.success) {
                // 🟢 ใช้ข้อความจาก backend จริง
                setPopupMessage(res.message || `✅ บันทึกผล QC สำเร็จ (${item.productName})`);
                setPopupSuccess(true);
                setShowPopup(true);
            } else {
                // 🔴 แสดงข้อความจริงจาก backend
                setPopupMessage(res.message || "❌ ไม่สามารถบันทึก QC ได้");
                setPopupSuccess(false);
                setShowPopup(true);
            }
        } catch (error: any) {
            console.error("❌ handleSubmitQC Error:", error);
            const backendMessage =
                error?.response?.data?.message || "⚠️ เกิดข้อผิดพลาดในการบันทึก";
            setPopupMessage(backendMessage);
            setPopupSuccess(false);
            setShowPopup(true);
        } finally {
            // ✅ ปิดโหลดเฉพาะแถวนี้
            setRowLoading(null);
        }
    };


    // ✅ สรุป QC ทั้งใบ
    const handleSubmitFinalQC = async () => {
        const token = localStorage.getItem("token") || "";
        setSaving(true); // 🔒 disable ปุ่มทันที

        try {
            if (!po?.items?.length) return;

            // ✅ ตรวจว่าสินค้าผ่านแต่ยังไม่ใส่วันหมดอายุ
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

            // ✅ เรียก backend เพื่อสรุป QC
            const res = await updateQCStatus(poId!, { qcStatus: "ผ่าน" }, token);

            if (res.success) {
                // 🟢 ใช้ข้อความจาก backend จริง
                setPopupMessage(res.message || "✅ สรุป QC สำเร็จ!");
                setPopupSuccess(true);
                setShowPopup(true);

                // 🔒 ล็อกปุ่มไว้จนกว่าจะปิด popup
                setPopupLocked(true);

                // ✅ โหลดข้อมูลใหม่ (อัปเดตสถานะล่าสุด)
                const updatedPO = await getPurchaseOrderById(poId!, token);
                setPo(updatedPO.data);

                // ✅ Redirect หลัง popup ปิด
                setTimeout(() => {
                    setPopupLocked(false);
                    navigate("/purchase-orders");
                }, 1500);
            } else {
                // 🔴 ใช้ข้อความจาก backend จริง
                setPopupMessage(res.message || "❌ ไม่สามารถสรุป QC ได้");
                setPopupSuccess(false);
                setShowPopup(true);
            }
        } catch (error: any) {
            console.error("❌ handleSubmitFinalQC Error:", error);
            const backendMessage =
                error?.response?.data?.message || "⚠️ เกิดข้อผิดพลาดในการสรุป QC";
            setPopupMessage(backendMessage);
            setPopupSuccess(false);
            setShowPopup(true);
        } finally {
            // ❌ อย่าปลดล็อกทันที ให้ปลดตอน popup ปิดแทน
            // setSaving(false);
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
                    rowLoading={rowLoading} // ✅ เพิ่ม prop นี้
                />

                {/* ✅ ปุ่มสรุป QC */}
                <div className="qc-finalize-section">
                    <button
                        className={`qc-submit-btn ${saving || isFinalized || popupLocked ? "disabled" : "active"
                            }`}
                        disabled={saving || isFinalized || popupLocked}
                        onClick={handleSubmitFinalQC}
                    >
                        {saving ? (
                            <>
                                <span className="qc-spinner" /> กำลังสรุปผล...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faCheck} /> สรุปผลการตรวจสอบสินค้า
                            </>
                        )}
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
