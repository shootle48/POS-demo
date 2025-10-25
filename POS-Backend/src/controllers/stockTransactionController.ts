import { Response } from "express";
import StockTransaction from "../models/StockTransaction";
import Stock from "../models/Stock";
import Product from "../models/Product";
import { AuthRequest } from "../middlewares/authMiddleware";
import { resolveOwnerContext } from "../utils/tenant";

// 🧩 สร้าง Transaction ใหม่ (ขาย / รับเข้า / คืน / ปรับยอด)
export const createTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const { ownerObjectId } = await resolveOwnerContext(req);

        const { stockId, stockLotId, productId, qcReference, source, type, quantity, referenceId, costPrice, salePrice, notes } =
            req.body;

        // ✅ ตรวจสอบ stock
        const stock = await Stock.findOne({ _id: stockId, userId: ownerObjectId });
        if (!stock) {
            res.status(404).json({ success: false, message: "Stock not found" });
            return;
        }

        // ✅ ตรวจสอบ product
        const product = await Product.findOne({ _id: productId, userId: ownerObjectId });
        if (!product) {
            res.status(404).json({ success: false, message: "Product not found" });
            return;
        }

        // ✅ ปรับจำนวนตามประเภท transaction
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
            stock.quantity = quantity;
        }

        // ✅ ประเมินสถานะสินค้าใหม่แบบ real-time
        if (stock.quantity <= 0) {
            stock.status = "สินค้าหมด";
        } else if (stock.quantity <= stock.threshold) {
            stock.status = "สินค้าเหลือน้อย";
        } else {
            stock.status = "สินค้าพร้อมขาย";
        }

        await stock.save();

        const transaction = new StockTransaction({
            stockId,
            stockLotId, // ✅ เพิ่มตรงนี้
            productId,
            type,
            quantity,
            referenceId,
            qcReference,
            userId: req.userId,
            costPrice: costPrice ?? stock.costPrice ?? product.price,
            salePrice: salePrice ?? stock.salePrice ?? product.price,
            source: source || "SELF",
            notes,
        });

        await transaction.save();

        res.status(201).json({
            success: true,
            message: "สร้าง Transaction สำเร็จ และอัปเดตสถานะสินค้าเรียบร้อย ✅",
            data: {
                transaction,
                updatedStock: stock,
            },
        });
    } catch (error: any) {
        console.error("❌ Create Transaction Error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while creating transaction",
            error,
        });
    }
};

//  ดึงประวัติ Transaction ทั้งหมด
export const getAllTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { ownerObjectId } = await resolveOwnerContext(req);

        const stockIds = await Stock.find({ userId: ownerObjectId }).distinct("_id");

        if (!stockIds.length) {
            res.status(200).json({ success: true, data: [] });
            return;
        }

        const transactions = await StockTransaction.find({ stockId: { $in: stockIds } })
            .populate({
                path: "stockId",
                populate: { path: "location", model: "Warehouse" },
            })
            .populate("productId")
            .populate("userId")
            .populate("stockLotId") // ✅ แสดงข้อมูลล็อต
            .populate("qcReference")
            .sort({ createdAt: -1 });


        res.status(200).json({ success: true, data: transactions });
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};


//  ดึง Transaction ตามสินค้า
export const getTransactionsByProduct = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { ownerObjectId } = await resolveOwnerContext(req);

        const product = await Product.findOne({ _id: req.params.productId, userId: ownerObjectId });
        if (!product) {
            res.status(404).json({ success: false, message: "Product not found" });
            return;
        }

        const stockIds = await Stock.find({ userId: ownerObjectId }).distinct("_id");

        const transactions = await StockTransaction.find({
            productId: product._id,
            stockId: { $in: stockIds },
        })
            .populate("stockId")
            .populate("userId")
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: transactions });
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

//  ดึง Transaction ตาม Stock
export const getTransactionsByStock = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { ownerObjectId } = await resolveOwnerContext(req);

        const stock = await Stock.findOne({ _id: req.params.stockId, userId: ownerObjectId });
        if (!stock) {
            res.status(404).json({ success: false, message: "Stock not found" });
            return;
        }

        const transactions = await StockTransaction.find({ stockId: stock._id })
            .populate("productId")
            .populate("userId")
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: transactions });
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

