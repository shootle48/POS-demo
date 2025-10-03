import { Request, Response } from 'express';
import Receipt, { IReceipt } from '../models/Receipt';
import Stock from '../models/Stock';

interface TimeFrameData {
    totalSales: number;
    totalQuantity: number; // เพิ่มจำนวนชิ้นรวม
    growth: number;
    netSales: number;
    totalProfit: number;
    bestSeller: {
        name: string;
        quantity: number;
        revenue: number;
    };
    formattedDate?: {
        thai: string;
        iso: string;
    };
}

interface DashboardData {
    daily: TimeFrameData;
    weekly: TimeFrameData;
    monthly: TimeFrameData;
}


// Helper function to format dates consistently
function formatThaiDate(date: Date) {
    return {
        thai: date.toLocaleString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
            hour: '2-digit',
            minute: '2-digit',
        }),
        iso: date.toISOString()
    };
}

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const now = new Date();
        
        // Calculate time ranges with consistent date handling
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        today.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
        
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startOfLastMonth.setHours(0, 0, 0, 0);

        // Get data for each time frame
        const dailyStats = await getTimeFrameStats(today, yesterday);
        const weeklyStats = await getTimeFrameStats(startOfWeek, startOfLastWeek);
        const monthlyStats = await getTimeFrameStats(startOfMonth, startOfLastMonth);

        res.status(200).json({
            success: true,
            data: {
                daily: {
                    ...dailyStats,
                    formattedDate: formatThaiDate(today)
                },
                weekly: {
                    ...weeklyStats,
                    formattedDate: formatThaiDate(startOfWeek)
                },
                monthly: {
                    ...monthlyStats,
                    formattedDate: formatThaiDate(startOfMonth)
                }
            }
        });

    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล Dashboard',
            error: error instanceof Error ? error.message : error
        });
    }
};

async function getTimeFrameStats(currentStart: Date, previousStart: Date): Promise<TimeFrameData> {
    // Get current period receipts
    const currentReceipts = await Receipt.find({
        timestamp: { 
            $gte: currentStart,
            $lt: new Date(currentStart.getTime() + (currentStart.getTime() - previousStart.getTime()))
        }
    }).sort({ timestamp: 1 });

    const previousReceipts = await Receipt.find({
        timestamp: {
            $gte: previousStart,
            $lt: currentStart
        }
    }).sort({ timestamp: 1 });

    // Get all stock data for profit calculation
    const stocks = await Stock.find({}).lean();
    const stockMap = new Map(stocks.map(stock => [
        stock.barcode,
        { costPrice: stock.costPrice, salePrice: stock.salePrice }
    ]));

    // Calculate total sales and quantities
    let totalSales = 0;
    let totalQuantity = 0;
    let totalProfit = 0;
    const productSales = new Map<string, { quantity: number; revenue: number }>();

    // Process current receipts
    for (const receipt of currentReceipts) {
        totalSales += receipt.totalPrice;
        
        for (const item of receipt.items) {
            // Calculate total quantity
            totalQuantity += item.quantity;

            // Calculate profit
            const stockData = stockMap.get(item.barcode);
            if (stockData) {
                const itemProfit = (stockData.salePrice - stockData.costPrice) * item.quantity;
                totalProfit += itemProfit;
            }

            // Track product sales for best seller
            const current = productSales.get(item.name) || { quantity: 0, revenue: 0 };
            productSales.set(item.name, {
                quantity: current.quantity + item.quantity,
                revenue: current.revenue + item.subtotal
            });
        }
    }

    // Calculate previous period totals for growth calculation
    const previousTotalSales = previousReceipts.reduce((sum, receipt) => 
        sum + receipt.totalPrice, 0);

    // Calculate growth percentage
    const growth = previousTotalSales > 0 
        ? ((totalSales - previousTotalSales) / previousTotalSales) * 100 
        : 0;

    // Find best selling product
    let bestSeller = { name: '', quantity: 0, revenue: 0 };
    productSales.forEach((value, key) => {
        if (value.quantity > bestSeller.quantity) {
            bestSeller = {
                name: key,
                quantity: value.quantity,
                revenue: value.revenue
            };
        }
    });

    // Debug logs
    console.log('Stats:', {
        totalSales,
        totalQuantity,
        totalProfit,
        bestSeller
    });

    return {
        totalSales,
        totalQuantity,
        growth,
        netSales: totalSales,
        totalProfit,
        bestSeller
    };
}
