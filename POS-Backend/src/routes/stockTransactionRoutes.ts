import express from "express";
import {
    createTransaction,
    getAllTransactions,
    getTransactionsByProduct,
    getTransactionsByStock,
} from "../controllers/stockTransactionController";

const router = express.Router();
router.post("/create", createTransaction);
router.get("/transactions", getAllTransactions);
router.get("/product/:productId", getTransactionsByProduct);
router.get("/stock/:stockId", getTransactionsByStock);

export default router;
