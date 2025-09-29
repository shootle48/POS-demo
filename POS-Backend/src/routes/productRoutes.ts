import express from "express";
import {getProducts,
    getAllProducts,
    getProductByBarcode,
    getProductsByCategory,
    addCategory,
    fetchCategories,
    deleteProduct
} from "../controllers/productController";
const router = express.Router();
router.get('/', getAllProducts);
router.get('/get',getProducts)
router.get('/:barcode', getProductByBarcode);
router.get('/category/:category', getProductsByCategory);
router.post('/category/create', addCategory);
router.get('/categories/all', fetchCategories);
router.delete('/:id', deleteProduct);
export default router;