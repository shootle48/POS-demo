import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faExclamationCircle, faQuestionCircle } from "@fortawesome/free-solid-svg-icons";

interface PopupProps {
    type: "success" | "error" | "confirm";
    message: string;
    onClose: () => void;
    onConfirm?: () => void; // ใช้ตอน type = confirm
}

const PurchaseOrderPopup: React.FC<PopupProps> = ({ type, message, onClose, onConfirm }) => {
    return (
        <div className={`po-popup-overlay ${type}`}>
            <div className="po-popup-box">
                <FontAwesomeIcon
                    icon={
                        type === "success"
                            ? faCheckCircle
                            : type === "error"
                                ? faExclamationCircle
                                : faQuestionCircle
                    }
                    className={`po-popup-icon ${type}`}
                />

                <p className="po-popup-message">{message}</p>

                {type === "confirm" ? (
                    <div className="po-popup-actions">
                        <button className="po-popup-confirm" onClick={onConfirm}>
                            ยืนยัน
                        </button>
                        <button className="po-popup-cancel" onClick={onClose}>
                            ยกเลิก
                        </button>
                    </div>
                ) : (
                    <button className="po-popup-close" onClick={onClose}>
                        ปิด
                    </button>
                )}
            </div>
        </div>
    );
};

export default PurchaseOrderPopup;
