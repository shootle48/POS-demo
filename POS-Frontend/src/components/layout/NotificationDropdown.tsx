// src/components/page/NotificationDropdown.tsx
import React, { useRef, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import {
    connectSocket,
    onSocketEvent,
    offSocketEvent,
    disconnectSocket,
} from "../../api/websocket/socketService";
import { getStockData } from "../../api/stock/stock";
import "../../styles/page/Notification.css";

interface StockItem {
    _id: string;
    productId?: string;
    barcode: string;
    name: string;
    imageUrl: string;
    totalQuantity: number;
    updatedAt: string;
    location: string;
    locationId?: string;
    status: string;
    supplierId?: string;
    supplierName?: string;
    category: string;
    threshold?: number;
    costPrice?: number;
    salePrice?: number;
}

interface NotificationDropdownProps {
    notificationOpen: boolean;
    setNotificationOpen: (value: boolean) => void;
    hasSeenLowStock: boolean;
    showLowStockList: boolean;
    setShowLowStockList: (value: boolean | ((prev: boolean) => boolean)) => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
    notificationOpen,
    setNotificationOpen,
    hasSeenLowStock,
    showLowStockList,
    setShowLowStockList,
}) => {
    const notificationRef = useRef<HTMLDivElement>(null);
    const [lowStockItems, setLowStockItems] = useState<StockItem[]>([]);
    const [notificationCount, setNotificationCount] = useState(0);
    const processedRef = useRef<Set<string>>(new Set());
    const navigate = useNavigate();

    const normalizeStockItem = (raw: any): StockItem => ({
        _id: raw._id,
        productId: raw.productId?._id || raw.productId || "",
        barcode: raw.barcode ?? raw.productId?.barcode ?? "",
        name: raw.name ?? raw.productId?.name ?? "ไม่พบชื่อสินค้า",
        imageUrl: raw.imageUrl ?? raw.productId?.imageUrl ?? "",
        totalQuantity: Number(raw.totalQuantity ?? 0),
        updatedAt: raw.updatedAt ?? new Date().toISOString(),
        location:
            typeof raw.location === "object"
                ? raw.location?.name ?? raw.location?._id ?? ""
                : raw.location ?? "",
        locationId:
            typeof raw.location === "object"
                ? raw.location?._id ?? ""
                : raw.location ?? "",
        status: raw.status ?? "",
        supplierId: raw.supplierId?._id || raw.supplierId || "",
        supplierName:
            raw.supplierId?.companyName ??
            raw.supplierName ??
            raw.supplier ??
            "",
        category:
            typeof raw.category === "string"
                ? raw.category
                : raw.productId?.category?.name ?? "",
        threshold:
            raw.threshold !== undefined && raw.threshold !== null
                ? Number(raw.threshold)
                : 5,
        costPrice: Number(raw.costPrice ?? raw.productId?.costPrice ?? 0),
        salePrice: Number(raw.salePrice ?? raw.productId?.salePrice ?? 0),
    });

    const isLow = (item: StockItem) =>
        item.totalQuantity <= (item.threshold ?? 5);

    // ✅ โหลด stock ครั้งแรก
    const fetchStock = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const stock = await getStockData(token);
            const normalized: StockItem[] = (stock || []).map(normalizeStockItem);
            const lowList = normalized.filter(isLow);

            setLowStockItems(lowList);
        } catch (err) {
            console.error("❌ โหลด stock ไม่สำเร็จ", err);
        }
    };

    // ✅ Socket realtime update
    useEffect(() => {
        const socket = connectSocket();
        let ready = false;

        const handleStockUpdate = (raw: any) => {
            const updated = normalizeStockItem(raw);
            const id = updated._id;
            const nowLow = isLow(updated);

            if (!ready) return;
            if (processedRef.current.has(id)) return;

            processedRef.current.add(id);
            setTimeout(() => processedRef.current.delete(id), 300);

            setLowStockItems((prev) => {
                const exists = prev.some((i) => i._id === id);

                if (nowLow && !exists) {
                    console.log("🔔 สินค้าเหลือน้อยใหม่:", updated.name);
                    return [...prev, updated];
                }

                if (nowLow && exists) {
                    return prev.map((i) => (i._id === id ? updated : i));
                }

                if (!nowLow && exists) {
                    console.log("✅ สินค้ากลับมาปกติ:", updated.name);
                    return prev.filter((i) => i._id !== id);
                }

                return prev;
            });
        };

        onSocketEvent("stockUpdated", handleStockUpdate);

        (async () => {
            await fetchStock();
            ready = true;
        })();

        return () => {
            offSocketEvent("stockUpdated", handleStockUpdate);
            disconnectSocket();
        };
    }, []);

    // ✅ sync notificationCount ตามจำนวน lowStockItems จริงเสมอ
    useEffect(() => {
        setNotificationCount(lowStockItems.length);
    }, [lowStockItems]);

    // ปิด dropdown เมื่อคลิกข้างนอก
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (
                notificationRef.current &&
                !notificationRef.current.contains(target)
            ) {
                setNotificationOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [setNotificationOpen]);

    // ✅ ไปหน้าสร้าง PO เมื่อกดที่สินค้าเหลือน้อย
    const handleItemClick = (item: StockItem) => {
        setNotificationOpen(false);
        navigate("/create-purchase-order", {
            state: {
                fromNotification: true,
                product: item,
            },
        });
    };

    return (
        <div className="notification-dropdown" ref={notificationRef}>
            {/* 🔔 ไอคอนแจ้งเตือน */}
            <div
                className="notification-wrapper"
                onClick={() => setNotificationOpen(!notificationOpen)}
            >
                <FontAwesomeIcon icon={faBell} className="icon notification-icon" />
                {notificationCount > 0 && (
                    <span className="notification-length">{notificationCount}</span>
                )}
            </div>

            {/* 📜 รายการแจ้งเตือน */}
            {notificationOpen && (
                <div
                    className="notification-menu"
                    onClick={(e) => e.stopPropagation()}
                >
                    {lowStockItems.length > 0 ? (
                        <>
                            <div
                                className="notification-item low-stock-header clickable"
                                onClick={() => setShowLowStockList((prev) => !prev)}
                            >
                                📦 สินค้าเหลือน้อย
                                <span className="low-stock-count">
                                    ({lowStockItems.length} รายการ)
                                </span>
                            </div>

                            {showLowStockList &&
                                lowStockItems.map((item) => (
                                    <div
                                        key={item._id}
                                        className="notification-item hoverable"
                                        onClick={() => handleItemClick(item)}
                                    >
                                        • {item.name} เหลือ {item.totalQuantity} ชิ้น
                                    </div>
                                ))}
                        </>
                    ) : (
                        <p className="notification-item">✅ ไม่มีสินค้าคงเหลือน้อย</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
