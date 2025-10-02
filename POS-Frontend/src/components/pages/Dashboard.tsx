import React, { useEffect, useState } from "react";
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
import { fetchSalesSummary } from "../../api/receipt/receiptApi.ts";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface SummaryData {
  totalPrice: number;
  amountPaid: number;
  changeAmount: number;
  count: number;
  profit: number;
  details: {
    employeeName: string;
    timestamp: string | Date;
    items: { name: string; quantity: number; subtotal: number }[];
  }[];
}

// ✅ รวมยอดขายตามวัน
const aggregateSalesByDay = (details: SummaryData["details"]) => {
  const salesByDay = details.reduce((acc, curr) => {
    const date = new Date(curr.timestamp);
    const dayKey = date.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
    });

    if (!acc[dayKey]) {
      acc[dayKey] = { total: 0, date };
    }

    const dayTotal = curr.items.reduce((sum, item) => sum + item.subtotal, 0);
    acc[dayKey].total += dayTotal;

    return acc;
  }, {} as Record<string, { total: number; date: Date }>);

  const sortedDays = Object.entries(salesByDay).sort(
    (a, b) => a[1].date.getTime() - b[1].date.getTime()
  );

  return {
    labels: sortedDays.map(([day]) => day),
    totals: sortedDays.map(([_, data]) => data.total),
  };
};

export default function SalesSummary() {
  const [today, setToday] = useState<SummaryData | null>(null);
  const [thisWeek, setThisWeek] = useState<SummaryData | null>(null);
  const [thisMonth, setThisMonth] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"day" | "week" | "month">("week"); // ✅ filter state

  useEffect(() => {
    const getSummary = async () => {
      try {
        const res = await fetchSalesSummary();
        if (res.success) {
          setToday(res.today);
          setThisWeek(res.thisWeek);
          setThisMonth(res.thisMonth);
        } else {
          setError("ไม่สามารถดึงข้อมูลได้");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      } finally {
        setLoading(false);
      }
    };
    getSummary();
  }, []);

  if (loading) return <p>⏳ กำลังโหลดข้อมูล...</p>;
  if (error) return <p className="error-text">❌ {error}</p>;

  // ✅ เลือก dataset ตาม filter
  let selectedData: SummaryData | null = null;
  if (filter === "day") selectedData = today;
  if (filter === "week") selectedData = thisWeek;
  if (filter === "month") selectedData = thisMonth;

  const salesData = {
    labels: selectedData ? aggregateSalesByDay(selectedData.details).labels : [],
    datasets: [
      {
        label: "ยอดขาย (บาท)",
        data: selectedData ? aggregateSalesByDay(selectedData.details).totals : [],
        borderColor: "#6c5ce7",
        backgroundColor: "rgba(108, 92, 231, 0.2)",
        fill: true,
        tension: 0.3,
        pointBackgroundColor: "#00cec9",
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: {
        display: true,
        text:
          filter === "day"
            ? "ยอดขายวันนี้"
            : filter === "week"
            ? "ยอดขายรายสัปดาห์"
            : "ยอดขายรายเดือน",
        font: { size: 18 },
        color: "#2d3436",
      },
    },
    scales: { y: { beginAtZero: true } },
  };

  return (
    <div className="report-sale-container">
      <header className="report-sale-header">
        <h1 className="report-sale-title">📊 รายงานยอดขาย</h1>
      </header>

      {/* ✅ ปุ่ม Filter */}
      <div className="filter-buttons">
        <button
          className={filter === "day" ? "active" : ""}
          onClick={() => setFilter("day")}
        >
          รายวัน
        </button>
        <button
          className={filter === "week" ? "active" : ""}
          onClick={() => setFilter("week")}
        >
          รายสัปดาห์
        </button>
        <button
          className={filter === "month" ? "active" : ""}
          onClick={() => setFilter("month")}
        >
          รายเดือน
        </button>
      </div>

      {/* ✅ ส่วนสรุปยอดขาย */}
      <section className="report-sale-summary">
        <div className="summary-card">ยอดขายรวม: ฿{thisMonth?.totalPrice.toLocaleString()}</div>
        <div className="summary-card">คืนเงิน: ฿{thisMonth?.changeAmount.toLocaleString()}</div>
        <div className="summary-card">ยอดขายสุทธิ: ฿{thisMonth?.amountPaid.toLocaleString()}</div>
        <div className="summary-card">กำไรรวม: ฿{thisMonth?.profit?.toLocaleString() ?? "0"}</div>
      </section>

      {/* ✅ กราฟ */}
      <main className="report-sale-main">
        <section className="report-sale-chart">
          <Line data={salesData} options={options} />
        </section>
      </main>
    </div>
  );
}
