import express from 'express';
import { getStocks, getStockByBarcode, updateStockByBarcode, updateQuantityByBarcode, deleteStock } from '../controllers/stockController';
const router = express.Router();

router.get('/',getStocks);
router.get('/:barcode',getStockByBarcode)
router.put('/:barcode', updateQuantityByBarcode)
router.delete('/:id', deleteStock);

export default router;
