import { Request, Response } from "express";
import StockTransaction from "../models/StockTransaction";
import Stock from "../models/Stock";
import Product from "../models/Product";
import { verifyToken } from "../utils/auth";

//  สร้าง Transaction ใหม่
export const createTransaction = async (req: Request, res: Response): Promise<void> => {
    try {
        const token = req.headers["authorization"]?.split(" ")[1];
        if (!token) {
            res.status(401).json({ success: false, message: "No token provided" });
            return;
        }
        const decoded = verifyToken(token);
        if (typeof decoded === "string" || !("userId" in decoded)) {
            res.status(401).json({ success: false, message: "Invalid token" });
            return;
        }

        const { stockId, productId, type, quantity, referenceId, costPrice, salePrice, notes } = req.body;

        //  ตรวจสอบ stock
        const stock = await Stock.findById(stockId);
        if (!stock) {
            res.status(404).json({ success: false, message: "Stock not found" });
            return;
        }

        //  ตรวจสอบ product
        const product = await Product.findById(productId);
        if (!product) {
            res.status(404).json({ success: false, message: "Product not found" });
            return;
        }

        //  อัปเดตจำนวนใน Stock ตาม type
        if (type === "SALE") {
            if (stock.quantity < quantity) {
                res.status(400).json({
                    success: false,
                    message: `สินค้าในสต็อกไม่เพียงพอ (เหลือ ${stock.quantity})`,
                });
                return;
            }
            stock.quantity -= quantity;
        } else if (type === "RESTOCK" || type === "RETURN") {
            stock.quantity += quantity;
        } else if (type === "ADJUSTMENT") {
            stock.quantity = quantity; // set ใหม่ตามที่ให้มา
        }
        await stock.save();

        //  สร้าง Transaction
        const transaction = new StockTransaction({
            stockId,
            productId,
            type,
            quantity,
            referenceId,
            userId: decoded.userId,
            //  ดึงราคาจาก Stock ถ้ามี ถ้าไม่มี fallback ไปที่ Product
            costPrice: stock.costPrice ?? product.price,
            salePrice: stock.salePrice ?? product.price,
            notes,
        });

        await transaction.save();


        await transaction.save();

        res.status(201).json({ success: true, data: transaction });
    } catch (error: any) {
        console.error("Create Transaction Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

//  ดึงประวัติ Transaction ทั้งหมด
export const getAllTransactions = async (_: Request, res: Response): Promise<void> => {
    try {
        const transactions = await StockTransaction.find()
            .populate("stockId")
            .populate("productId")
            .populate("userId")
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: transactions });
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

//  ดึง Transaction ตามสินค้า
export const getTransactionsByProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const transactions = await StockTransaction.find({ productId: req.params.productId })
            .populate("stockId")
            .populate("userId")
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: transactions });
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

//  ดึง Transaction ตาม Stock
export const getTransactionsByStock = async (req: Request, res: Response): Promise<void> => {
    try {
        const transactions = await StockTransaction.find({ stockId: req.params.stockId })
            .populate("productId")
            .populate("userId")
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: transactions });
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};
