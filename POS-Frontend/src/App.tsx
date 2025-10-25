import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";

import axios from "axios";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Homepage from "./components/pages/Homepage";
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import Dashboard from "./components/pages/Dashboard";
import ProductList from "./components/product/ProductList";
import StockPage from "./components/stock/StockPage";
import CreateOrder from "./components/purchaseOrder/CreatePurchaseOrderPage";
import SupplierList from "./components/suppliers/SupplierList";
import UserSettings from "./components/pages/UserSettings";
import ReceiptPage from "./components/receipt/ReceiptPage";
import Search from "./components/product/BarcodeSearch";
import SalePage from "./components/pages/Dashboard";
import PaymentPage from "./components/payment/PaymentPage";
import EmployeeList from "./components/aboutStore/EmployeePage";
import PurchaseOrderPage from "./components/purchaseOrder/PurchaseOrderPage";
import EmployeePage from "./components/pages/Employee/Dashboard-employee";
import StockTransaction from "./components/stock/StockTransaction";
import ExpiredPage from "./components/stock/ExpiredPage";
import BarcodePage from "./components/barcode/BarcodeStockPage";
import DiscountPage from "./components/payment/DiscountPage";
import WarehousePage from "./components/warehouses/WarehouseList"
import { GlobalPopupProvider } from "./components/common/GlobalPopupEdit";
import QCInspectionPage from "./components/qc/QCInspectionPage";
import RefundPage from "./components/payment/RefundPage";
import StockLotPage from "./components/stock/stocklot/StockLotPage";
import { jwtDecode } from "jwt-decode";
import { renewToken } from "./api/auth/auth";

import "./App.css";

// ✅ Interceptor ตรวจสอบ response
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      localStorage.removeItem("token");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

// ✅ ฟังก์ชันเช็ค token หมดอายุ
const isTokenValid = (token: string | null): boolean => {
  if (!token) return false;
  try {
    const decoded: any = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp > currentTime;
  } catch {
    return false;
  }
};

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [activeMenu, setActiveMenu] = useState<string>(""); // ✅ state สำหรับเก็บชื่อเมนู

  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn: boolean = Boolean(token && isTokenValid(token));

  // mock user (ภายหลังอาจดึงจาก API หรือ localStorage)
  const [user, setUser] = useState<{ role: string; nameStore: string } | null>({
    role: "admin",
    nameStore: "EAZYPOS",
  });

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // ✅ toggle dropdown
  const toggleDropdown = (menu: string) => {
    setOpenDropdown(openDropdown === menu ? null : menu);
  };

  // ✅ handle click menu
  const handleMenuClick = (path: string, menuName: string) => {
    setActiveMenu(menuName);   // อัปเดตชื่อเมนู
    navigate(path);            // ไปยัง path โดยไม่ต้องรีเฟรช
  };
  useEffect(() => {
    const pathToMenu: Record<string, string> = {
      "/shop": "ซื้อสินค้า",
      "/reports/sales": "รายงานยอดขาย",
      "/reports/stock": "รายงานสินค้าคงเหลือ",
      "/reports/receipts": "ใบเสร็จ",
      "/reports/salehistory": "ประวัติการขาย",
      "/stocks": "สต็อกสินค้า",
      "/createOrder": "นำเข้าสินค้าใหม่",
      "/barcode": "บาร์โค้ด",
      "/debt": "ค้างชำระ",
      "/expired": "สินค้าเหลือน้อย/สินค้าหมด",
      "/setting/employee": "ตั้งค่าพนักงาน",
      "/suppliers": "ผู้ผลิต",
      "/purchase-orders": "คำสั่งซื้อ",
      "/stockTransaction": "ประวัติการเคลื่อนไหวของคลังสินค้า",
      "/discount": "จัดการส่วนลด",
      "/qc": "ตรวจสอบสินค้า (QC)",
      "/warehouse": "จัดการคลังสินค้า",
      "/refund": "คืนสินค้า",
    };

    const menuName = pathToMenu[location.pathname];
    if (menuName) {
      setActiveMenu(menuName);
    } else {
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem("token"));
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const decoded: any = jwtDecode(token);
      const rawStoreName = decoded?.nameStore;
      let normalizedStore = "EAZYPOS";
      if (typeof rawStoreName === "string" && rawStoreName.length > 0) {
        try {
          normalizedStore = decodeURIComponent(rawStoreName);
        } catch {
          normalizedStore = rawStoreName;
        }
      }

      setUser({
        role: decoded?.role || "admin",
        nameStore: normalizedStore,
      });
    } catch {
      setUser(null);
    }
  }, [token]);

  // ✅ Token refresh ตาม activity
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let lastRenewTime = 0;
    const COOLDOWN_MS = 5 * 60 * 1000;

    const isTokenExpiringSoon = (token: string | null, bufferSeconds = 60) => {
      if (!token) return true;
      try {
        const decoded: any = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        return decoded.exp - currentTime < bufferSeconds;
      } catch {
        return true;
      }
    };

    const activityDetected = async () => {
      clearTimeout(timeoutId);
      const token = localStorage.getItem("token"); // ✅ ดึงจาก localStorage ทุกครั้ง
      const now = Date.now();
      const enoughTimePassed = now - lastRenewTime > COOLDOWN_MS;
      const tokenIsExpiring = isTokenExpiringSoon(token, 60);

      if (token && tokenIsExpiring && enoughTimePassed) {
        const newToken = await renewToken(token);
        if (newToken) {
          localStorage.setItem("token", newToken);
          lastRenewTime = Date.now();
          console.log("🔄 Token renewed successfully");
        }
      }

      timeoutId = setTimeout(() => { }, COOLDOWN_MS);
    };

    window.addEventListener("mousemove", activityDetected);
    window.addEventListener("keydown", activityDetected);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("mousemove", activityDetected);
      window.removeEventListener("keydown", activityDetected);
    };
  }, []);

  return (
    <GlobalPopupProvider>
      <div className={`app-container ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <Header
          toggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
          isLoggedIn={isLoggedIn}
          activeMenu={activeMenu || "ยินดีต้อนรับสู่ EAZYPOS"}
        />

        {isLoggedIn && (
          <Sidebar
            isSidebarOpen={isSidebarOpen}
            openDropdown={openDropdown}
            toggleDropdown={toggleDropdown}
            handleMenuClick={handleMenuClick}
            user={user}
          />
        )}

        <div className="main-content">
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/suppliers" element={<SupplierList />} />
            <Route path="settingProfile" element={<UserSettings />} />
            <Route path="/reports/salehistory" element={<PaymentPage />} />
            <Route path="setting/employee" element={<EmployeeList />} />
            <Route path="/reports/receipts" element={<ReceiptPage />} />
            <Route path="/products/search" element={<Search />} />
            <Route path="/purchase-orders" element={<PurchaseOrderPage />} />
            <Route path="/reports/sales" element={<SalePage />} />
            <Route path="/employee-dashboard" element={<EmployeePage />} />
            <Route path="/qc/:poId" element={<QCInspectionPage />} />
            <Route path="/reports/refund" element={<RefundPage />} />
            <Route path="/stocklots" element={<StockLotPage />} />

            <Route
              path="/shop"
              element={
                <ProductList
                  isSidebarOpen={isSidebarOpen}
                  toggleSidebar={toggleSidebar}
                />
              }
            />
            <Route path="/stocks" element={<StockPage />} />
            <Route path="/stockTransaction" element={<StockTransaction />} />
            <Route path="/create-purchase-order" element={<CreateOrder />} />
            <Route path="/expired" element={<ExpiredPage />} />
            <Route path="/barcode" element={<BarcodePage />} />
            <Route path="/discount" element={<DiscountPage />} />
            <Route path="/warehouse" element={<WarehousePage />} />

          </Routes>
        </div>
      </div>
    </GlobalPopupProvider>
  );

};

export default App;