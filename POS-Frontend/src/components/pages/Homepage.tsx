import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

import "../../styles/page/HomePage.css";

import { fetchSalesSummary } from "../../api/receipt/receiptApi";
import { getProducts } from "../../api/product/productApi";
import { getStockData } from "../../api/stock/stock";
import { getWarehouses } from "../../api/product/warehousesApi";
import { getCategories } from "../../api/product/categoryApi";
import { getSupplierData } from "../../api/suppliers/supplierApi";

import StockTable from "../stock/component/StockTable";
import FilterControl from "../stock/component/FilterControl";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [data, setData] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [stockData, setStockData] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);

  // filter + search (เฉพาะตาราง stock)
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<("active" | "inactive")[]>(
    []
  );

  // pagination (5 แถว/หน้า)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // init user
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setUser(decoded);
      } catch (err) {
        console.error("❌ Invalid token:", err);
      }
    }
    setLoading(false);
  }, []);

  // load dashboard data
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const [salesRes, productsRes, stockRes] = await Promise.all([
          fetchSalesSummary(new Date(), "daily"),
          getProducts(),
          getStockData(localStorage.getItem("token") || ""),
        ]);

        if (salesRes?.success) setData(salesRes.data);
        if (productsRes?.success && Array.isArray(productsRes.data))
          setProducts(productsRes.data);

        if (stockRes) {
          setStockData(stockRes);
          const lowStock = stockRes
            .filter((item: any) => item.quantity <= (item.threshold ?? 5))
            .map((item: any) => ({
              name: item.productId?.name || "ไม่พบชื่อสินค้า",
              quantity: item.quantity,
              imageUrl:
                item.productId?.imageUrl ||
                "https://cdn-icons-png.flaticon.com/512/2331/2331970.png",
            }));
          setLowStockItems(lowStock);
        }
      } catch (error) {
        console.error("❌ Load dashboard data failed:", error);
      }
    };
    loadData();
  }, [user]);

  // load filter choices
  useEffect(() => {
    const fetchFilters = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("⚠️ Token not found, skip fetching filters");
        return;
      }
      try {
        const [wh, cat, sup] = await Promise.all([
          getWarehouses(),
          getCategories(token),
          getSupplierData(token),
        ]);
        setWarehouses(wh);
        setCategories(cat.data);
        setSuppliers(sup);
      } catch (err) {
        console.error("❌ Failed to fetch filters:", err);
      }
    };
    fetchFilters();
  }, []);

  // filter + pagination (เฉพาะตาราง stock)
  const filteredStock = stockData.filter((item) => {
    const searchText = searchQuery.toLowerCase();
    const productName = item.productId?.name?.toLowerCase() || "";
    const barcode = item.barcode?.toLowerCase() || "";
    const supplierName = item.supplierId?.companyName?.toLowerCase() || "";
    const categoryName = item.productId?.category?.name?.toLowerCase() || "";

    const matchesSearch =
      productName.includes(searchText) ||
      barcode.includes(searchText) ||
      supplierName.includes(searchText) ||
      categoryName.includes(searchText);

    let matchesStatus = true;
    if (selectedStatuses.length > 0) {
      if (selectedStatuses.includes("low10") && item.quantity < 10)
        matchesStatus = true;
      else matchesStatus = selectedStatuses.includes(item.status);
    }

    const matchesWarehouse =
      selectedWarehouses.length === 0 ||
      selectedWarehouses.includes(item.location?._id || "");

    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.includes(item.productId?.category?._id || "");

    const matchesSupplier =
      selectedSuppliers.length === 0 ||
      selectedSuppliers.includes(item.supplierId?._id || "");

    return (
      matchesSearch &&
      matchesStatus &&
      matchesWarehouse &&
      matchesCategory &&
      matchesSupplier
    );
  });

  const totalPages = Math.ceil(filteredStock.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredStock.slice(indexOfFirstItem, indexOfLastItem);

  // loading states
  if (loading)
    return (
      <div style={{ textAlign: "center", padding: 50 }}>
        ⏳ กำลังตรวจสอบข้อมูลผู้ใช้...
      </div>
    );
  if (!user)
    return (
      <div className="display">
        <div className="home-container">
          {/* ส่วนข้อความต้อนรับ */}
          <div className="text-section">
            <h1 className="welcome-title">ยินดีต้อนรับสู่ระบบ POS</h1>
            <p className="description">
              ระบบที่ช่วยให้การขายของคุณเป็นเรื่องง่ายและสะดวกยิ่งขึ้น
              รองรับการจัดการสินค้า รายงานยอดขาย และสต็อกสินค้าในที่เดียว!
            </p>

            {/* จุดเด่นของระบบ */}
            <div className="features">
              <div className="feature-item">
                ✅ <strong>จัดการสินค้า:</strong> เพิ่ม ลบ
                แก้ไขข้อมูลสินค้าได้ง่าย
              </div>
              <div className="feature-item">
                📊 <strong>รายงานยอดขาย:</strong> ดูสรุปยอดขายแบบเรียลไทม์
              </div>
              <div className="feature-item">
                📦 <strong>ระบบสต็อก:</strong>{" "}
                ควบคุมปริมาณสินค้าให้อยู่ในระดับที่เหมาะสม
              </div>
              <div className="feature-item">
                💳 <strong>รองรับการชำระเงิน:</strong> รับชำระเงินหลายช่องทาง
              </div>
            </div>
          </div>

          {/* ส่วนรูปภาพประกอบ */}
          <div className="image-section">
            <img
              className="pos-image"
              src="https://res.cloudinary.com/dboau6axv/image/upload/v1738153705/pos_ozpgmv.jpg"
              alt="POS System"
            />
          </div>
        </div>
      </div>
    );
  if (!data)
    return (
      <div style={{ textAlign: "center", padding: 50 }}>
        ⏳ กำลังโหลดข้อมูลยอดขาย...
      </div>
    );

  // chart config
  const chartLabels = data.daily.map((d: any) => {
    const date = new Date(d.formattedDate.iso);
    return date.toLocaleTimeString("th-TH", { hour: "2-digit" });
  });
  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: "ยอดขาย (บาท)",
        data: data.daily.map((d: any) => d.totalSales),
        borderColor: "#6c5ce7",
        backgroundColor: "rgba(108,92,231,0.1)",
        fill: true,
        tension: 0.35,
        pointRadius: 3,
      },
    ],
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" as const },
      tooltip: {
        callbacks: { label: (ctx: any) => `฿${ctx.raw.toLocaleString()}` },
      },
    },
    scales: { y: { beginAtZero: true }, x: { ticks: { font: { size: 12 } } } },
  };

  // top products
  const topProducts =
    data.topProducts.daily?.slice(0, 6).map((p: any) => {
      const match = products.find(
        (prod) => prod.productId?.barcode === p.barcode
      );
      return {
        ...p,
        imageUrl:
          match?.productId?.imageUrl ||
          "https://cdn-icons-png.flaticon.com/512/2331/2331970.png",
      };
    }) || [];

  return (
    <div className="display">
      <div className="dashboard-overview">
        <h1>ภาพรวมร้าน {user?.nameStore || "My Store"}</h1>

        {/* HERO GRID */}
        <div className="hero-grid">
          {/* Top 5 */}
          <section className="panel panel-top5 card-like">
            <h2 className="section-title">สินค้าขายดี (Top 5)</h2>
            <div className="carousel-container">
              <button
                className="carousel-btn left"
                onClick={() =>
                  (
                    document.querySelector(".carousel-list") as HTMLElement
                  )?.scrollBy({ left: -300, behavior: "smooth" })
                }
              >
                ‹
              </button>
              <div className="carousel-list">
                {topProducts.map((p: any, i: number) => (
                  <div key={i} className="carousel-item">
                    <div className="rank">#{i + 1}</div>
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="carousel-img"
                    />
                    <div className="carousel-info">
                      <strong>{p.name}</strong>
                      <p>จำนวนขาย: {p.quantity} ชิ้น</p>
                      <p>กำไร: ฿{p.revenue.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="carousel-btn right"
                onClick={() =>
                  (
                    document.querySelector(".carousel-list") as HTMLElement
                  )?.scrollBy({ left: 300, behavior: "smooth" })
                }
              >
                ›
              </button>
            </div>
          </section>

          {/* Chart */}
          <section className="panel panel-chart card-like">
            <h2 className="section-title">กราฟแนวโน้มยอดขายรายวัน</h2>
            <div className="chart-wrap" style={{ height: 430 }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </section>

          {/* Low stock */}
          <section className="panel panel-lowstock card-like">
            <h2 className="section-title">สินค้าเหลือน้อย 📦</h2>
            <div className="carousel-container">
              <button
                className="carousel-btn left"
                onClick={() =>
                  (
                    document.querySelector(
                      ".lowstock-carousel-list"
                    ) as HTMLElement
                  )?.scrollBy({ left: -300, behavior: "smooth" })
                }
              >
                ‹
              </button>
              <div className="lowstock-carousel-list">
                {lowStockItems.map((item, index) => (
                  <div key={index} className="lowstock-item">
                    <div className="rank">#{index + 1}</div>
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="carousel-img"
                    />
                    <div className="carousel-info">
                      <strong>{item.name}</strong>
                      <p>เหลือ {item.quantity} ชิ้น</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="carousel-btn right"
                onClick={() =>
                  (
                    document.querySelector(
                      ".lowstock-carousel-list"
                    ) as HTMLElement
                  )?.scrollBy({ left: 300, behavior: "smooth" })
                }
              >
                ›
              </button>
            </div>
          </section>
        </div>

        {/* KPI */}
        <section className="kpi-equal">
          <div className="card-like kpi-card kpi-sales">
            <h3>ยอดขายวันนี้</h3>
            <p>฿{data.summary.daily.totalSales.toLocaleString()}</p>
          </div>
          <div className="card-like kpi-card kpi-orders">
            <h3>จำนวนรายการขาย</h3>
            <p>{data.summary.daily.totalQuantity} ชิ้น</p>
          </div>
          <div className="card-like kpi-card kpi-profit">
            <h3>กำไรรวม</h3>
            <p>฿{data.summary.daily.totalProfit.toLocaleString()}</p>
          </div>
          <div className="card-like kpi-card kpi-staff">
            <h3>พนักงานวันนี้</h3>
            <p>0 คน</p>
          </div>
        </section>

        {/* Stock (เต็มความกว้าง + ฟิลเตอร์อยู่ในกล่องเดียวกัน) */}
        <div className="stock-layout">
          <div className="stock-table-area card-like">
            <h2 className="section-title">📦 สินค้าคงเหลือในคลัง</h2>

            {/* แถบเครื่องมือค้นหา/ฟิลเตอร์ */}
            <div className="stock-toolbar">
              <input
                type="text"
                placeholder="🔍 ค้นหาสินค้า..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <FilterControl
                selectedStatuses={selectedStatuses}
                setSelectedStatuses={(v) => {
                  setSelectedStatuses(v);
                  setCurrentPage(1);
                }}
                selectedWarehouses={selectedWarehouses}
                setSelectedWarehouses={(v) => {
                  setSelectedWarehouses(v);
                  setCurrentPage(1);
                }}
                selectedCategories={selectedCategories}
                setSelectedCategories={(v) => {
                  setSelectedCategories(v);
                  setCurrentPage(1);
                }}
                selectedSuppliers={selectedSuppliers}
                setSelectedSuppliers={(v) => {
                  setSelectedSuppliers(v);
                  setCurrentPage(1);
                }}
                selectedExpiry={selectedExpiry}
                setSelectedExpiry={(v) => {
                  setSelectedExpiry(v);
                  setCurrentPage(1);
                }}
                activeFilter={activeFilter}
                setActiveFilter={(v) => {
                  setActiveFilter(v);
                  setCurrentPage(1);
                }}
                warehouses={warehouses}
                categories={categories}
                suppliers={suppliers}
              />
            </div>

            {/* กล่องเลื่อนคงที่ ป้องกันยืดหด */}
            <div className="stock-table-shell">
              <StockTable
                stock={currentItems}
                getLocationName={(loc) => loc?.name || "ไม่ทราบ"}
                getCategoryNameById={() => ""}
                formatThaiDateTime={(d) =>
                  new Date(d).toLocaleString("th-TH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }
                getStatusIcon={() => ""}
                handleRowClick={() => {}}
              />
            </div>

            <div className="pagination-controls">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                ◀ ก่อนหน้า
              </button>
              <span>
                หน้า {currentPage} จาก {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                ถัดไป ▶
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
