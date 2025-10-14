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

interface Props {
  filter: "daily" | "weekly" | "monthly";
  selectedDate: Date;
}

const SalesSummaryChart: React.FC<Props> = React.memo(({ filter, selectedDate }) => {
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      const res = await fetchSalesSummary(selectedDate, filter);
      if (res.success) {
        const data = res.data[filter] || [];
        const labels = data.map((d: any) => {
          const date = new Date(d.formattedDate.iso);
          return filter === "daily"
            ? date.toLocaleTimeString("th-TH", { hour: "2-digit" })
            : date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
        });

        setChartData({
          labels,
          datasets: [
            {
              label: "ยอดขาย (บาท)",
              data: data.map((d: any) => d.totalSales),
              borderColor: "#6c5ce7",
              backgroundColor: "rgba(108, 92, 231, 0.1)",
              fill: true,
              tension: 0.3,
              pointRadius: 4,
              pointBackgroundColor: "#6c5ce7",
            },
          ],
        });
      }
      setLoading(false);
    };
    getData();
  }, [filter, selectedDate]);

  if (loading) return <p>⏳ กำลังโหลดกราฟ...</p>;
  if (!chartData) return <p>ไม่พบข้อมูลกราฟ</p>;

  const chartTitle =
    filter === "daily"
      ? "ยอดขายวันนี้"
      : filter === "weekly"
      ? "ยอดขายรายสัปดาห์"
      : "ยอดขายรายเดือน";

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
    <div className="chart-container">
      <h2>{chartTitle}</h2>
      <Line data={chartData} options={options} />
    </div>
  );
});

export default SalesSummaryChart;
