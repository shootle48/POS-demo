import { Request, Response } from 'express';
import cloudinary from '../utils/cloudinary';
import Product from '../models/Product';
import Stock from '../models/Stock';
import User from '../models/User';
import Supplier from '../models/Supplier';
import Warehouse from "../models/Warehouse";
import mongoose from "mongoose";
import { verifyToken } from "../utils/auth";

import dotenv from "dotenv";
dotenv.config();


// ✅ เพิ่มสินค้า + สต็อก
// ✅ เพิ่มสินค้า + สต็อก
export const addProductWithStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      res.status(401).json({ success: false, message: 'No token provided' });
      return;
    }

    const decoded = verifyToken(token);
    if (typeof decoded === 'string' || !('userId' in decoded)) {
      res.status(401).json({ success: false, message: 'Invalid token' });
      return;
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    cloudinary.uploader.upload_stream(
      { resource_type: 'auto' },
      async (err, result) => {
        if (err || !result) {
          console.error("❌ Cloudinary Upload Error:", err);
          return res.status(500).json({ success: false, message: 'Error uploading image' });
        }

        const {
          name,
          description,
          category,
          barcode,
          quantity,
          location,
          threshold,
          supplierId,
          units,
          costPrice,
          salePrice,
        } = req.body;

        // ✅ parse units
        let unitArray: any[] = [];
        try {
          if (typeof units === "string") unitArray = JSON.parse(units);
          else if (Array.isArray(units)) unitArray = units;
        } catch (err) {
          console.error("❌ Error parsing units:", err);
          unitArray = [];
        }

        // ✅ ราคาทุน/ขาย
        const finalCostPrice = Number(costPrice) || 0;
        const finalSalePrice = salePrice && salePrice !== ""
          ? Number(salePrice)
          : finalCostPrice * 1.2;

        // ✅ Gen barcode อัตโนมัติถ้าว่างหรือเป็น ","
        let finalBarcode: string;
        if (barcode && String(barcode).trim() !== "" && String(barcode).trim() !== ",") {
          finalBarcode = String(barcode).trim();
        } else {
          finalBarcode = `BC${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
        }

        // ✅ supplier / warehouse
        const supplierDoc = await Supplier.findById(supplierId);
        if (!supplierDoc) return res.status(400).json({ success: false, message: 'ไม่พบบริษัทผู้จัดจำหน่าย' });

        const warehouseDoc = await Warehouse.findOne({ location });
        if (!warehouseDoc) return res.status(400).json({ success: false, message: `ไม่พบคลังสินค้าที่ชื่อ "${location}"` });

        // ✅ Product
        const newProduct = new Product({
          name,
          description,
          category,
          barcode: finalBarcode,
          imageUrl: result.secure_url,
          public_id: result.public_id,
          userId: decoded.userId,
          supplierId: supplierDoc._id,
        });

        try {
          await newProduct.save();
        } catch (err: any) {
          if (err.code === 11000) {
            return res.status(400).json({ success: false, message: `❌ Barcode ซ้ำ: ${finalBarcode}` });
          }
          throw err;
        }

        // ✅ Stock
        const newStock = new Stock({
          productId: newProduct._id,
          userId: decoded.userId,
          quantity: quantity || 5,
          supplierId: supplierDoc._id,
          supplier: supplierDoc.companyName,
          location: warehouseDoc._id,
          threshold: threshold || 5,
          barcode: finalBarcode,
          costPrice: finalCostPrice,
          salePrice: finalSalePrice,
          lastPurchasePrice: finalCostPrice,
          status: "สินค้าพร้อมขาย",
          lastRestocked: quantity > 0 ? new Date() : undefined,
          units: unitArray,
        });
        await newStock.save();

        res.status(201).json({
          success: true,
          message: '✅ Product and stock created successfully',
          data: { product: newProduct, stock: newStock }
        });
      }
    ).end(req.file.buffer);

  } catch (error) {
    console.error("❌ addProductWithStock Error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ✅ อัปเดตสินค้า + สต็อก
export const updateProductWithStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      res.status(401).json({ success: false, message: 'No token provided' });
      return;
    }

    const decoded = verifyToken(token);
    if (typeof decoded === 'string' || !('userId' in decoded)) {
      res.status(401).json({ success: false, message: 'Invalid token' });
      return;
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const {
      productId: rawProductId,
      name,
      description,
      category,
      barcode,
      quantity,
      location,
      threshold,
      supplierId,
      units,
      costPrice,
      salePrice,
    } = req.body;

    const productId = String(rawProductId);
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      res.status(400).json({ success: false, message: 'Invalid productId' });
      return;
    }

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ success: false, message: 'ไม่พบสินค้า' });
      return;
    }

    const stock = await Stock.findOne({ productId: product._id });
    if (!stock) {
      res.status(404).json({ success: false, message: 'ไม่พบสต็อกของสินค้า' });
      return;
    }

    // ✅ parse barcode ให้เป็น string เสมอ
    let finalBarcode = barcode ? String(barcode) : product.barcode;
    if (!finalBarcode || finalBarcode.trim() === '') {
      finalBarcode = product.barcode || `BC${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
    }

    // ✅ parse units ให้แน่นอน
    let unitArray: any[] = [];
    try {
      if (typeof units === "string") {
        unitArray = JSON.parse(units);
      } else if (Array.isArray(units)) {
        unitArray = units;
      } else {
        unitArray = stock.units || [];
      }
    } catch (err) {
      console.error("❌ Error parsing units:", err);
      unitArray = stock.units || [];
    }

    const supplierDoc = await Supplier.findById(supplierId || product.supplierId);
    if (!supplierDoc) {
      res.status(400).json({ success: false, message: 'ไม่พบบริษัทผู้จัดจำหน่าย' });
      return;
    }

    let warehouseDoc = stock.location;
    if (location) {
      let foundWarehouse = null;
      if (mongoose.Types.ObjectId.isValid(location)) {
        foundWarehouse = await Warehouse.findById(location);
      } else {
        foundWarehouse = await Warehouse.findOne({ location });
      }
      if (!foundWarehouse) {
        res.status(400).json({ success: false, message: `ไม่พบคลังสินค้าที่ "${location}"` });
        return;
      }
      warehouseDoc = foundWarehouse._id;
    }

    const updateProductData = async (imageUrl?: string, public_id?: string) => {
      product.name = name || product.name;
      product.description = description || product.description;
      product.category = category || product.category;
      product.barcode = finalBarcode;
      product.supplierId = supplierDoc._id;

      if (imageUrl && public_id) {
        if (product.public_id) {
          await cloudinary.uploader.destroy(product.public_id);
        }
        product.imageUrl = imageUrl;
        product.public_id = public_id;
      }

      await product.save();

      // ✅ อัปเดต stock
      if (costPrice !== undefined) {
        stock.costPrice = Number(costPrice);
        stock.lastPurchasePrice = Number(costPrice);
      }
      if (salePrice !== undefined) {
        stock.salePrice = Number(salePrice);
      } else if (costPrice !== undefined) {
        stock.salePrice = Number(costPrice) * 1.2;
      }

      stock.quantity = quantity !== undefined ? Number(quantity) : stock.quantity;
      stock.threshold = threshold !== undefined ? Number(threshold) : stock.threshold;
      stock.supplierId = supplierDoc._id;
      stock.supplier = supplierDoc.companyName;
      stock.location = warehouseDoc;
      stock.units = unitArray;
      stock.barcode = product.barcode;

      if (quantity !== undefined && Number(quantity) > 0) {
        stock.lastRestocked = new Date();
      }

      await stock.save();

      res.status(200).json({
        success: true,
        message: 'Product and stock updated successfully',
        data: { product, stock },
      });
    };

    if (req.file) {
      cloudinary.uploader.upload_stream({ resource_type: 'auto' }, async (err, result) => {
        if (err || !result) {
          console.error(err);
          res.status(500).json({ success: false, message: 'Error uploading image' });
          return;
        }
        await updateProductData(result.secure_url, result.public_id);
      }).end(req.file.buffer);
    } else {
      await updateProductData();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
