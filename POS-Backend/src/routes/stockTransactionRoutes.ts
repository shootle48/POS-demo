import express from "express";
import {
    createTransaction,
    getAllTransactions,
    getTransactionsByProduct,
    getTransactionsByStock,
} from "../controllers/stockTransactionController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();
router.post("/create", authMiddleware, createTransaction);
router.get("/transactions", authMiddleware, getAllTransactions);
router.get("/product/:productId", authMiddleware, getTransactionsByProduct);
router.get("/stock/:stockId", authMiddleware, getTransactionsByStock);

export default router;
