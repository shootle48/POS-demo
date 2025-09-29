import { Request, Response, NextFunction } from "express";
import Product from "../models/Product";
import jwt from "jsonwebtoken"; // นำเข้า jwt สำหรับการตรวจสอบ token
import User from "../models/User"; // นำเข้า model User
import Employee from "../models/Employee"; // แก้ path ตามโฟลเดอร์ของคุณ
import Category from "../models/Category";

const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET as string);
  } catch (error) {
    throw new Error("Invalid token");
  }
};
// ฟังก์ชันค้นหาสินค้าจาก barcode
export const getProductByBarcode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const barcode = req.params.barcode; // ดึง barcode จาก URL params

    // ค้นหาสินค้าจาก barcode
    const product = await Product.findOne({ barcode });

    if (!product) {
      // หากไม่พบสินค้า, ส่ง status 404
      res.status(404).json({ message: "Product not found" });
      return;
    }

    // หากพบสินค้า, ส่ง status 200 พร้อมข้อมูลสินค้า
    res.status(200).json(product);
  } catch (error) {
    // หากเกิดข้อผิดพลาดภายใน, ส่ง status 500
    res.status(500).json({ message: "Server error", error });
  }
};

export const getProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Unauthorized, no token provided",
    });
    return;
  }

  try {
    const decoded = verifyToken(token);

    if (typeof decoded !== "string" && "userId" in decoded) {
      const userId = decoded.userId;

      // ลองหาใน User ก่อน ถ้าไม่เจอค่อยหาใน Employee
      let user = await User.findById(userId);
      if (!user) {
        user = await Employee.findById(userId);
      }

      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      let ownerId: string;

      if (user.role === "admin" || user.role === "manager") {
        ownerId = user._id.toString();
      } else if (user.role === "employee") {
        if (!user.adminId) {
          res.status(400).json({
            success: false,
            message: "Employee does not have an admin assigned",
          });
          return;
        }
        ownerId = user.adminId.toString();
      } else {
        res.status(403).json({
          success: false,
          message: "Invalid user role",
        });
        return;
      }

      const products = await Product.find({ userId: ownerId });

      res.status(200).json({
        success: true,
        data: products,
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(403).json({
      success: false,
      message: "Forbidden, invalid token",
    });
  }
};

export const getAllProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const products = await Product.find(); // ค้นหาสินค้าทั้งหมดจาก MongoDB

    // ส่งข้อมูลสินค้าทั้งหมดกลับไปในรูปแบบ JSON
    res.json(products);
  } catch (error) {
    // หากเกิดข้อผิดพลาดภายใน, ส่ง status 500
    res.status(500).json({ message: "Server error", error });
  }
};

export const getProductsByCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  const token = req.header("Authorization")?.split(" ")[1]; // ดึง token จาก header

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Unauthorized, no token provided",
    });
    return;
  }

  try {
    const decoded = verifyToken(token);

    if (typeof decoded !== "string" && "userId" in decoded) {
      const userId = decoded.userId;
      const category = req.params.category;

      // หา user (จาก User หรือ Employee)
      let user = await User.findById(userId);
      if (!user) {
        user = await Employee.findById(userId);
      }

      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      // หา ownerId ตาม role
      let ownerId: string;

      if (user.role === "admin" || user.role === "manager") {
        ownerId = user._id.toString();
      } else if (user.role === "employee") {
        if (!user.adminId) {
          res.status(400).json({
            success: false,
            message: "Employee does not have an admin assigned",
          });
          return;
        }
        ownerId = user.adminId.toString();
      } else {
        res.status(403).json({
          success: false,
          message: "Invalid user role",
        });
        return;
      }

      // ดึงสินค้าตาม category และ ownerId
      const products = await Product.find({ userId: ownerId, category });

      if (products.length === 0) {
        res.status(404).json({
          success: false,
          message: "No products found for this category",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: products,
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(403).json({
      success: false,
      message: "Forbidden, invalid token",
    });
  }
};

export const getCategories = async (
  req: Request,
  res: Response
): Promise<void> => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Unauthorized, no token provided",
    });
    return;
  }

  try {
    const decoded = verifyToken(token);

    if (typeof decoded !== "string" && "userId" in decoded) {
      const userId = decoded.userId;

      let user = await User.findById(userId);
      if (!user) {
        user = await Employee.findById(userId);
      }

      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      // หาค่า ownerId ตาม role
      let ownerId: string;

      if (user.role === "admin" || user.role === "manager") {
        ownerId = user._id.toString();
      } else if (user.role === "employee") {
        if (!user.adminId) {
          res.status(400).json({
            success: false,
            message: "Employee does not have an admin assigned",
          });
          return;
        }
        ownerId = user.adminId.toString();
      } else {
        res.status(403).json({
          success: false,
          message: "Invalid user role",
        });
        return;
      }

      // ใช้ distinct ดึง category ทั้งหมดแบบไม่ซ้ำ
      const categories = await Product.distinct("category", {
        userId: ownerId,
      });

      res.status(200).json({
        success: true,
        data: categories,
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(403).json({
      success: false,
      message: "Forbidden, invalid token",
    });
  }
};

export const fetchCategories = async (
  req: Request,
  res: Response
): Promise<void> => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    res
      .status(401)
      .json({ success: false, message: "Unauthorized: No token provided" });
    return;
  }

  try {
    const decoded = verifyToken(token);

    if (typeof decoded !== "string" && "userId" in decoded) {
      const userId = decoded.userId;

      let user = await User.findById(userId);
      if (!user) {
        user = await Employee.findById(userId);
      }

      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      const ownerId = user.role === "employee" ? user.adminId : user._id;
      const categories = await Category.find({ adminId: ownerId });

      res.status(200).json({ success: true, data: categories });
    } else {
      res.status(401).json({ success: false, message: "Invalid token" });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch categories" });
  }
};

export const addCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Unauthorized, no token provided",
    });
    return;
  }

  try {
    const decoded = verifyToken(token);

    if (typeof decoded !== "string" && "userId" in decoded) {
      const userId = decoded.userId;

      let user = await User.findById(userId);
      if (!user) {
        user = await Employee.findById(userId);
      }

      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      const { name, description } = req.body;

      if (!name || name.trim() === "") {
        res.status(400).json({
          success: false,
          message: "Category name is required",
        });
        return;
      }

      // ตรวจสอบว่าหมวดหมู่นี้มีอยู่แล้วหรือไม่
      const existingCategory = await Category.findOne({ name });
      if (existingCategory) {
        res.status(400).json({
          success: false,
          message: "Category already exists",
        });
        return;
      }

      const newCategory = new Category({
        name,
        description,
        adminId: decoded.userId, // ✅ เปลี่ยนจาก managerId เป็น adminId
      });

      await newCategory.save();

      res.status(201).json({
        success: true,
        message: "Category added successfully",
        data: newCategory,
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error while adding category",
    });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Product.findByIdAndDelete(id);
    res.json({ message: "ลบสินค้าจากสต็อกเรียบร้อย" });
  } catch (error) {
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบสินค้า" });
  }
};
