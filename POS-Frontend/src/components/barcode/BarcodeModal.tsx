import React, { useEffect, useState } from "react";
import JsBarcode from "jsbarcode";
import BarcodeSettingsModal from "./BarcodeSettingsModal";

interface BarcodeOptions {
    format: string;
    width: number;
    height: number;
    displayValue: boolean;
}

interface StockItem {
    _id: string;
    barcode: string;
    productId: {
        _id: string;
        name: string;
        price?: number;
    };
}

interface BarcodeModalProps {
    item: StockItem | null;
    options: BarcodeOptions;
    onOptionsChange: (options: BarcodeOptions) => void;
    onClose: () => void;
    onSave: () => void;
}

const BarcodeModal: React.FC<BarcodeModalProps> = ({
    item,
    options,
    onOptionsChange,
    onClose,
    onSave,
}) => {
    const [quantity, setQuantity] = useState(1);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        if (item && document.getElementById("barcode-modal-svg")) {
            JsBarcode("#barcode-modal-svg", item.barcode, {
                ...options,
                lineColor: "#0f172a",   // ✅ สีเส้นบาร์โค้ด
                background: "#ffffff", // ✅ พื้นหลัง
                fontSize: 14,
            });
        }
    }, [item, options]);

    const handlePrint = () => {
        if (!item) return;
        const svgElement = document.getElementById("barcode-modal-svg")?.outerHTML;
        if (!svgElement) return;

        const printWindow = window.open("", "_blank");
        if (printWindow) {
            printWindow.document.write(`
                <html>
                  <head><title>Print Barcode</title></head>
                  <body style="font-family:sans-serif; text-align:center;">
                    ${Array(quantity).fill(svgElement).join("<br/>")}
                    <script>window.onload = () => window.print();</script>
                  </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    if (!item) return null;

    return (
        <>
            <div className="barcode-modal-box">
                <div className="barcode-modal-header">
                    <h3>🖨️ พิมพ์บาร์โค้ด/คิวอาร์โค้ด</h3>
                    <button className="barcode-modal-close" onClick={onClose}>
                        ✖
                    </button>
                </div>

                {/* Preview */}
                <div className="barcode-modal-preview">
                    <p>{item.productId.name}</p>
                    <svg className="barcode-modal-svg" id="barcode-modal-svg"></svg>
                    <p>฿{item.productId.price?.toFixed(2) || "0.00"}</p>
                </div>

                {/* Info + Quantity */}
                <div className="barcode-modal-info">
                    <div>
                        <strong>ชื่อ:</strong> {item.productId.name}
                    </div>
                    <div>
                        <strong>รหัส:</strong> {item.barcode}
                    </div>
                    <div>
                        <strong>ราคา:</strong> ฿{item.productId.price?.toFixed(2) || "0.00"}
                    </div>

                    <div className="barcode-modal-quantity">
                        <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}>-</button>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                        />
                        <button onClick={() => setQuantity((q) => q + 1)}>+</button>
                    </div>
                </div>

                {/* Actions */}
                <div className="barcode-modal-actions">
                    <button className="barcode-btn-link" onClick={() => setShowSettings(true)}>
                        ⚙ ตั้งค่าเพิ่มเติม
                    </button>
                    <div>
                        <button className="barcode-btn" onClick={onSave}>💾 บันทึก</button>
                        <button className="barcode-btn primary" onClick={handlePrint}>🖨️ พิมพ์</button>
                    </div>
                </div>
            </div>

            {/* ✅ Settings Modal */}
            {showSettings && (
                <BarcodeSettingsModal
                    options={options}
                    onOptionsChange={onOptionsChange}
                    onClose={() => setShowSettings(false)}
                />
            )}
        </>
    );
};

export default BarcodeModal;
