import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCheckCircle,
    faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";

interface PopupMessageProps {
    type: "success" | "error";
    message: string;
    onClose: () => void;
    onConfirmNavigate?: () => void;
}

const PopupMessage: React.FC<PopupMessageProps> = ({
    type,
    message,
    onClose,
    onConfirmNavigate,
}) => (
    <div className={`order-popup ${type}`}>
        <div className="order-popup-content">
            <FontAwesomeIcon
                icon={type === "success" ? faCheckCircle : faExclamationCircle}
                className={type === "success" ? "order-icon" : "order-icon-error"}
            />
            <h3>{message}</h3>
            <button
                className="popup-close-btn"
                onClick={() => {
                    onClose();
                    if (type === "success" && onConfirmNavigate) onConfirmNavigate();
                }}
            >
                ปิด
            </button>
        </div>
    </div>
);

export default PopupMessage;
