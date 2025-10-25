import { Request, Response } from "express";
import Receipt from "../models/Receipt";
import Stock from "../models/Stock";

// ======================= Helper Functions =======================

// ✅ แปลงวันที่ให้อยู่ในรูปแบบไทย + ISO
function formatThaiDate(date: Date) {
    return {
        thai: date.toLocaleString("th-TH", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
            hour: "2-digit",
            minute: "2-digit",
        }),
        iso: date.toISOString(),
    };
}

// ✅ เติมข้อมูลชั่วโมงที่ไม่มียอดขาย (ให้เป็น 0)
function fillHours(data: any[], start: Date) {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return hours.map((h) => {
        const found = data.find((d) => d.hour === h);
        const date = new Date(start);
        date.setHours(h, 0, 0, 0);
        return {
            hour: h,
            totalSales: found?.totalSales || 0,
            totalQuantity: found?.totalQuantity || 0,
            netSales: found?.netSales || 0,
            totalProfit: found?.totalProfit || 0,
            bestSeller: found?.bestSeller || { name: "-", quantity: 0, revenue: 0 },
            formattedDate: formatThaiDate(date),
        };
    });
}

// ======================= Main Controller =======================
export const getDashboardStats = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        // ✅ แปลงวันที่จาก query โดยไม่บวก offset ซ้ำ
        const inputDate = req.query.date
            ? new Date(req.query.date as string)
            : new Date();
        const filter = (req.query.filter as string) || "daily";

        // ✅ แปลงเป็นเวลาไทย (โดยไม่ขยับวัน)
        const localDate = new Date(
            new Date(inputDate).toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
        );

        // ===== กำหนดช่วงเวลา =====
        const startOfDay = new Date(localDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(localDate);
        endOfDay.setHours(23, 59, 59, 999);

        const startOfWeek = new Date(localDate);
        startOfWeek.setDate(localDate.getDate() - localDate.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const startOfMonth = new Date(
            localDate.getFullYear(),
            localDate.getMonth(),
            1
        );
        const endOfMonth = new Date(
            localDate.getFullYear(),
            localDate.getMonth() + 1,
            0,
            23,
            59,
            59,
            999
        );

        // ===== ดึงข้อมูลยอดขายหลัก =====
        const startOfYear = new Date(localDate.getFullYear(), 0, 1);
        const endOfYear = new Date(
            localDate.getFullYear(),
            11,
            31,
            23,
            59,
            59,
            999
        );

        const [dailyRaw, weeklyData, monthlyData, yearlyData] = await Promise.all([
            aggregateSales(startOfDay, endOfDay, "hour"),
            aggregateSales(startOfWeek, endOfWeek, "day"),
            aggregateSales(startOfMonth, endOfMonth, "day"),
            aggregateSales(startOfYear, endOfYear, "month"),
        ]);

        const dailyData = fillHours(dailyRaw, startOfDay);

        // ===== สรุปยอดขาย =====
        const summary = {
            daily: makeSummary(dailyData),
            weekly: makeSummary(weeklyData),
            monthly: makeSummary(monthlyData),
            yearly: makeSummary(yearlyData),
        };

        // ===== รวมสินค้าขายดี =====
        const topProducts = {
            daily: getTopProducts(dailyRaw),
            weekly: getTopProducts(weeklyData),
            monthly: getTopProducts(monthlyData),
            yearly: getTopProducts(yearlyData),
        };

        // ✅ แทรกสินค้าขายดีของวันในแต่ละชั่วโมง
        if (topProducts.daily.length > 0) {
            const top = topProducts.daily[0];
            dailyData.forEach((d) => {
                d.bestSeller = {
                    name: top.name,
                    barcode: top.barcode,
                    quantity: top.quantity,
                    revenue: top.revenue,
                };
            });
        }

        // ===== ยอดขายแยกตามพนักงาน =====
        const byEmployee = {
            daily: await aggregateByEmployee(startOfDay, endOfDay),
            weekly: await aggregateByEmployee(startOfWeek, endOfWeek),
            monthly: await aggregateByEmployee(startOfMonth, endOfMonth),
            yearly: await aggregateByEmployee(startOfYear, endOfYear),
        };

        // ===== ช่วงก่อนหน้า =====
        const prevDayStart = new Date(startOfDay);
        prevDayStart.setDate(prevDayStart.getDate() - 1);
        const prevWeekStart = new Date(startOfWeek);
        prevWeekStart.setDate(prevWeekStart.getDate() - 7);
        const prevMonthStart = new Date(startOfMonth);
        prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
        const prevYearStart = new Date(startOfYear);
        prevYearStart.setFullYear(prevYearStart.getFullYear() - 1);
        const prevYearEnd = new Date(startOfYear);
        prevYearEnd.setMilliseconds(prevYearEnd.getMilliseconds() - 1);

        const prevDayData = makeSummary(
            (await aggregateSales(prevDayStart, startOfDay, "hour")) || []
        );
        const prevWeekData = makeSummary(
            (await aggregateSales(prevWeekStart, startOfWeek, "day")) || []
        );
        const prevMonthData = makeSummary(
            (await aggregateSales(prevMonthStart, startOfMonth, "day")) || []
        );
        const prevYearData = makeSummary(
            (await aggregateSales(prevYearStart, prevYearEnd, "month")) || []
        );

        // ===== การเปลี่ยนแปลง =====
        const changes = {
            daily: calcChange(summary.daily, prevDayData),
            weekly: calcChange(summary.weekly, prevWeekData),
            monthly: calcChange(summary.monthly, prevMonthData),
            yearly: calcChange(summary.yearly, prevYearData),
        };

        // ===== ส่งข้อมูลกลับ =====
        res.status(200).json({
            success: true,
            data: {
                daily: dailyData,
                weekly: weeklyData,
                monthly: monthlyData,
                yearly: yearlyData,
                summary,
                topProducts,
                byEmployee,
                changes:
                    changes || {
                        daily: {},
                        weekly: {},
                        monthly: {},
                        yearly: {},
                    },
            },
        });
    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).json({
            success: false,
            message: "เกิดข้อผิดพลาดในการดึงข้อมูล Dashboard",
        });
    }
};

// ======================= Aggregate Sales (ตามบิลสุทธิ-ต้นทุน) =======================
export async function aggregateSales(
  start: Date,
  end: Date,
  groupBy: "hour" | "day" | "month"
) {
  // ดึงราคาทุนล่าสุดจากสต็อกไว้เป็น fallback
  const stocks = await Stock.find({}).lean();
  const stockMap = new Map(
    stocks.map((s) => [
      s.barcode,
      { costPrice: Number(s.costPrice || 0), salePrice: Number(s.salePrice || 0) },
    ])
  );

  // ดึงใบเสร็จทั้งช่วง (ไม่ unwind) เพื่อคำนวณสุทธิ/กำไรต่อบิล
  const receipts = await Receipt.find({
    timestamp: { $gte: start, $lte: end },
  }).lean();

  type BucketKey =
    | { hour: number }
    | { year: number; month: number; day: number }
    | { year: number; month: number };

  // เก็บรวมเป็น bucket ตามชั่วโมง/รายวัน
  const buckets = new Map<
    string,
    {
      key: BucketKey;
      totalSales: number;     // ผลรวม subtotal ของรายการ (หลังส่วนลดรายรายการ)
      netSales: number;       // ยอดสุทธิ totalPrice ของบิล
      totalQuantity: number;  // จำนวนชิ้นรวม
      totalProfit: number;    // (totalPrice - ต้นทุนรวม) (คูณ -1 ถ้าเป็นใบคืน)
      products: Map<string, { name: string; barcode: string; quantity: number; revenue: number }>;
    }
  >();

  const makeKey = (d: Date): { key: BucketKey; str: string } => {
    const loc = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    if (groupBy === "hour") {
      const hour = loc.getHours();
      return { key: { hour }, str: `h:${hour}` };
    }
    if (groupBy === "month") {
      const year = loc.getFullYear();
      const month = loc.getMonth() + 1;
      return { key: { year, month }, str: `m:${year}-${month}` };
    }
    return {
      key: { year: loc.getFullYear(), month: loc.getMonth() + 1, day: loc.getDate() },
      str: `d:${loc.getFullYear()}-${loc.getMonth() + 1}-${loc.getDate()}`,
    };
  };

  for (const r of receipts) {
    if (r.isReturn) {
      continue;
    }
    const { key, str } = makeKey(r.timestamp as Date);
    if (!buckets.has(str)) {
      buckets.set(str, {
        key,
        totalSales: 0,
        netSales: 0,
        totalQuantity: 0,
        totalProfit: 0,
        products: new Map(),
      });
    }
    const b = buckets.get(str)!;

    const sign = r.isReturn ? -1 : 1;

    // รวม subtotal/qty ต่อบิล และคำนวณต้นทุนรวม
    let billSubtotal = 0;
    let billQty = 0;
    let billCost = 0;

    for (const it of r.items || []) {
      const qty = Number(it.quantity || 0);
      const subtotal = Number(it.subtotal || 0); // มักเป็นราคา net หลังส่วนลดรายรายการ
      billSubtotal += subtotal;
      billQty += qty;

      const itemCost =
        it.costPrice != null
          ? Number(it.costPrice)
          : Number(stockMap.get(it.barcode)?.costPrice || 0);
      billCost += itemCost * qty;

      // สะสมสินค้าเพื่อ top products ของ bucket
      const pKey = it.barcode || it.name;
      if (!b.products.has(pKey)) {
        b.products.set(pKey, {
          name: it.name,
          barcode: it.barcode || "-",
          quantity: 0,
          revenue: 0,
        });
      }
      const p = b.products.get(pKey)!;
      p.quantity += qty * sign;
      p.revenue += subtotal * sign;
    }

    const billNet = Number(r.totalPrice || 0); // ✅ ยอดสุทธิของใบเสร็จ
    const billProfit = (billNet - billCost) * sign;

    b.totalSales += billSubtotal * sign;
    b.netSales += billNet * sign;
    b.totalQuantity += billQty * sign;
    b.totalProfit += billProfit;
  }

  // เรียงตามคีย์และคืนรูปแบบเดิม + ข้อมูลวันที่
  const output = Array.from(buckets.values())
    .sort((a, b) => (JSON.stringify(a.key) < JSON.stringify(b.key) ? -1 : 1))
    .map((b) => {
      let date: Date;
      if ("hour" in b.key) {
        date = new Date(start);
        date.setHours(b.key.hour, 0, 0, 0);
      } else if ("day" in b.key) {
        const { year, month, day } = b.key;
        date = new Date(year, month - 1, day);
      } else {
        const { year, month } = b.key;
        date = new Date(year, month - 1, 1);
      }

      // best seller ใน bucket
      const prodArr = Array.from(b.products.values());
      const bestSeller =
        prodArr.length > 0
          ? prodArr.reduce((best, p) => (p.quantity > best.quantity ? p : best), prodArr[0])
          : { name: "-", quantity: 0, revenue: 0, barcode: "" };

      return {
        totalSales: b.totalSales,
        totalQuantity: b.totalQuantity,
        netSales: b.netSales,        // ✅ ยอดสุทธิรวม
        totalProfit: b.totalProfit,  // ✅ กำไรรวม (ตามนิยามใหม่)
        bestSeller,
        products: prodArr,
        formattedDate: formatThaiDate(date),
        hour: "hour" in b.key ? b.key.hour : null,
      };
    });

  return output;
}

// ======================= Summary รวม =======================
function makeSummary(data: any[]) {
  const totalSales = data.reduce((s, d) => s + Number(d.totalSales || 0), 0);
  const netSales = data.reduce((s, d) => s + Number(d.netSales || 0), 0);
  const totalQuantity = data.reduce((s, d) => s + Number(d.totalQuantity || 0), 0);
  const totalProfit = data.reduce((s, d) => s + Number(d.totalProfit || 0), 0);
  return { totalSales, netSales, totalQuantity, totalProfit };
}


// ===== คำนวณการเปลี่ยนแปลงจากช่วงก่อนหน้า =====
function calcChange(current: any, previous: any) {
    const getPercent = (cur: number, prev: number) =>
        prev === 0 ? 0 : ((cur - prev) / prev) * 100;

    return {
        totalSalesChange: getPercent(current.totalSales, previous.totalSales),
        totalProfitChange: getPercent(current.totalProfit, previous.totalProfit),
        totalQuantityChange: getPercent(
            current.totalQuantity,
            previous.totalQuantity
        ),
    };
}

// ======================= Top Products =======================
function getTopProducts(data: any[]) {
    const productMap: Record<string, any> = {};

    // ✅ รวมสินค้าทั้งหมดจากทุก bucket (ทุกชั่วโมง/ทุกวัน)
    data.forEach((bucket) => {
        if (!Array.isArray(bucket.products)) return;

        bucket.products.forEach((product: any) => {
            const key = product.barcode || product.name;
            if (!productMap[key]) {
                productMap[key] = {
                    name: product.name,
                    barcode: product.barcode || "-",
                    quantity: product.quantity,
                    revenue: product.revenue,
                };
            } else {
                // รวมยอดขายสินค้าซ้ำ
                productMap[key].quantity += product.quantity;
                productMap[key].revenue += product.revenue;
            }
        });
    });

    // ✅ แปลงเป็น array และเรียงลำดับตามยอดขาย
    const mergedProducts = Object.values(productMap)
        .sort((a: any, b: any) => b.quantity - a.quantity)
        .slice(0, 5);

    // ✅ คืนค่ารายการ top 5
    return mergedProducts.length > 0
        ? mergedProducts
        : [{ name: "-", quantity: 0, revenue: 0 }];
}

// ======================= By Employee =======================
async function aggregateByEmployee(start: Date, end: Date) {
    const receipts = await Receipt.aggregate([
        { $match: { timestamp: { $gte: start, $lte: end }, isReturn: { $ne: true } } },
        {
            $group: {
                _id: "$employeeName",
                totalSales: { $sum: "$totalPrice" },
                count: { $sum: 1 },
            },
        },
        { $sort: { totalSales: -1 } },
    ]);

    return receipts.map((r) => ({
        employee: r._id,
        totalSales: r.totalSales,
        count: r.count,
    }));
}