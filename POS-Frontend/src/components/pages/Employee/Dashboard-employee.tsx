import React, { useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
} from "recharts";

import { fetchSalesSummary } from "../../../api/receipt/receiptApi";
import { getAllPayments } from "../../../api/payment/paymentApi";
import { getProducts } from "../../../api/product/productApi";

import TopProductsSlider from "../TopProductsSlider";

import "../../../styles/page/HomePage.css";
import "../../../styles/page/EmployeePage.css";

const LINE_CHART_HEIGHT = 320;
const DEFAULT_IMG = "https://cdn-icons-png.flaticon.com/512/2331/2331970.png";

const GRADIENTS = {
  purple: { id: "employeeLineGradient", from: "#6C5CE7", to: "rgba(108,92,231,0.12)" },
};

type RangeKey = "daily" | "weekly" | "monthly";

type PaymentEntry = {
  id: string;
  saleId: string;
  paymentMethod: string;
  amount: number;
  profit: number;
  employeeName: string;
  status: string;
  type: string;
  createdAt?: string;
  updatedAt?: string;
  isReturn?: boolean;
};

const sanitizeNumber = (value: any) => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const toBangkokDate = (value: Date) =>
  new Date(value.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));

const getRangeBounds = (range: RangeKey, selected: Date) => {
  const base = toBangkokDate(selected);
  if (range === "daily") {
    const start = new Date(base);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  if (range === "weekly") {
    const start = new Date(base);
    start.setHours(0, 0, 0, 0);
    const day = start.getDay();
    const diff = (day + 6) % 7;
    start.setDate(start.getDate() - diff);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }

  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  return { start, end };
};

const isDateInRange = (date: Date, range: { start: Date; end: Date }) =>
  date >= range.start && date < range.end;

const formatCurrency = (value: number) =>
  `฿${Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const formatPaymentDateTime = (stamp?: string) => {
  if (!stamp) return "-";
  const date = new Date(stamp);
  if (Number.isNaN(date.getTime())) return "-";
  const bangkokDate = toBangkokDate(date);
  return (
    bangkokDate
      .toLocaleString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace("น.", "")
      .trim() + " น."
  );
};

const describePaymentMethod = (method: string) => {
  const value = (method || "").toString().toLowerCase();
  if (value.includes("card") || value.includes("บัตร")) return "💳 บัตรเครดิต";
  if (value.includes("qr")) return "📱 QR Code";
  if (value.includes("cash") || value.includes("เงินสด")) return "💵 เงินสด";
  if (value.includes("bank") || value.includes("transfer") || value.includes("โอน")) {
    return "🏦 โอนธนาคาร";
  }
  if (value.includes("prompt") || value.includes("พร้อมเพย์")) return "📲 พร้อมเพย์";
  if (!value) return "💠 ไม่ระบุ";
  return `💠 ${method}`;
};

const describePaymentStatus = (status: string) => {
  const value = (status || "").toString().toLowerCase();
  if (value.includes("สำเร็จ") || value.includes("success")) return "✅ สำเร็จ";
  if (value.includes("ล้มเหลว") || value.includes("fail")) return "❌ ล้มเหลว";
  if (value.includes("รอดำเนินการ") || value.includes("pending")) return "⏳ รอดำเนินการ";
  if (!value) return "⏳ รอดำเนินการ";
  return status;
};

const describePaymentType = (type: string, amount: number) => {
  const normalized = (type || "").toString().trim().toUpperCase();
  if (normalized.includes("REFUND")) return "🔴 คืนเงิน";
  if (normalized.includes("SALE")) return "🟢 ขาย";
  if (normalized.includes("CANCEL")) return "⚪ ยกเลิก";
  if (normalized.includes("HOLD") || normalized.includes("PENDING")) return "⏸️ รอชำระ";
  if (!normalized) {
    if (Number(amount) < 0) return "🔴 คืนเงิน";
    if (Number(amount) === 0) return "⚪ อื่นๆ";
    return "🟢 ขาย";
  }
  return `⚪ ${type}`;
};

export default function EmployeeDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [filter] = useState<RangeKey>("weekly");
  const [selectedDate] = useState<Date>(new Date());

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        setUser(jwtDecode(token));
      } catch (error) {
        console.warn("ไม่สามารถอ่านข้อมูลผู้ใช้ได้", error);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const [salesRes, payRes, prodRes] = await Promise.all([
          fetchSalesSummary(selectedDate, filter),
          getAllPayments(),
          getProducts(),
        ]);

        if (salesRes?.success) {
          setSummaryData(salesRes.data || null);
        } else {
          setSummaryData(null);
        }

        const payRaw = Array.isArray(payRes?.data)
          ? payRes.data
          : Array.isArray(payRes)
          ? payRes
          : [];

        const paymentSanitized: PaymentEntry[] = payRaw
          .filter(Boolean)
          .map((item: any, index: number) => {
            const amount = sanitizeNumber(
              item?.amount ??
                item?.total ??
                item?.totalAmount ??
                item?.netAmount ??
                item?.grandTotal
            );
            const rawType = (
              item?.type ||
              item?.transactionType ||
              item?.paymentType ||
              item?.category ||
              ""
            )
              .toString()
              .trim();
            const normalizedType = rawType
              ? rawType.toUpperCase()
              : amount < 0
              ? "REFUND"
              : amount === 0
              ? "OTHER"
              : "SALE";

            return {
              id: String(item?._id || item?.id || item?.saleId || index),
              saleId: String(
                item?.saleId ||
                  item?.saleCode ||
                  item?.reference ||
                  item?.orderId ||
                  "-"
              ),
              paymentMethod:
                item?.paymentMethod || item?.method || item?.channel || "ไม่ระบุ",
              amount,
              profit: sanitizeNumber(
                item?.profit ?? item?.netProfit ?? item?.totalProfit ?? item?.margin
              ),
              employeeName:
                item?.employeeName ||
                item?.cashier?.name ||
                item?.employee?.name ||
                item?.user?.name ||
                item?.staffName ||
                "-",
              status: item?.status || item?.state || item?.paymentStatus || "ไม่ระบุ",
              type: normalizedType,
              createdAt:
                item?.createdAt ||
                item?.paidAt ||
                item?.paymentDate ||
                item?.timestamp,
              updatedAt:
                item?.updatedAt ||
                item?.modifiedAt ||
                item?.paymentDate ||
                item?.timestamp,
              isReturn: Boolean(
                item?.isReturn ??
                  item?.receiptId?.isReturn ??
                  item?.receipt?.isReturn ??
                  item?.sale?.isReturn
              ),
            };
          });

        setPayments(paymentSanitized);

        const prodList = Array.isArray(prodRes?.data)
          ? prodRes.data
          : Array.isArray(prodRes)
          ? prodRes
          : [];
        setProducts(prodList);
      } catch (error) {
        console.error("ไม่สามารถโหลดข้อมูลแดชบอร์ดพนักงานได้", error);
      }
    };

    load();
  }, [user, filter, selectedDate]);

  const currentRange = useMemo(
    () => getRangeBounds(filter, selectedDate),
    [filter, selectedDate]
  );
  const currentRangeKey = `${currentRange.start.getTime()}-${currentRange.end.getTime()}`;

  const imageMap = useMemo(
    () =>
      new Map(
        (products || []).map((p: any) => [
          p.productId?.barcode || p.barcode,
          p.productId?.imageUrl || p.imageUrl,
        ])
      ),
    [products]
  );

  const paymentsInRange = useMemo(
    () =>
      (payments || []).filter((p) => {
        if (p.isReturn) {
          return false;
        }
        const stamp = p?.createdAt || p?.updatedAt;
        if (!stamp) return false;
        const date = toBangkokDate(new Date(stamp));
        return isDateInRange(date, currentRange);
      }),
    [payments, currentRangeKey]
  );

  const topProductsFromApi = useMemo(() => {
    const base = summaryData?.topProducts?.[filter] || [];
    return base.slice(0, 10).map((p: any, idx: number) => ({
      name: p.name,
      barcode: p.barcode,
      imageUrl: imageMap.get(p.barcode) || DEFAULT_IMG,
      quantity: p.quantity,
      revenue: p.revenue ?? p.netRevenue ?? 0,
      rank: idx + 1,
    }));
  }, [summaryData, imageMap, filter]);

  const summaryForRange = summaryData?.summary?.[filter] || {};
  const rangeLabel =
    filter === "daily" ? "วันนี้" : filter === "weekly" ? "สัปดาห์นี้" : "เดือนนี้";
  const lineTitle =
    filter === "daily"
      ? "กราฟยอดขายวันนี้ (รายชั่วโมง)"
      : filter === "weekly"
      ? "กราฟยอดขายสัปดาห์นี้ (รายวัน)"
      : "กราฟยอดขายเดือนนี้ (รายสัปดาห์)";

  const rangeEntries = useMemo(() => {
    const raw = Array.isArray(summaryData?.[filter]) ? summaryData[filter] : [];
    return raw
      .map((entry: any, idx: number) => {
        const iso = entry?.formattedDate?.iso || entry?.date || entry?.day;
        const baseDate = iso ? toBangkokDate(new Date(iso)) : null;
        if (!baseDate) return null;
        return {
          entry,
          baseDate,
          index: idx,
          sales: Number(entry?.netSales ?? entry?.totalSales ?? entry?.sales ?? 0),
          profit: Number(entry?.totalProfit ?? entry?.profit ?? entry?.netProfit ?? 0),
          quantity: Number(
            entry?.totalQuantity ??
              entry?.quantity ??
              entry?.soldQuantity ??
              entry?.units ??
              0
          ),
        };
      })
      .filter(
        (item): item is {
          entry: any;
          baseDate: Date;
          index: number;
          sales: number;
          profit: number;
          quantity: number;
        } => !!item && isDateInRange(item.baseDate, currentRange)
      );
  }, [summaryData, filter, currentRangeKey]);

  const hasRangeEntries = rangeEntries.length > 0;

  const aggregatedTotals = useMemo(
    () =>
      rangeEntries.reduce(
        (acc, item) => {
          acc.sales += item.sales;
          acc.profit += item.profit;
          acc.quantity += item.quantity;
          return acc;
        },
        { sales: 0, profit: 0, quantity: 0 }
      ),
    [rangeEntries]
  );

  const lineChartData = useMemo(() => {
    return rangeEntries
      .map((item) => {
        let label: string;
        let sortValue: number;
        if (filter === "daily") {
          const hour =
            typeof item.entry?.hour === "number"
              ? item.entry.hour
              : item.baseDate.getHours();
          label = `${String(hour).padStart(2, "0")}:00`;
          const marker = new Date(item.baseDate);
          marker.setHours(hour, 0, 0, 0);
          sortValue = marker.getTime();
        } else if (filter === "weekly") {
          label = item.baseDate.toLocaleDateString("th-TH", {
            day: "2-digit",
            month: "short",
          });
          sortValue = item.baseDate.getTime();
        } else {
          label =
            item.entry?.weekLabel ||
            item.entry?.label ||
            item.baseDate.toLocaleDateString("th-TH", {
              day: "2-digit",
              month: "short",
            });
          sortValue = item.entry?.weekIndex ?? item.index ?? item.baseDate.getTime();
        }
        return { label, value: item.sales, sortValue };
      })
      .sort((a, b) => a.sortValue - b.sortValue)
      .map((item) => ({ label: item.label, value: item.value }));
  }, [rangeEntries, filter]);

  const netSalesTotal = hasRangeEntries
    ? aggregatedTotals.sales
    : Number(summaryForRange?.netSales ?? summaryForRange?.totalSales ?? 0);
  const quantityTotal = hasRangeEntries
    ? aggregatedTotals.quantity
    : Number(summaryForRange?.totalQuantity ?? summaryForRange?.quantity ?? 0);

  if (loading) {
    return <div style={{ textAlign: "center", padding: 50 }}>⏳ กำลังตรวจสอบผู้ใช้...</div>;
  }

  if (!user) {
    return (
      <div style={{ textAlign: "center", padding: 50 }}>
        🔐 กรุณาเข้าสู่ระบบเพื่อดูแดชบอร์ดพนักงาน
      </div>
    );
  }

  if (!summaryData) {
    return <div style={{ textAlign: "center", padding: 50 }}>⏳ กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="display employee-display">
      <div className="employee-dashboard-shell">
        <div className="employee-dashboard-card">
          <div className="employee-grid">
            <section className="card-like employee-area-top5">
              <h2 className="section-title">สินค้าขายดี (Top 5)</h2>
              <TopProductsSlider
                items={topProductsFromApi.slice(0, 5)}
                emptyMessage="ยังไม่มีการขายสินค้าในช่วงนี้"
              />
            </section>

            <section className="card-like employee-area-receipt">
              <h2 className="section-title">{lineTitle}</h2>
              <div className="employee-chart-rect">
                {lineChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={LINE_CHART_HEIGHT}>
                    <LineChart
                      data={lineChartData}
                      margin={{ top: 20, right: 24, bottom: 28, left: 12 }}
                    >
                      <defs>
                        <linearGradient
                          id={GRADIENTS.purple.id}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={GRADIENTS.purple.from}
                            stopOpacity={0.9}
                          />
                          <stop
                            offset="100%"
                            stopColor={GRADIENTS.purple.to}
                            stopOpacity={0.4}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip formatter={(v: number) => formatCurrency(Number(v))} />
                      <Line type="monotone" dataKey="value" stroke="#6C5CE7" strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="value" stroke="none" fill="url(#employeeLineGradient)" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="employee-chart-empty">ยังไม่มีข้อมูลการขายในช่วงนี้</div>
                )}
              </div>
            </section>

            <div className="card-like kpi employee-area-kpi1">
              <div className="kpi-head">ยอดขายสุทธิ ({rangeLabel})</div>
              <div className="kpi-val">{formatCurrency(netSalesTotal)}</div>
            </div>

            <div className="card-like kpi employee-area-kpi2">
              <div className="kpi-head">จำนวนที่ขาย ({rangeLabel})</div>
              <div className="kpi-val">{Number(quantityTotal).toLocaleString()} ชิ้น</div>
            </div>

            <section className="card-like employee-area-payment">
              <h2 className="section-title">ประวัติการขาย {rangeLabel}</h2>
              <div className="table-scroll tall">
                <table className="nice-table payment-table employee-payment-table">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>ลำดับ</th>
                      <th>รหัสขาย</th>
                      <th>พนักงาน</th>
                      <th>ประเภท</th>
                      <th>วิธีชำระ</th>
                      <th style={{ textAlign: "right" }}>ยอดชำระ</th>
                      <th>สถานะ</th>
                      <th>วันที่</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsInRange.map((p, idx) => {
                      const stamp = p.createdAt || p.updatedAt;
                      const amountValue = Number(p.amount ?? 0);
                      const amountColor =
                        amountValue < 0 ? "#dc2626" : amountValue === 0 ? "#1f2937" : "#047857";
                      return (
                        <tr key={`${p.id}-${idx}`}>
                          <td>{idx + 1}</td>
                          <td>{p.saleId}</td>
                          <td>{p.employeeName}</td>
                          <td className="type-cell">{describePaymentType(p.type, amountValue)}</td>
                          <td>{describePaymentMethod(p.paymentMethod)}</td>
                          <td
                            style={{
                              textAlign: "right",
                              fontWeight: 600,
                              color: amountColor,
                            }}
                          >
                            {formatCurrency(amountValue)}
                          </td>
                          <td className="status-cell">{describePaymentStatus(p.status)}</td>
                          <td>{formatPaymentDateTime(stamp)}</td>
                        </tr>
                      );
                    })}
                    {paymentsInRange.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", color: "#6b7280" }}>
                          ยังไม่มีการขายสินค้าในช่วงนี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
