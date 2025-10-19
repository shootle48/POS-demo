import React, { useEffect, useId, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { fetchSalesSummary } from "../../api/receipt/receiptApi";

interface Props {
  filter: "daily" | "weekly" | "monthly";
  selectedDate: Date;
}

const SalesSummaryChart: React.FC<Props> = React.memo(({ filter, selectedDate }) => {
  const [chartData, setChartData] = useState<
    Array<{ label: string; value: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const gradientId = useId().replace(/:/g, "");

  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      try {
        const res = await fetchSalesSummary(selectedDate, filter);
        if (res.success) {
          const data = res.data[filter] || [];
          const formatted = data
            .map((d: any) => {
              const iso = d?.formattedDate?.iso || d?.date;
              if (!iso) return null;
              const date = new Date(iso);
              const label =
                filter === "daily"
                  ? date.toLocaleTimeString("th-TH", { hour: "2-digit" })
                  : date.toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                    });
              return {
                label,
                value: Number(d?.totalSales ?? d?.netSales ?? 0) || 0,
              };
            })
            .filter(Boolean) as Array<{ label: string; value: number }>;

          setChartData(formatted);
        } else {
          setChartData([]);
        }
      } finally {
        setLoading(false);
      }
    };
    getData();
  }, [filter, selectedDate]);

  if (loading) return <p>⏳ กำลังโหลดกราฟ...</p>;
  if (!chartData.length) return <p>ไม่พบข้อมูลกราฟ</p>;

  const chartTitle =
    filter === "daily"
      ? "ยอดขายวันนี้"
      : filter === "weekly"
      ? "ยอดขายรายสัปดาห์"
      : "ยอดขายรายเดือน";

  const yTickFormatter = (value: number) =>
    `฿${Number(value).toLocaleString("th-TH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;

  const tooltipFormatter = (value: number) =>
    `฿${Number(value).toLocaleString("th-TH")}`;

  return (
    <div className="chart-container">
      <h2>{chartTitle}</h2>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData} margin={{ top: 32, left: 0, right: 0, bottom: 8 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6c5ce7" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#6c5ce7" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 12 }} />
          <YAxis
            stroke="#94a3b8"
            tickFormatter={(value: number) => yTickFormatter(value)}
            width={100}
            domain={[0, "auto"]}
          />
          <Tooltip
            formatter={(value: number) => tooltipFormatter(value)}
            labelFormatter={(label) => label}
          />
          <Legend verticalAlign="top" align="left" iconType="circle" height={24} />
          <Area
            type="monotone"
            dataKey="value"
            name="ยอดขาย (บาท)"
            stroke="#6c5ce7"
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            activeDot={{ r: 5 }}
            dot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

export default SalesSummaryChart;
