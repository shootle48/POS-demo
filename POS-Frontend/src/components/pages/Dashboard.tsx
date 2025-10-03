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
import { fetchSalesSummary } from "../../api/receipt/receiptApi";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface TimeFrameData {
  totalSales: number;
  totalQuantity: number; // Add totalQuantity field
  growth: number;
  netSales: number;
  totalProfit: number;
  bestSeller: {
    name: string;
    quantity: number;
    revenue: number;
  };
  formattedDate: {
    thai: string;
    iso: string;
  };
}

interface DashboardData {
  daily: TimeFrameData;
  weekly: TimeFrameData;
  monthly: TimeFrameData;
}

function formatThaiShortDate(dateString: string): string {
  // แปลงวันที่ให้เป็นรูปแบบย่อ
  const date = new Date(dateString);
  return date.toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(' น.', '');
}

export default function SalesSummary() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"daily" | "weekly" | "monthly">("weekly");

  useEffect(() => {
    const getSummary = async () => {
      try {
        const res = await fetchSalesSummary();
        if (res.success) {
          setDashboardData(res.data);
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
  if (!dashboardData) return <p>ไม่พบข้อมูล</p>;

  const selectedData = dashboardData[filter];

  // ปรับข้อมูลสำหรับกราฟ
  const salesData = {
    labels: [formatThaiShortDate(selectedData.formattedDate.iso)],
    datasets: [
      {
        label: "ยอดขาย (บาท)",
        data: [selectedData.totalSales],
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
        text: `ยอดขาย${filter === "daily" ? "วันนี้" : 
              filter === "weekly" ? "สัปดาห์นี้" : 
              "เดือนนี้"}`,
        font: { size: 18 },
        color: "#2d3436",
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            return `฿${value.toLocaleString()}`;
          }
        }
      }
    },
    scales: { 
      y: { 
        beginAtZero: true,
        ticks: {
          callback: (value: number) => `฿${value.toLocaleString()}`
        }
      }
    },
  };

  return (
    <div className="report-sale-container">
      <header className="report-sale-header">
        <h1 className="report-sale-title">📊 รายงานยอดขาย</h1>
      </header>

      <div className="filter-buttons">
        <button
          className={filter === "daily" ? "active" : ""}
          onClick={() => setFilter("daily")}
        >
          รายวัน
        </button>
        <button
          className={filter === "weekly" ? "active" : ""}
          onClick={() => setFilter("weekly")}
        >
          รายสัปดาห์
        </button>
        <button
          className={filter === "monthly" ? "active" : ""}
          onClick={() => setFilter("monthly")}
        >
          รายเดือน
        </button>
      </div>

      <section className="report-sale-summary">
        <div className="summary-card">
          <h3>ยอดขายรวม</h3>
          <p>{selectedData.totalQuantity.toLocaleString()} ชิ้น</p>
          <small className={selectedData.growth >= 0 ? "positive" : "negative"}>
            {selectedData.growth > 0 ? "+" : ""}{selectedData.growth.toFixed(2)}%
          </small>
        </div>
        <div className="summary-card">
          <h3>ยอดขายสุทธิ</h3>
          <p>฿{selectedData.netSales.toLocaleString()}</p>
          <small className="quantity">คิดเป็น {((selectedData.netSales / selectedData.totalSales) * 100).toFixed(2)}%</small>
        </div>
        <div className="summary-card profit">
          <h3>กำไรรวม</h3>
          <p>฿{selectedData.totalProfit.toLocaleString()}</p>
          <small className="quantity">
            อัตรากำไร {((selectedData.totalProfit / selectedData.totalSales) * 100).toFixed(2)}%
          </small>
        </div>
        <div className="summary-card">
          <h3>สินค้าขายดี</h3>
          <p>{selectedData.bestSeller.name}</p>
          <small>{selectedData.bestSeller.quantity.toLocaleString()} ชิ้น</small>
          <small className="revenue">฿{selectedData.bestSeller.revenue.toLocaleString()}</small>
        </div>
      </section>

      <main className="report-sale-main">
        <section className="report-sale-chart">
          <Line data={salesData} options={options} />
        </section>
      </main>
    </div>
  );
}