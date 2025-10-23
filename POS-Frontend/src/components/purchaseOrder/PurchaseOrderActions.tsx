import React, { useState, useMemo,useEffect } from "react";
import {
    confirmPurchaseOrder,
    cancelPurchaseOrder,
    returnPurchaseOrder,
} from "../../api/purchaseOrder/purchaseOrderApi";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faVial, faPrint, faUndoAlt } from "@fortawesome/free-solid-svg-icons";
import PurchaseOrderPrintModal from "./PurchaseOrderPrintModal";

interface Props {
    po: any;
    navigate: any;
    setPopup: (popup: any) => void;
    onActionComplete: () => void;
}

const PurchaseOrderActions: React.FC<Props> = ({
    po,
    navigate,
    setPopup,
    onActionComplete,
}) => {
    const [loading, setLoading] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);

    const openConfirmPopup = (message: string, onConfirm: () => void) => {
        setPopup({ type: "confirm", message, onConfirm });
    };

    // ✅ ตรวจสอบสถานะที่สามารถพิมพ์ได้
    const canPrint =
        po.status === "รอดำเนินการ" ||
        po.status === "รอตรวจสอบ QC" ||
        po.status === "รอตรวจรับสินค้า" ||
        (po.status === "ได้รับสินค้าแล้ว" && po.qcStatus === "ผ่าน");

    // ✅ ฟังก์ชันยืนยันรับสินค้า
    const handleConfirm = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token") || "";
            const res = await confirmPurchaseOrder(po._id, token);
            if (res.success) {
                setPopup({
                    type: "success",
                    message: "✅ ยืนยันรับสินค้าเรียบร้อยแล้ว",
                    onConfirm: () => navigate(`/qc/${po._id}`),
                });
                onActionComplete();
            }
        } finally {
            setLoading(false);
        }
    };

    // ✅ ฟังก์ชันคืนสินค้า
    const handleReturn = async () => {
        const token = localStorage.getItem("token") || "";
        const res = await returnPurchaseOrder(po._id, token);
        setPopup({ type: res.success ? "success" : "error", message: res.message });
        onActionComplete();
    };

    // ✅ ฟังก์ชันยกเลิก PO
    const handleCancel = async () => {
        const token = localStorage.getItem("token") || "";
        const res = await cancelPurchaseOrder(po._id, token);
        setPopup({ type: res.success ? "success" : "error", message: res.message });
        onActionComplete();
    };

    /* ======================================================
       🔍 ตรวจสอบสถานะ QC จาก stockLots โดยตรง
    ====================================================== */
    const qcStatusSummary = useMemo(() => {
        if (!po.stockLots || po.stockLots.length === 0)
            return { hasPass: false, hasFail: false, hasPending: false };

        let hasPass = false;
        let hasFail = false;
        let hasPending = false;

        po.stockLots.forEach((lot: any) => {
            const status = lot.qcStatus || "รอตรวจสอบ";
            if (status === "ผ่าน") hasPass = true;
            else if (status.includes("ไม่ผ่าน") || status === "ผ่านบางส่วน") hasFail = true;
            else hasPending = true;
        });

        return { hasPass, hasFail, hasPending };
    }, [po.stockLots]);

    /* ======================================================
   ✅ เงื่อนไขการแสดงปุ่ม
====================================================== */
    const showReturnButton =
        qcStatusSummary.hasFail && // ✅ ต้องมีสินค้าที่ไม่ผ่าน
        !["ไม่ผ่าน QC - คืนสินค้าแล้ว","ไม่ผ่าน QC - คืนสินค้าบางส่วนแล้ว"].includes(po.status); // ❌ ห้ามเป็นคืนทั้งหมดแล้ว

    const showGoToQCButton =
        qcStatusSummary.hasPending ||
        (!qcStatusSummary.hasFail && !qcStatusSummary.hasPending);

    const allPassed =
        qcStatusSummary.hasPass &&
        !qcStatusSummary.hasFail &&
        !qcStatusSummary.hasPending;


    return (
        <div className="po-actions">
            {/* ---------- สถานะ: รอดำเนินการ ---------- */}
            {po.status === "รอดำเนินการ" && (
                <>
                    <button
                        className="po-confirm-button"
                        onClick={handleConfirm}
                        disabled={loading}
                    >
                        ยืนยันรับสินค้า
                    </button>
                    <button
                        className="po-cancel-button"
                        onClick={() =>
                            openConfirmPopup("ยกเลิกใบสั่งซื้อนี้หรือไม่?", handleCancel)
                        }
                    >
                        ยกเลิก
                    </button>
                </>
            )}

            {/* ---------- ถ้ามีสินค้าทั้งผ่านและไม่ผ่าน ---------- */}
            {showReturnButton && (
                <button
                    className="po-return-button"
                    onClick={() =>
                        openConfirmPopup("คืนสินค้า PO นี้หรือไม่?", handleReturn)
                    }
                >
                    <FontAwesomeIcon icon={faUndoAlt} /> คืนสินค้าที่ไม่ผ่าน QC
                </button>
            )}
            {/* ---------- ถ้ายังมีรอตรวจหรือยังไม่ผ่านบางส่วน ---------- */}
            {po.status !== "รอดำเนินการ" &&
                !showReturnButton &&
                showGoToQCButton &&
                !allPassed && (
                    <button
                        className="qc-go-button"
                        onClick={() => navigate(`/qc/${po._id}`)}
                    >
                        <FontAwesomeIcon icon={faVial} />{" "}
                        {po.qcStatus === "ผ่านบางส่วน" || po.qcStatus === "ตรวจบางส่วน"
                            ? "ดำเนินการตรวจ QC ต่อ"
                            : "ไปตรวจ QC"}
                    </button>
                )}

            {/* ---------- ถ้าผ่านหมด ---------- */}
            {allPassed && (
                <p className="qc-complete-text">✅ สินค้าทั้งหมดผ่านการตรวจ QC แล้ว</p>
            )}

            {/* ---------- ปุ่มพิมพ์ใบสั่งซื้อ ---------- */}
            {canPrint && (
                <button className="btn-print" onClick={() => setShowPrintModal(true)}>
                    <FontAwesomeIcon icon={faPrint} /> พิมพ์ใบสั่งซื้อ
                </button>
            )}

            {/* ---------- Modal พิมพ์ใบสั่งซื้อ ---------- */}
            {showPrintModal && (
                <PurchaseOrderPrintModal
                    po={po}
                    onClose={() => setShowPrintModal(false)}
                />
            )}
        </div>
    );
};

export default PurchaseOrderActions;
