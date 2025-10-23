import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashAlt } from "@fortawesome/free-solid-svg-icons";

interface OrderItemListProps {
    items: any[];
    handleRemoveItem: (id: string) => void;
}

const OrderItemList: React.FC<OrderItemListProps> = ({ items, handleRemoveItem }) => (
    <div className="order-items-list">
        <h3>📦 รายการสินค้าในใบสั่งซื้อ</h3>
        {items.length === 0 ? (
            <p>ยังไม่มีสินค้าในรายการ</p>
        ) : (
            <ul>
                {items.map((item, idx) => (
                    <li key={idx} className="order-item-row">
                        <span>
                            {item.productName} — {item.quantity} ชิ้น (ต้นทุน {item.costPrice}฿)
                        </span>
                        <button
                            className="remove-item-btn"
                            onClick={() => handleRemoveItem(item.productId)}
                        >
                            <FontAwesomeIcon icon={faTrashAlt} />
                        </button>
                    </li>
                ))}
            </ul>
        )}
    </div>
);

export default OrderItemList;
