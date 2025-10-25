import { Router } from "express";
import {
  getProductByBarcode,
  getProducts,
  getAllProducts,
  getProductsByCategory,
  updateProduct,
  deleteProduct,
  getBatchesByProduct,
} from "../controllers/productController";

const router = Router();

// 📦 Product Routes
router.get("/Product", getProducts);
router.get("/AllProduct", getAllProducts); // ✅ ทุก product
router.get("/category/:category", getProductsByCategory);
router.get("/:id/batches", getBatchesByProduct);
router.get("/barcode/:barcode", getProductByBarcode);
router.put("/:id", updateProduct);
router.patch("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;
