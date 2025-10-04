import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { th } from "date-fns/locale";
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
import "../../styles/page/POSDashboard.css";
import { fetchSalesSummary } from "../../api/receipt/receiptApi";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function SalesSummary() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filter, setFilter] = useState<"daily" | "weekly" | "monthly">("daily");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const changes = data?.changes?.[filter] || {};
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
  if (!data || !data.summary || !data.changes) return <p>ไม่พบข้อมูล</p>;

  const summary = data.summary[filter];
  const bestSeller = data.topProducts[filter]?.[0] || {
    name: "-",
    quantity: 0,
    revenue: 0,
  };
  const chartSet = data[filter];

  // ✅ Label ของกราฟ (แสดงวันที่หรือชั่วโมงจริง)
  const chartLabels = chartSet.map((d: any) => {
    const date = new Date(d.formattedDate.iso);
    if (filter === "daily")
      return date.toLocaleTimeString("th-TH", { hour: "2-digit" });
    else
      return date.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
      });
  });

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: "ยอดขาย (บาท)",
        data: chartSet.map((d: any) => d.totalSales),
        borderColor: "#6c5ce7",
        backgroundColor: "rgba(108, 92, 231, 0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: "#6c5ce7",
      },
    ],
  };

  const chartTitle =
    filter === "daily"
      ? "ยอดขายวันนี้"
      : filter === "weekly"
      ? "ยอดขายรายสัปดาห์นี้"
      : "ยอดขายรายเดือนนี้";

  const totalSalesToday = summary.totalSales.toLocaleString();

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: chartTitle },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `฿${ctx.raw.toLocaleString()}`,
        },
      },
    },
    scales: {
      y: { beginAtZero: true },
      x: { ticks: { font: { size: 12 } } },
    },
  };

  return (
    <div className="dashboard-wrapper">
      <h1 className="dashboard-title">📊 รายงานยอดขาย</h1>

      {/* 🔹 Filter Buttons */}
      <div className="dashboard-filters">
        {["daily", "weekly", "monthly"].map((type) => (
          <button
            key={type}
            className={filter === type ? "active" : ""}
            onClick={() => setFilter(type as any)}
          >
            {type === "daily"
              ? "รายวัน"
              : type === "weekly"
              ? "รายสัปดาห์"
              : "รายเดือน"}
          </button>
        ))}

        {/* 🔹 Date Picker */}
        <DatePicker
          selected={selectedDate}
          onChange={(date: Date) => setSelectedDate(date)}
          locale={th}
          dateFormat={filter === "monthly" ? "MMMM yyyy" : "dd MMMM yyyy"}
          showMonthYearPicker={filter === "monthly"}
          className="date-picker"
        />
      </div>

      {/* 🔹 Summary Section */}
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

      {/* 🔹 Chart Section */}
      <div className="chart-container">
        <h2>{chartTitle}</h2>
        <Line data={chartData} options={options} />
        <p className="total-sales-text">
          💰 ยอดขายรวมทั้งหมด: ฿{totalSalesToday}
        </p>
      </div>
    </div>
  );
}
