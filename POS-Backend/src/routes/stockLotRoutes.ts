import express from "express";
import {
    getStockLots,
    getStockLotsByBarcode,
    updateExpiryDate,
    updateQCStatus,
    deactivateStockLot,
    filterStockLots,
} from "../controllers/stockLotController";

const router = express.Router();

router.get("/", getStockLots);
router.get("/barcode/:barcode", getStockLotsByBarcode);
router.get("/filter", filterStockLots);
router.patch("/:lotId/expiry", updateExpiryDate);
router.put("/:lotId/qc", updateQCStatus);
router.patch("/:lotId/deactivate", deactivateStockLot);

export default router;
