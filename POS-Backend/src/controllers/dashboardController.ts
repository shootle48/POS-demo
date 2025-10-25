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
        const [dailyRaw, weeklyData, monthlyData] = await Promise.all([
            aggregateSales(startOfDay, endOfDay, "hour"),
            aggregateSales(startOfWeek, endOfWeek, "day"),
            aggregateSales(startOfMonth, endOfMonth, "day"),
        ]);

        const dailyData = fillHours(dailyRaw, startOfDay);

        // ===== สรุปยอดขาย =====
        const summary = {
            daily: makeSummary(dailyData),
            weekly: makeSummary(weeklyData),
            monthly: makeSummary(monthlyData),
        };

        // ===== รวมสินค้าขายดี =====
        const topProducts = {
            daily: getTopProducts(dailyRaw),
            weekly: getTopProducts(weeklyData),
            monthly: getTopProducts(monthlyData),
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
        };

        // ===== ช่วงก่อนหน้า =====
        const prevDayStart = new Date(startOfDay);
        prevDayStart.setDate(prevDayStart.getDate() - 1);
        const prevWeekStart = new Date(startOfWeek);
        prevWeekStart.setDate(prevWeekStart.getDate() - 7);
        const prevMonthStart = new Date(startOfMonth);
        prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);

        const prevDayData = makeSummary(
            (await aggregateSales(prevDayStart, startOfDay, "hour")) || []
        );
        const prevWeekData = makeSummary(
            (await aggregateSales(prevWeekStart, startOfWeek, "day")) || []
        );
        const prevMonthData = makeSummary(
            (await aggregateSales(prevMonthStart, startOfMonth, "day")) || []
        );

        // ===== การเปลี่ยนแปลง =====
        const changes = {
            daily: calcChange(summary.daily, prevDayData),
            weekly: calcChange(summary.weekly, prevWeekData),
            monthly: calcChange(summary.monthly, prevMonthData),
        };

        // ===== ส่งข้อมูลกลับ =====
        res.status(200).json({
            success: true,
            data: {
                daily: dailyData,
                weekly: weeklyData,
                monthly: monthlyData,
                summary,
                topProducts,
                byEmployee,
                changes: changes || { daily: {}, weekly: {}, monthly: {} },
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

// ======================= Aggregate Sales =======================
export async function aggregateSales(
    start: Date,
    end: Date,
    groupBy: "hour" | "day"
) {
    const stocks = await Stock.find({}).lean();
    const stockMap = new Map(
        stocks.map((s) => [
            s.barcode,
            { costPrice: s.costPrice || 0, salePrice: s.salePrice || 0 },
        ])
    );

    const receipts = await Receipt.aggregate([
        { $match: { timestamp: { $gte: start, $lte: end } } },
        { $unwind: "$items" },
        {
            $group: {
                _id: {
                    bucket:
                        groupBy === "hour"
                            ? {
                                hour: {
                                    $hour: { date: "$timestamp", timezone: "Asia/Bangkok" },
                                },
                            }
                            : {
                                year: {
                                    $year: { date: "$timestamp", timezone: "Asia/Bangkok" },
                                },
                                month: {
                                    $month: { date: "$timestamp", timezone: "Asia/Bangkok" },
                                },
                                day: {
                                    $dayOfMonth: {
                                        date: "$timestamp",
                                        timezone: "Asia/Bangkok",
                                    },
                                },
                            },
                    product: "$items.name",
                    barcode: "$items.barcode",
                },
                totalSales: { $sum: "$items.subtotal" },
                totalQuantity: { $sum: "$items.quantity" },
            },
        },
        {
            $group: {
                _id: "$_id.bucket",
                totalSales: { $sum: "$totalSales" },
                totalQuantity: { $sum: "$totalQuantity" },
                products: {
                    $push: {
                        name: "$_id.product",
                        barcode: "$_id.barcode",
                        quantity: "$totalQuantity",
                        revenue: "$totalSales",
                    },
                },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    return receipts.map((r) => {
        let date: Date;

        if (groupBy === "hour" && (r._id as any)?.hour !== undefined) {
            date = new Date(start);
            date.setHours((r._id as any).hour, 0, 0, 0);
        } else if (groupBy === "day" && (r._id as any)?.year) {
            const { year, month, day } = r._id as any;
            date = new Date(year, month - 1, day);
        } else {
            date = new Date();
        }

        // ✅ คำนวณกำไร
        let totalProfit = 0;
        if (Array.isArray(r.products)) {
            r.products.forEach((p: any) => {
                const stock = stockMap.get(p.barcode);
                if (stock) {
                    const profit = (stock.salePrice - stock.costPrice) * p.quantity;
                    totalProfit += profit;
                }
            });
        }

        // ✅ หาสินค้าขายดีที่สุดในแต่ละ bucket
        let bestSeller = { name: "-", quantity: 0, revenue: 0, barcode: "" };
        if (Array.isArray(r.products) && r.products.length > 0) {
            bestSeller = r.products.reduce(
                (best: any, p: any) => (p.quantity > best.quantity ? p : best),
                bestSeller
            );
        }

        return {
            totalSales: r.totalSales,
            totalQuantity: r.totalQuantity,
            netSales: r.totalSales,
            totalProfit,
            bestSeller,
            products: r.products || [],
            formattedDate: formatThaiDate(date),
            hour: (r._id as any).hour ?? null,
        };
    });
}

// ======================= Summary รวม =======================
function makeSummary(data: any[]) {
    const totalSales = data.reduce((s, d) => s + d.totalSales, 0);
    const totalQuantity = data.reduce((s, d) => s + d.totalQuantity, 0);
    const totalProfit = data.reduce((s, d) => s + d.totalProfit, 0);
    const netSales = data.reduce((s, d) => s + d.netSales, 0);
    return { totalSales, totalQuantity, totalProfit, netSales };
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
        { $match: { timestamp: { $gte: start, $lte: end } } },
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