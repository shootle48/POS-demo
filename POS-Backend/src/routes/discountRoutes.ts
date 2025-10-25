import express from "express";
import {
    createDiscount,
    getDiscounts,
    deleteDiscount,
    validateDiscount,
    updateDiscount,
} from "../controllers/discountController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createDiscount);
router.get("/", getDiscounts);
router.delete("/:id", deleteDiscount);
router.post("/validate", validateDiscount);
router.patch("/:id", updateDiscount);

export default router;
