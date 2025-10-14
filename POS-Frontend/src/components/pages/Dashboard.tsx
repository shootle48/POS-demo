import React, { useEffect, useState, lazy, Suspense } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { th } from "date-fns/locale";
import "../../styles/page/POSDashboard.css";
import { fetchSalesSummary } from "../../api/receipt/receiptApi";

// ✅ Lazy Load Component
const SalesSummaryChart = lazy(() => import("./SalesSummaryChart"));

export default function SalesSummary() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filter, setFilter] = useState<"daily" | "weekly" | "monthly">("daily");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSummary = async () => {
      setLoading(true);
      const res = await fetchSalesSummary(selectedDate, filter);
      if (res.success) setData(res.data);
      setLoading(false);
    };
    getSummary();
  }, [selectedDate, filter]);

  if (loading) return <p>⏳ กำลังโหลดข้อมูล...</p>;
  if (!data) return <p>ไม่พบข้อมูล</p>;

  const changes = data.changes[filter] || {};
  const summary = data.summary[filter];

  const bestSeller = data.topProducts[filter]?.[0] || {
    name: "-",
    quantity: 0,
    revenue: 0,
  };

  const formatChange = (value: number) => {
    if (!value || isNaN(value)) return "0.00%";
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const iconChange = (value: number) => {
    if (value > 0) return "▲";
    if (value < 0) return "▼";
    return "–";
  };

  const getChangeColor = (value: number) =>
    value > 0 ? "positive" : value < 0 ? "negative" : "";

  return (
    <div className="dashboard-wrapper">
      <h1 className="dashboard-title">📊 รายงานยอดขาย</h1>

      {/* 🔸 Filter */}
      <div className="dashboard-filters">
        {["daily", "weekly", "monthly"].map((type) => (
          <button
            type="button"
            key={type}
            className={filter === type ? "active" : ""}
            onClick={(e) => {
              e.preventDefault(); // ✅ ป้องกันรีเฟรชหน้า
              setFilter(type as any);
            }}
          >
            {type === "daily"
              ? "รายวัน"
              : type === "weekly"
              ? "รายสัปดาห์"
              : "รายเดือน"}
          </button>
        ))}

        <DatePicker
          selected={selectedDate}
          onChange={(date) => date && setSelectedDate(date)}
          locale={th}
          dateFormat={filter === "monthly" ? "MMMM yyyy" : "dd MMMM yyyy"}
          showMonthYearPicker={filter === "monthly"}
          className="date-picker"
        />
      </div>

      {/* 🔸 Summary */}
      <div className="summary-grid">
        <div className="summary-card">
          <h3>ยอดขายรวม</h3>
          <p>{summary.totalQuantity} ชิ้น</p>
          <small className={getChangeColor(changes.totalQuantityChange)}>
            {iconChange(changes.totalQuantityChange)}{" "}
            {formatChange(changes.totalQuantityChange)}
          </small>
        </div>

        <div className="summary-card">
          <h3>ยอดขายสุทธิ</h3>
          <p>฿{summary.netSales.toLocaleString()}</p>
          <small className={getChangeColor(changes.totalSalesChange)}>
            {iconChange(changes.totalSalesChange)}{" "}
            {formatChange(changes.totalSalesChange)}
          </small>
        </div>

        <div className="summary-card">
          <h3>กำไรรวม</h3>
          <p>฿{summary.totalProfit.toLocaleString()}</p>
          <small className={getChangeColor(changes.totalProfitChange)}>
            {iconChange(changes.totalProfitChange)}{" "}
            {formatChange(changes.totalProfitChange)}
          </small>
        </div>

        <div className="summary-card">
          <h3>สินค้าขายดี</h3>
          <p>{bestSeller.name}</p>
          <small>{bestSeller.quantity} ชิ้น</small>
          <small className="revenue">
            ฿{bestSeller.revenue.toLocaleString()}
          </small>
        </div>
      </div>

      {/* ✅ โหลด component กราฟแบบ Lazy */}
      <Suspense fallback={<p>⏳ กำลังโหลดกราฟ...</p>}>
        <SalesSummaryChart filter={filter} selectedDate={selectedDate} />
      </Suspense>
    </div>
  );
}
