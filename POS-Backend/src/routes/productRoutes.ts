import { Router } from "express";
import {
    getProductByBarcode,
    getProducts,
    getAllProducts,
    getProductsByCategory,
    updateProduct,
    deleteProduct,
    getBatchesByProduct
} from "../controllers/productController";

const router = Router();

// 📦 Product Routes
router.get("/Product", getProducts);
router.get("/get", getProducts); // legacy alias used by older clients
router.get("/AllProduct", getAllProducts);
router.get("/category/:category", getProductsByCategory);
router.get("/barcode/:barcode", getProductByBarcode);
router.get("/:id/batches", getBatchesByProduct);
router.put("/:id", updateProduct);
router.patch("/:id", updateProduct);
router.delete("/:id", deleteProduct);



export default router;
