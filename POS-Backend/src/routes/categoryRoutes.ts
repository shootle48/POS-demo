import { Router } from "express";
import {
  getCategories,
  fetchCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/productController";

const router = Router();

// 🏷️ Category Routes
router.get("/", getCategories); // ดึงจาก Product.distinct()
router.get("/all", fetchCategories); // ดึงจาก Category collection
router.post("/create", addCategory);
router.put("/:id", updateCategory);
router.patch("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;
