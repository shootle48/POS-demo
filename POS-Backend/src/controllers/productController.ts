import { Request, Response } from "express";
import mongoose from "mongoose";
import Product from "../models/Product";
import Category from "../models/Category";
import Stock from "../models/Stock";
import StockLot from "../models/StockLot";
import User from "../models/User";
import Employee from "../models/Employee";
import { verifyToken } from "../utils/auth";

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type PlainDoc = Record<string, any>;

interface AuthContext {
  ownerId: string;
  actorId: string;
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeCategoryRef = (
  category: unknown
): { _id: string; name: string } | null => {
  if (!category) {
    return null;
  }

  if (typeof category === "string") {
    return { _id: category, name: category };
  }

  if (typeof category === "object") {
    const cat: PlainDoc = category as PlainDoc;
    const idValue = cat._id || cat.id;
    if (!idValue) {
      return null;
    }
    const id = typeof idValue === "string" ? idValue : String(idValue);
    const name = typeof cat.name === "string" && cat.name.trim() ? cat.name : id;
    return { _id: id, name };
  }

  return null;
};

const resolveOwnerId = async (userId: string): Promise<string> => {
  const admin = (await User.findById(userId).lean()) as PlainDoc | null;
  if (admin) {
    const role = typeof admin.role === "string" ? admin.role : "";
    if (role === "admin") {
      return String(admin._id);
    }
    if (role === "employee" && admin.adminId) {
      return String(admin.adminId);
    }
  }

  const employee = (await Employee.findById(userId).lean()) as PlainDoc | null;
  if (employee) {
    const role = typeof employee.role === "string" ? employee.role : "";
    if (role === "admin") {
      return String(employee._id);
    }
    if (role === "employee" && employee.adminId) {
      return String(employee.adminId);
    }
  }

  throw new HttpError(401, "Unauthorized");
};

const getAuthContext = async (req: Request): Promise<AuthContext> => {
  const header = req.headers["authorization"];
  if (!header) {
    throw new HttpError(401, "Unauthorized");
  }

  const rawToken = Array.isArray(header) ? header[0] : header;
  const token = rawToken.startsWith("Bearer ") ? rawToken.split(" ")[1] : rawToken;
  if (!token) {
    throw new HttpError(401, "Unauthorized");
  }

  let decoded: unknown;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    throw new HttpError(401, "Invalid token");
  }

  if (typeof decoded !== "object" || decoded === null || !("userId" in decoded)) {
    throw new HttpError(401, "Invalid token");
  }

  const actorId = String((decoded as PlainDoc).userId);
  const ownerId = await resolveOwnerId(actorId);

  return { ownerId, actorId };
};

const loadStocksForOwner = async (ownerId: string): Promise<PlainDoc[]> => {
  const stocks = await Stock.find({ userId: ownerId })
    .populate({
      path: "productId",
      populate: { path: "category", select: "name" },
    })
    .populate("supplierId", "companyName")
    .populate("location", "name code")
    .lean();

  return (stocks as PlainDoc[]) ?? [];
};

const handleControllerError = (res: Response, error: unknown, message: string): void => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ success: false, message: error.message });
    return;
  }

  console.error(message, error);
  res.status(500).json({ success: false, message });
};

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId } = await getAuthContext(req);
    const stocks = await loadStocksForOwner(ownerId);

    res.status(200).json({ success: true, data: stocks });
  } catch (error) {
    handleControllerError(res, error, "Server error while fetching products");
  }
};

export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId } = await getAuthContext(req);
    const products = await Product.find({ userId: ownerId })
      .populate("category", "name")
      .populate("supplierId", "companyName")
      .lean();

    res.status(200).json({ success: true, data: (products as PlainDoc[]) ?? [] });
  } catch (error) {
    handleControllerError(res, error, "Server error while fetching product list");
  }
};

export const getProductsByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId } = await getAuthContext(req);
    const { category } = req.params;

    const stocks = await loadStocksForOwner(ownerId);
    const normalizedParam = category.trim().toLowerCase();

    const filtered = stocks.filter((item) => {
      const productCategory = normalizeCategoryRef(item?.productId?.category);
      if (!productCategory) {
        return false;
      }

      return (
        productCategory._id === category ||
        productCategory.name.toLowerCase() === normalizedParam
      );
    });

    res.status(200).json({ success: true, data: filtered });
  } catch (error) {
    handleControllerError(res, error, "Server error while filtering products by category");
  }
};

export const getProductByBarcode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId } = await getAuthContext(req);
    const { barcode } = req.params;
    const sanitizedBarcode = barcode.trim();

    const stock = (await Stock.findOne({ barcode: sanitizedBarcode, userId: ownerId })
      .populate({
        path: "productId",
        populate: { path: "category", select: "name" },
      })
      .lean()) as PlainDoc | null;

    if (stock?.productId) {
      const product = stock.productId as PlainDoc;
      const category = normalizeCategoryRef(product.category);

      res.status(200).json({
        success: true,
        message: "พบสินค้า",
        _id: product._id ? String(product._id) : sanitizedBarcode,
        name: product.name,
        description: product.description,
        barcode: product.barcode ?? sanitizedBarcode,
        imageUrl: product.imageUrl ?? "",
        price: stock.salePrice ?? product.price ?? 0,
        category,
        stock: {
          stockId: stock._id ? String(stock._id) : undefined,
          totalQuantity: stock.totalQuantity ?? 0,
          salePrice: stock.salePrice ?? 0,
          costPrice: stock.costPrice ?? 0,
          status: stock.status,
        },
      });
      return;
    }

    const product = (await Product.findOne({ barcode: sanitizedBarcode, userId: ownerId })
      .populate("category", "name")
      .lean()) as PlainDoc | null;

    if (product) {
      const category = normalizeCategoryRef(product.category);
      res.status(200).json({
        success: true,
        message: "พบสินค้า",
        _id: product._id ? String(product._id) : sanitizedBarcode,
        name: product.name,
        description: product.description,
        barcode: product.barcode,
        imageUrl: product.imageUrl ?? "",
        price: product.price ?? 0,
        category,
      });
      return;
    }

    res.status(404).json({ success: false, message: "ไม่พบสินค้าในระบบ" });
  } catch (error) {
    handleControllerError(res, error, "Server error while fetching product by barcode");
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId } = await getAuthContext(req);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "รหัสสินค้าไม่ถูกต้อง" });
      return;
    }

    const payload: PlainDoc = {};
    const allowedFields = [
      "name",
      "description",
      "category",
      "barcode",
      "productCode",
      "imageUrl",
      "public_id",
      "supplierId",
      "isSelfPurchased",
      "isActive",
    ];

    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        payload[field] = req.body[field];
      }
    });

    if (payload.category && typeof payload.category === "object") {
      const categoryRef = normalizeCategoryRef(payload.category);
      payload.category = categoryRef?._id;
    }

    if (payload.supplierId && typeof payload.supplierId === "object") {
      const supplier = payload.supplierId as PlainDoc;
      const supplierId = supplier._id || supplier.id;
      if (supplierId) {
        payload.supplierId = supplierId;
      }
    }

    const product = (await Product.findOneAndUpdate(
      { _id: id, userId: ownerId },
      { $set: payload },
      { new: true }
    )
      .populate("category", "name")
      .populate("supplierId", "companyName")
      .lean()) as PlainDoc | null;

    if (!product) {
      res.status(404).json({ success: false, message: "ไม่พบสินค้า" });
      return;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "isActive")) {
      await Stock.updateMany(
        { productId: id, userId: ownerId },
        { $set: { isActive: payload.isActive } }
      );
    }

    res.status(200).json({
      success: true,
      message: "อัปเดตข้อมูลสินค้าสำเร็จ",
      data: product,
    });
  } catch (error) {
    handleControllerError(res, error, "Server error while updating product");
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId } = await getAuthContext(req);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "รหัสสินค้าไม่ถูกต้อง" });
      return;
    }

    const product = (await Product.findOneAndDelete({ _id: id, userId: ownerId }).lean()) as
      | PlainDoc
      | null;
    if (!product) {
      res.status(404).json({ success: false, message: "ไม่พบสินค้า" });
      return;
    }

    await Promise.all([
      Stock.deleteMany({ productId: id, userId: ownerId }),
      StockLot.deleteMany({ productId: id, userId: ownerId }),
    ]);

    res.status(200).json({ success: true, message: "ลบสินค้าสำเร็จ" });
  } catch (error) {
    handleControllerError(res, error, "Server error while deleting product");
  }
};

export const getBatchesByProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId } = await getAuthContext(req);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "รหัสสินค้าไม่ถูกต้อง" });
      return;
    }

    const batches = (await StockLot.find({ productId: id, userId: ownerId })
      .populate("supplierId", "companyName")
      .populate("location", "name code")
      .sort({ createdAt: -1 })
      .lean()) as PlainDoc[];

    res.status(200).json({ success: true, data: batches ?? [] });
  } catch (error) {
    handleControllerError(res, error, "Server error while fetching product batches");
  }
};

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId } = await getAuthContext(req);
    const products = (await Product.find({ userId: ownerId })
      .populate("category", "name")
      .lean()) as PlainDoc[];

    const categories = new Map<string, { _id: string; name: string }>();

    products.forEach((product) => {
      const category = normalizeCategoryRef(product.category);
      if (category) {
        categories.set(category._id, category);
      }
    });

    if (categories.size === 0) {
      const fallback = (await Category.find({ adminId: ownerId }).sort({ name: 1 }).lean()) as PlainDoc[];
      fallback.forEach((item) => {
        categories.set(String(item._id), { _id: String(item._id), name: item.name });
      });
    }

    res.status(200).json({ success: true, data: Array.from(categories.values()) });
  } catch (error) {
    handleControllerError(res, error, "Server error while fetching categories");
  }
};

export const fetchCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId } = await getAuthContext(req);

    const [categories, productRefs] = await Promise.all([
      Category.find({ adminId: ownerId }).sort({ name: 1 }).lean(),
      Product.find({ userId: ownerId }, "category").lean(),
    ]);

    const usageCount = new Map<string, number>();
    (productRefs as PlainDoc[]).forEach((product) => {
      const category = normalizeCategoryRef(product.category);
      if (category) {
        usageCount.set(category._id, (usageCount.get(category._id) ?? 0) + 1);
      }
    });

    const data = (categories as PlainDoc[]).map((category) => ({
      _id: String(category._id),
      name: category.name,
      description: category.description ?? "",
      totalProducts: usageCount.get(String(category._id)) ?? 0,
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    handleControllerError(res, error, "Server error while fetching category list");
  }
};

export const addCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId } = await getAuthContext(req);
    const { name, description } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ success: false, message: "กรุณาระบุชื่อหมวดหมู่" });
      return;
    }

    const normalizedName = name.trim();
    const existing = await Category.findOne({
      adminId: ownerId,
      name: { $regex: `^${escapeRegex(normalizedName)}$`, $options: "i" },
    }).lean();

    if (existing) {
      res.status(409).json({ success: false, message: "มีหมวดหมู่นี้อยู่แล้ว" });
      return;
    }

    const category = await Category.create({
      name: normalizedName,
      description,
      adminId: new mongoose.Types.ObjectId(ownerId),
    });

    res.status(201).json({
      success: true,
      message: "สร้างหมวดหมู่สำเร็จ",
      data: {
        _id: String(category._id),
        name: category.name,
        description: category.description ?? "",
      },
    });
  } catch (error) {
    handleControllerError(res, error, "Server error while creating category");
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId } = await getAuthContext(req);
    const { id } = req.params;
    const { name, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "รหัสหมวดหมู่ไม่ถูกต้อง" });
      return;
    }

    const updates: PlainDoc = {};

    if (typeof name === "string" && name.trim()) {
      const normalizedName = name.trim();
      const duplicate = await Category.findOne({
        _id: { $ne: id },
        adminId: ownerId,
        name: { $regex: `^${escapeRegex(normalizedName)}$`, $options: "i" },
      }).lean();

      if (duplicate) {
        res.status(409).json({ success: false, message: "มีชื่อหมวดหมู่ซ้ำ" });
        return;
      }

      updates.name = normalizedName;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "description")) {
      updates.description = description;
    }

    const category = (await Category.findOneAndUpdate(
      { _id: id, adminId: ownerId },
      { $set: updates },
      { new: true }
    ).lean()) as PlainDoc | null;

    if (!category) {
      res.status(404).json({ success: false, message: "ไม่พบหมวดหมู่" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "อัปเดตหมวดหมู่สำเร็จ",
      data: {
        _id: String(category._id),
        name: category.name,
        description: category.description ?? "",
      },
    });
  } catch (error) {
    handleControllerError(res, error, "Server error while updating category");
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId } = await getAuthContext(req);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "รหัสหมวดหมู่ไม่ถูกต้อง" });
      return;
    }

    const usage = await Product.countDocuments({ userId: ownerId, category: id });
    if (usage > 0) {
      res.status(409).json({ success: false, message: "ไม่สามารถลบหมวดหมู่ที่ยังมีสินค้าใช้งานอยู่" });
      return;
    }

    const result = await Category.findOneAndDelete({ _id: id, adminId: ownerId }).lean();
    if (!result) {
      res.status(404).json({ success: false, message: "ไม่พบหมวดหมู่" });
      return;
    }

    res.status(200).json({ success: true, message: "ลบหมวดหมู่สำเร็จ" });
  } catch (error) {
    handleControllerError(res, error, "Server error while deleting category");
  }
};
