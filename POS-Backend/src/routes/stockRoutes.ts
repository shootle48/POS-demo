import express from "express";
import {
    getStocks,
    getStockByBarcode,
    updateStock,
    restockProductByBarcode,
    returnProductByBarcode,
    adjustStockByBarcode,
    deleteStockByBarcode,
} from "../controllers/stockController";

const router = express.Router();

router.get("/", getStocks);
router.get("/:barcode", getStockByBarcode);
router.patch("/:barcode", updateStock);

// Actions
router.post("/:barcode/restock", restockProductByBarcode);
router.post("/:barcode/return", returnProductByBarcode);
router.post("/:barcode/adjust", adjustStockByBarcode);

router.delete("/:barcode", deleteStockByBarcode);

export default router;

