import { Request, Response } from "express";
import User from "../models/User";
import Employee from "../models/Employee";
import Stock from "../models/Stock";
import Product from "../models/Product";
import StockTransaction from "../models/StockTransaction";
import Supplier from "../models/Supplier";
import StockLot from "../models/StockLot";

import { verifyToken } from "../utils/auth";
import Warehouse from "../models/Warehouse";

//หาค่า ownerId จาก userId (รองรับ admin / employee)
const getOwnerId = async (userId: string): Promise<string> => {
  let user = await User.findById(userId);
  if (!user) {
    user = await Employee.findById(userId);
  }
  if (!user) throw new Error("User not found");

  if (user.role === "admin") {
    return user._id.toString();
  } else if (user.role === "employee") {
    if (!user.adminId) throw new Error("Employee does not have admin assigned");
    return user.adminId.toString();
  } else {
    throw new Error("Invalid user role");
  }
};
export const getStockByProductId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;

    if (!productId) {
      res.status(400).json({ success: false, message: "กรุณาระบุ productId" });
      return;
    }

    // ✅ ค้นหา stock ที่ผูกกับ productId นี้
    const stock = await Stock.findOne({ productId })
      .populate({
        path: "productId",
        select: "name barcode description",
      })
      .populate({
        path: "location",
        model: Warehouse,
        select: "name code",
      })
      .populate({
        path: "supplierId",
        select: "companyName",
      })
      .lean();

    if (!stock) {
      res.status(404).json({ success: false, message: "ไม่พบข้อมูลคลังของสินค้านี้" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "ดึงข้อมูลคลังสินค้าสำเร็จ ✅",
      data: stock,
    });
  } catch (error) {
    console.error("❌ Error in getStockByProductId:", error);
    res.status(500).json({ success: false, message: "Server error while fetching stock data" });
  }
};

/* =========================================================
   📦 ดึง Stock ทั้งหมด (รวม StockLots และสถานะวันหมดอายุละเอียด)
========================================================= */
export const getStocks = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token) {
      res.status(401).json({ success: false, message: "Unauthorized, no token provided" });
      return;
    }

    const decoded = verifyToken(token);
    if (typeof decoded === "string" || !("userId" in decoded)) {
      res.status(401).json({ success: false, message: "Invalid token" });
      return;
    }

    const ownerId = await getOwnerId((decoded as any).userId);

    // ✅ ดึง stocks ทั้งหมด
    const stocks = await Stock.find({ userId: ownerId })
      .populate({
        path: "productId",
        populate: { path: "category" },
      })
      .populate("supplierId")
      .populate("location")
      .lean();

    // ✅ ดึง stocklots ของ user เดียวกันทั้งหมด (เฉพาะที่ active)
    const lots = await StockLot.find({
      userId: ownerId,
      isActive: true,
    })
      .select("stockId batchNumber productId expiryDate quantity qcStatus isActive isClosed expiryStatus remainingQty")
      .lean();

    const now = new Date();

    // ✅ รวมข้อมูล: เพิ่ม field lots + expiryDate + expiryStatus
    const stockWithLots = stocks.map((stock) => {
      const relatedLots = lots.filter(
        (lot) => String(lot.stockId) === String(stock._id)
      );

      // 🧮 หาวันหมดอายุที่ใกล้สุด
      let nearestExpiry: Date | null = null;
      if (relatedLots.length > 0) {
        const expiries = relatedLots
          .filter((l) => l.expiryDate)
          .map((l) => new Date(l.expiryDate!))
          .sort((a, b) => a.getTime() - b.getTime());
        nearestExpiry = expiries[0] || null;
      }

      // 🧮 จำแนกล็อตตามวันหมดอายุ
      const expiredLots = relatedLots.filter(
        (l) => l.expiryDate && new Date(l.expiryDate) < now
      );
      const nearExpiryLots = relatedLots.filter((l) => {
        if (!l.expiryDate) return false;
        const exp = new Date(l.expiryDate);
        const diffDays = Math.ceil(
          (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return diffDays >= 0 && diffDays <= 10;
      });

      // ✅ กำหนดสถานะรวมละเอียด 5 ระดับ
      let expiryStatus:
        | "ปกติ"
        | "ใกล้หมดอายุบางล็อต"
        | "ใกล้หมดอายุทั้งหมด"
        | "หมดอายุบางล็อต"
        | "หมดอายุทั้งหมด" = "ปกติ";

      if (relatedLots.length > 0) {
        if (expiredLots.length === relatedLots.length) {
          expiryStatus = "หมดอายุทั้งหมด";
        } else if (expiredLots.length > 0) {
          expiryStatus = "หมดอายุบางล็อต";
        } else if (nearExpiryLots.length === relatedLots.length) {
          expiryStatus = "ใกล้หมดอายุทั้งหมด";
        } else if (nearExpiryLots.length > 0) {
          expiryStatus = "ใกล้หมดอายุบางล็อต";
        }
      }

      return {
        ...stock,
        lots: relatedLots,
        expiryDate: nearestExpiry ? nearestExpiry.toISOString() : null,
        expiryStatus,
        expiredLotsCount: expiredLots.length,
        nearExpiryLotsCount: nearExpiryLots.length,
      };
    });

    res.status(200).json({
      success: true,
      message: "✅ ดึงข้อมูล stock พร้อม lot และสถานะวันหมดอายุสำเร็จ",
      data: stockWithLots,
    });
  } catch (error) {
    console.error("❌ Get Stocks Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching stocks",
    });
  }
};


//ดึง stock ตาม barcode
export const getStockByBarcode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { barcode } = req.params;
    const stock = await Stock.findOne({ barcode }).populate("productId");

    if (!stock) {
      res.status(404).json({ success: false, message: "Stock not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        barcode: stock.barcode,
        stockQuantity: stock.quantity,
        product: stock.productId,
      },
    });
  } catch (error) {
    console.error("Get Stock By Barcode Error:", error);
    res.status(500).json({ success: false, message: "Server error while fetching stock" });
  }
};

export const updateStock = async (req: Request, res: Response): Promise<void> => {
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

    const { barcode } = req.params;
    const {
      quantity,
      supplier,
      location,
      purchaseOrderId,
      threshold,
      status,
      notes,
      costPrice,
      salePrice,
      lastPurchasePrice,
      batchNumber,
      expiryDate,
      isActive,
    } = req.body;

    const stock = await Stock.findOne({ barcode });
    if (!stock) {
      res
        .status(404)
        .json({ success: false, message: "Stock not found with this barcode" });
      return;
    }

    const oldQuantity = stock.quantity;

    // ตรวจ supplier ก่อนอนุญาตให้แก้จำนวน
    let currentSupplier = "";

    // ✅ ถ้ามาจาก body (frontend ส่งมา) ใช้อันนี้ก่อน
    if (req.body?.supplier) {
      currentSupplier = req.body.supplier.toString().trim().toLowerCase();
    }
    // ถ้าใน stock เป็น object (populate แล้ว)
    else if (
      stock.supplier &&
      typeof stock.supplier === "object" &&
      "companyName" in stock.supplier
    ) {
      currentSupplier = stock.supplier.companyName.trim().toLowerCase();
    }
    // ถ้าใน stock เป็น ObjectId → ดึง supplier จาก DB
    else if (typeof stock.supplier === "object") {
      const supplierDoc = await Supplier.findById(stock.supplier).lean();
      currentSupplier = supplierDoc?.companyName?.trim().toLowerCase() || "";
    }

    const isOtherSupplier =
      ["อื่นๆ", "อื่น ๆ", "other"].includes(currentSupplier);

    if (quantity !== undefined) {
      if (!isOtherSupplier) {
        res.status(403).json({
          success: false,
          message:
            "❌ ไม่สามารถแก้ไขจำนวนสินค้าได้ เนื่องจากเป็นสินค้าของ Supplier ภายนอก",
        });
        return;
      }

      const parsedQuantity = Number(quantity);
      if (isNaN(parsedQuantity) || parsedQuantity < 0) {
        res
          .status(400)
          .json({ success: false, message: "Quantity must be non-negative number" });
        return;
      }

      stock.quantity = parsedQuantity;

      if (parsedQuantity !== oldQuantity) {
        const adjustmentTransaction = new StockTransaction({
          stockId: stock._id,
          productId: stock.productId,
          type: "ADJUSTMENT",
          quantity: parsedQuantity,
          referenceId: purchaseOrderId,
          userId: decoded.userId,
          notes: notes || `ปรับปรุงสต็อกจาก ${oldQuantity} → ${parsedQuantity}`,
          source: "SELF",
        });
        await adjustmentTransaction.save();
      }
    }

    // ✅ อัปเดต field อื่น ๆ
    if (supplier !== undefined) stock.supplier = supplier;
    if (location !== undefined) stock.location = location;
    if (threshold !== undefined) stock.threshold = threshold;
    if (status !== undefined) stock.status = status;
    if (notes !== undefined) stock.notes = notes;
    if (isActive !== undefined) stock.isActive = Boolean(isActive);

    if (costPrice !== undefined) stock.costPrice = Number(costPrice);
    if (salePrice !== undefined) stock.salePrice = Number(salePrice);
    if (lastPurchasePrice !== undefined)
      stock.lastPurchasePrice = Number(lastPurchasePrice);

    if (batchNumber !== undefined) stock.batchNumber = batchNumber;
    if (expiryDate !== undefined) stock.expiryDate = new Date(expiryDate);

    // ✅ อัปเดตวันที่ restock ถ้ามีการเพิ่มจำนวน
    if (quantity !== undefined && Number(quantity) > 0) {
      stock.lastRestocked = new Date();
    }

    // ✅ ใช้ totalQuantity แทน quantity
    if (stock.totalQuantity <= 0) {
      stock.status = "สินค้าหมด";
    } else if (stock.totalQuantity <= stock.threshold) {
      stock.status = "สินค้าเหลือน้อย";
    } else {
      stock.status = "สินค้าพร้อมขาย";
    }

    await stock.save();

    res.status(200).json({
      success: true,
      message: "อัปเดตข้อมูลสต็อกสำเร็จ ✅",
      data: stock,
    });
  } catch (error) {
    console.error("❌ Update Stock Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error while updating stock" });
  }
};



// คืนสินค้า
export const returnProductByBarcode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { barcode } = req.params;
    const { quantity, userId, orderId } = req.body;

    const stock = await Stock.findOne({ barcode });
    if (!stock) {
      res.status(404).json({ success: false, message: "Stock not found" });
      return;
    }

    stock.quantity += quantity;
    await stock.updateStatus();
    await stock.save();

    await StockTransaction.create({
      stockId: stock._id,
      productId: stock.productId,
      type: "RETURN",
      quantity,
      referenceId: orderId,
      userId,
      notes: "คืนสินค้า",
    });

    res.status(200).json({ success: true, message: "คืนสินค้าสำเร็จ", data: stock });
  } catch (error) {
    console.error("Return Product Error:", error);
    res.status(500).json({ success: false, message: "Server error while returning product" });
  }
};


//ลบ Stock (พร้อมลบ Product ที่ผูก)
export const deleteStockByBarcode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { barcode } = req.params;

    const deletedStock = await Stock.findOneAndDelete({ barcode });
    if (!deletedStock) {
      res.status(404).json({ success: false, message: "Stock not found with this barcode" });
      return;
    }

    const deletedProduct = await Product.findOneAndDelete({ barcode });

    res.status(200).json({
      success: true,
      message: "Stock deleted successfully",
      productDeleted: !!deletedProduct,
    });
  } catch (error) {
    console.error("Delete Stock Error:", error);
    res.status(500).json({ success: false, message: "Server error while deleting stock and product" });
  }
};