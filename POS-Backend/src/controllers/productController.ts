import { Request, Response } from "express";
import mongoose from "mongoose";

import Product from "../models/Product";
import Stock from "../models/Stock";
import StockLot from "../models/StockLot";
import Category from "../models/Category";
import User from "../models/User";
import Employee from "../models/Employee";
import { verifyToken } from "../utils/auth";

type ObjectId = mongoose.Types.ObjectId;

interface AuthContext {
  actorId: string;
  ownerId: string;
  ownerObjectId: ObjectId;
}

class RequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const buildOwnerMatcher = (ownerId: string, ownerObjectId: ObjectId) => ({
  $in: [ownerObjectId, ownerId],
});

const extractToken = (req: Request): string => {
  const raw = req.headers["authorization"]; // Bearer <token>
  if (!raw) {
    throw new RequestError(401, "Unauthorized, no token provided");
  }

  const token = Array.isArray(raw) ? raw[0] : raw;
  const parts = token.split(" ");
  const value = parts.length === 2 ? parts[1] : parts[0];

  if (!value) {
    throw new RequestError(401, "Unauthorized, invalid token header");
  }

  return value.trim();
};

const resolveOwner = async (actorId: string): Promise<AuthContext> => {
  const user = await User.findById(actorId)
    .select("_id")
    .lean<{ _id: ObjectId } | null>();
  if (user) {
    const ownerId = user._id.toString();
    return { actorId, ownerId, ownerObjectId: new mongoose.Types.ObjectId(ownerId) };
  }

  const employee = await Employee.findById(actorId)
    .select("adminId")
    .lean<{ adminId: ObjectId } | null>();
  if (employee?.adminId) {
    const adminId = employee.adminId.toString();
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      throw new RequestError(400, "Invalid admin reference for employee");
    }
    return {
      actorId,
      ownerId: adminId,
      ownerObjectId: new mongoose.Types.ObjectId(adminId),
    };
  }

  throw new RequestError(404, "User not found");
};

const getAuthContext = async (req: Request): Promise<AuthContext> => {
  const token = extractToken(req);
  const decoded = verifyToken(token) as Record<string, unknown> | string;

  if (typeof decoded === "string" || !decoded || typeof decoded !== "object") {
    throw new RequestError(401, "Invalid token");
  }

  const userId = decoded["userId"];
  if (typeof userId !== "string") {
    throw new RequestError(401, "Invalid token payload");
  }

  return resolveOwner(userId);
};

const handleError = (res: Response, error: unknown, fallback: string) => {
  if (error instanceof RequestError) {
    res.status(error.status).json({ success: false, message: error.message });
    return;
  }

  console.error(fallback, error);
  res.status(500).json({ success: false, message: fallback });
};

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId, ownerObjectId } = await getAuthContext(req);
    const stocks = await Stock.find({ userId: buildOwnerMatcher(ownerId, ownerObjectId) })
      .populate({
        path: "productId",
        populate: { path: "category", select: "name" },
      })
      .populate("supplierId", "companyName")
      .populate("location", "name code")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: stocks });
  } catch (error) {
    handleError(res, error, "Server error while fetching products");
  }
};

export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId, ownerObjectId } = await getAuthContext(req);
    const products = await Product.find({ userId: buildOwnerMatcher(ownerId, ownerObjectId) })
      .populate("category", "name")
      .populate("supplierId", "companyName")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: products });
  } catch (error) {
    handleError(res, error, "Server error while fetching all products");
  }
};

export const getProductByBarcode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId, ownerObjectId } = await getAuthContext(req);
    const { barcode } = req.params;

    if (!barcode) {
      throw new RequestError(400, "Barcode is required");
    }

    const stock = await Stock.findOne({
      barcode,
      userId: buildOwnerMatcher(ownerId, ownerObjectId),
    })
      .populate({
        path: "productId",
        populate: { path: "category", select: "name" },
      })
      .populate("supplierId", "companyName")
      .populate("location", "name code")
      .lean();

    if (stock) {
      res.status(200).json({ success: true, data: stock });
      return;
    }

    const product = await Product.findOne({
      barcode,
      userId: buildOwnerMatcher(ownerId, ownerObjectId),
    })
      .populate("category", "name")
      .populate("supplierId", "companyName")
      .lean();

    if (product) {
      res.status(200).json({ success: true, data: product });
      return;
    }

    res.status(404).json({ success: false, message: "Product not found" });
  } catch (error) {
    handleError(res, error, "Server error while fetching product by barcode");
  }
};

export const getProductsByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId, ownerObjectId } = await getAuthContext(req);
    const { category } = req.params;

    if (!category) {
      throw new RequestError(400, "Category is required");
    }

    const categoryIds: ObjectId[] = [];
    if (mongoose.Types.ObjectId.isValid(category)) {
      categoryIds.push(new mongoose.Types.ObjectId(category));
    }

    const categoryDoc = await Category.findOne({
      adminId: buildOwnerMatcher(ownerId, ownerObjectId),
      name: category,
    })
      .select("_id")
      .lean<{ _id: ObjectId } | null>();

    if (categoryDoc?._id) {
      categoryIds.push(
        categoryDoc._id instanceof mongoose.Types.ObjectId
          ? categoryDoc._id
          : new mongoose.Types.ObjectId(categoryDoc._id)
      );
    }

    if (categoryIds.length === 0) {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    const stocks = await Stock.find({
      userId: buildOwnerMatcher(ownerId, ownerObjectId),
    })
      .populate({
        path: "productId",
        match: { category: { $in: categoryIds } },
        populate: { path: "category", select: "name" },
      })
      .populate("supplierId", "companyName")
      .populate("location", "name code")
      .lean();

    const filtered = stocks.filter((item) => Boolean(item.productId));
    res.status(200).json({ success: true, data: filtered });
  } catch (error) {
    handleError(res, error, "Server error while filtering products by category");
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId, ownerObjectId } = await getAuthContext(req);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new RequestError(400, "Invalid product id");
    }

    const payload = { ...req.body };

    if (payload.category && typeof payload.category === "object" && "_id" in payload.category) {
      payload.category = payload.category._id;
    }

    const updated = await Product.findOneAndUpdate(
      {
        _id: id,
        userId: buildOwnerMatcher(ownerId, ownerObjectId),
      },
      { $set: payload },
      { new: true }
    )
      .populate("category", "name")
      .populate("supplierId", "companyName")
      .lean();

    if (!updated) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    res.status(200).json({ success: true, message: "Product updated successfully", data: updated });
  } catch (error) {
    handleError(res, error, "Server error while updating product");
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId, ownerObjectId } = await getAuthContext(req);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new RequestError(400, "Invalid product id");
    }

    const product = await Product.findOneAndDelete({
      _id: id,
      userId: buildOwnerMatcher(ownerId, ownerObjectId),
    })
      .lean<{ _id: ObjectId } | null>();

    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    await Stock.deleteMany({
      productId: product._id,
      userId: buildOwnerMatcher(ownerId, ownerObjectId),
    });

    await StockLot.deleteMany({
      productId: product._id,
      userId: buildOwnerMatcher(ownerId, ownerObjectId),
    });

    res.status(200).json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    handleError(res, error, "Server error while deleting product");
  }
};

export const getBatchesByProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId, ownerObjectId } = await getAuthContext(req);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new RequestError(400, "Invalid product id");
    }

    const batches = await StockLot.find({
      productId: new mongoose.Types.ObjectId(id),
      userId: buildOwnerMatcher(ownerId, ownerObjectId),
    })
      .populate("stockId", "barcode location")
      .populate("supplierId", "companyName")
      .populate("location", "name code")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: batches });
  } catch (error) {
    handleError(res, error, "Server error while fetching product batches");
  }
};

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId, ownerObjectId } = await getAuthContext(req);
    const categoryIds = await Product.find({
      userId: buildOwnerMatcher(ownerId, ownerObjectId),
    })
      .distinct("category");

    if (!categoryIds.length) {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    const categories = await Category.find({
      _id: { $in: categoryIds },
      adminId: buildOwnerMatcher(ownerId, ownerObjectId),
    })
      .sort({ name: 1 })
      .lean();

    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    handleError(res, error, "Server error while fetching categories");
  }
};

export const fetchCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId, ownerObjectId } = await getAuthContext(req);
    const categories = await Category.find({
      adminId: buildOwnerMatcher(ownerId, ownerObjectId),
    })
      .sort({ name: 1 })
      .lean();

    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    handleError(res, error, "Server error while retrieving categories");
  }
};

export const addCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId, ownerObjectId } = await getAuthContext(req);
    const { name, description } = req.body;

    if (!name || typeof name !== "string") {
      throw new RequestError(400, "Category name is required");
    }

    const existing = await Category.findOne({
      name: name.trim(),
      adminId: buildOwnerMatcher(ownerId, ownerObjectId),
    }).lean();

    if (existing) {
      throw new RequestError(409, "Category already exists");
    }

    const category = await Category.create({
      name: name.trim(),
      description,
      adminId: ownerObjectId,
    });

    res.status(201).json({ success: true, message: "Category created successfully", data: category });
  } catch (error) {
    handleError(res, error, "Server error while creating category");
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId, ownerObjectId } = await getAuthContext(req);
    const { id } = req.params;
    const { name, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new RequestError(400, "Invalid category id");
    }

    const updated = await Category.findOneAndUpdate(
      {
        _id: id,
        adminId: buildOwnerMatcher(ownerId, ownerObjectId),
      },
      {
        ...(name ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description } : {}),
      },
      { new: true }
    ).lean();

    if (!updated) {
      res.status(404).json({ success: false, message: "Category not found" });
      return;
    }

    res.status(200).json({ success: true, message: "Category updated successfully", data: updated });
  } catch (error) {
    handleError(res, error, "Server error while updating category");
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ownerId, ownerObjectId } = await getAuthContext(req);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new RequestError(400, "Invalid category id");
    }

    const inUse = await Product.countDocuments({
      category: new mongoose.Types.ObjectId(id),
      userId: buildOwnerMatcher(ownerId, ownerObjectId),
    });

    if (inUse > 0) {
      throw new RequestError(409, "Cannot delete category in use by products");
    }

    const deleted = await Category.findOneAndDelete({
      _id: id,
      adminId: buildOwnerMatcher(ownerId, ownerObjectId),
    }).lean();

    if (!deleted) {
      res.status(404).json({ success: false, message: "Category not found" });
      return;
    }

    res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    handleError(res, error, "Server error while deleting category");
  }
};

